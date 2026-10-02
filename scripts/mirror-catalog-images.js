#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Catalog image mirror.
//
// Storefront cards are hotlinked to third-party CDNs (StockX, GOAT,
// Zumiez/Scene7, Bing thumbnails). Those hosts rate-limit, rotate URLs,
// block opaque responses and sometimes 404 a perfectly live product, so a
// card can silently break for a real shopper.
//
// This script downloads every remote catalogue image referenced by the
// storefront into products/catalog/, records a manifest, and can rewrite
// the source files to point at the local copies.
//
// Usage:
//   node scripts/mirror-catalog-images.js --dry-run     # report only
//   node scripts/mirror-catalog-images.js               # download
//   node scripts/mirror-catalog-images.js --rewrite     # point sources at local files
//
// Flags:
//   --dry-run        list what would be fetched, no disk writes
//   --rewrite        replace remote URLs with local paths in the source files
//   --force          re-download files that already exist
//   --only <host>    restrict to one host (repeatable)
//   --concurrency N  parallel downloads (default 6)
//   --files "a,b"    override the scanned file list (comma separated)
//   --urls <file>    also mirror every http(s) image URL found in <file>
//                     (use for catalogue images that live in Firestore,
//                     not in the repo — pass a JSON/text dump of the docs)
//   --firestore      also pull image URLs from the live Firestore catalogue
//                     (read-only, public API key) and mirror those too
//   --serve [port]   start a local upload server (default port 5180) that also
//                     serves the site, so admin image uploads land in
//                     products/catalog/ instead of a third-party CDN
//   --host <addr>    bind address for --serve (default 127.0.0.1)
//   --token <value>  shared secret required by POST /api/catalog-upload
//                     (default: CATALOG_UPLOAD_TOKEN, else a random per-run
//                     token injected into served HTML; printed on startup)
//   --commit         commit each image uploaded through --serve (only the
//                     image + its registry entry; nothing else in the tree)
//
// Re-source a dead image without hand-editing JSON:
//   node scripts/mirror-catalog-images.js --re-source \
//     --broken "https://dead.example/x.jpg" \
//     --replacement "https://live.example/x.jpg"   # or a local repo path
//   Optional: --name "Off-White AF1 cover"  --dry-run
//
// Alongside the manual it writes products/catalog/aliases.mjs, a remote->local
// map the storefront uses to render mirrored files for data coming from the
// database (see REMOTE_IMAGE_ALIASES in product-data.js).
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'products', 'catalog');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
// Hand-maintained remote->local fixes, merged over the generated aliases. Use it
// to re-source a dead URL onto a working local file (see the file's _README key).
const MANUAL_ALIASES = path.join(OUT_DIR, 'aliases.manual.json');
// Never treated as prune orphans: these are tooling artifacts, not catalogue art.
const PROTECTED_CATALOG_FILES = new Set(['manifest.json', 'aliases.manual.json']);
// Registry of images uploaded through `--serve`. It doubles as the prune
// reference for files no source page names (a product doc in Firestore points
// at them), and as the audit trail of what was uploaded locally.
const UPLOADS_REGISTRY = path.join(OUT_DIR, 'uploads.json');
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

// Name of the header carrying the upload token, and the endpoint path the
// --serve server exposes / injects into the HTML it serves.
const UPLOAD_TOKEN_HEADER = 'x-catalog-token';
const UPLOAD_ENDPOINT_PATH = '/api/catalog-upload';

// Live catalogue read. Firestore allows public reads with the project's web API
// key (the same read-only key the storefront ships with), so no admin auth is
// needed. Override for a different project via FIRESTORE_PROJECT.
const FIRESTORE_PROJECT = process.env.FIRESTORE_PROJECT || 'coalition-aec44';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw';
const FIRESTORE_PAGE_SIZE = 300;

// Storefront-facing files that render catalogue imagery.
const DEFAULT_FILES = [
    'product-data.js',
    'index.html',
    'shop-all.js',
    'app.js',
    'pricing.js',
    'product-page.js',
    'simple-product-page.js',
    'reviews-data.js',
    'admin.js',
    'admin/products.js',
    // One-off catalogue seeders under admin/ — they write hotlinked images into
    // the store, so they must not reintroduce a third-party dependency.
    'admin/seed-gucci-shirt.html',
    'admin/seed-jordan4-toro.html',
    'admin/seed-kobe6-3d.html',
    'admin/seed-prada-red.html',
    'admin/seed-prada-yellow.html',
    'admin/seed-prada.html',
];

// Some CDNs serve images from extension-less paths (Bing thumbnails, for
// instance), so a file-extension test alone misses them. Anything hosted on a
// known image CDN is treated as a candidate and validated after download.
// Hosts that only ever serve image bytes at this exact subdomain. Product-page
// hosts (stockx.com, www.goat.com) are deliberately absent: their URLs are
// benchmark/deeplink settings, not images.
const IMAGE_HOST_HINTS = [
    /^tse\d*\.mm\.bing\.net$/i,
    /^th\.bing\.com$/i,
    /^(i|img)\.imgur\.com$/i,
    /^image\.goat\.com$/i,
    /^images\.stockx\.com$/i,
    /^img\.ssensemedia\.com$/i,
    /^cdna\.lystit\.com$/i,
    /^scene7\.zumiez\.com$/i,
    /^res\.cloudinary\.com$/i,
    /^img\.kickwho\.info$/i,
    /^www\.kickwho\.info$/i,
];

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
const URL_RE = /https?:\/\/[^\s"'`)\\|<>]+/g;

// product-data.js never spells out its Imgur URLs — it builds them through
// `buildImgurImageUrl('id'[, 'ext'])`. A literal-URL scan is blind to those,
// which is how a large share of the catalogue stayed hotlinked. Expand each
// call into the URL it would produce so it becomes a normal candidate, and
// keep the raw call text so --rewrite can swap the whole expression.
const IMGUR_HELPER_RE = /buildImgurImageUrl\(\s*(['"])([A-Za-z0-9]+)\1\s*(?:,\s*(['"])([A-Za-z0-9]+)\3\s*)?\)/g;
const imgurHelperUrl = (id, ext) => `https://i.imgur.com/${id}.${ext || 'jpg'}`;

// Hosts a mirror candidate may legitimately come from, used only for reporting.
function hostOf(url) {
    try {
        return new URL(url).host.toLowerCase();
    } catch {
        return '';
    }
}

// Hosts we already own — their images are served straight from this repo, so
// there is nothing to mirror. Third-party art is copied into products/catalog/
// and referenced from there by relative path.
const OWN_HOSTS = ['backdoorco.xyz', 'backdoorco2.netlify.app', 'backdoorco.vercel.app', 'localhost', '127.0.0.1'];

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = has('--dry-run');
const REWRITE = has('--rewrite');
const PRUNE = has('--prune');
const FORCE = has('--force');
const SERVE = has('--serve');
const SERVE_PORT = (() => {
    const i = args.indexOf('--serve');
    const next = i !== -1 ? args[i + 1] : '';
    return next && /^\d+$/.test(next) ? Number(next) : 5180;
})();
const SERVE_HOST = valueOf('--host', '127.0.0.1');
const COMMIT = has('--commit');
// Shared secret that gates writes into products/catalog/. Without it any page
// running on localhost (a different port is a different origin, but it can
// still hit our endpoint) could drop files into the repo. Explicit --token or
// CATALOG_UPLOAD_TOKEN wins; otherwise we mint a fresh one each run.
const UPLOAD_TOKEN = valueOf('--token', '') || process.env.CATALOG_UPLOAD_TOKEN || crypto.randomBytes(16).toString('hex');
const FIRESTORE = has('--firestore');
const RESOURCE = has('--re-source');
const RESOURCE_BROKEN = valueOf('--broken', '');
const RESOURCE_REPLACEMENT = valueOf('--replacement', '');
const RESOURCE_NAME = valueOf('--name', '');
const ONLY = args.reduce((acc, arg, i) => {
    if (arg === '--only' && args[i + 1]) acc.push(args[i + 1].toLowerCase());
    return acc;
}, []);
const CONCURRENCY = Math.max(1, Number(valueOf('--concurrency', 6)) || 6);
const FILES = valueOf('--files', '') ? valueOf('--files', '').split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_FILES;
const URLS_FILE = valueOf('--urls', '');

// A remote asset is a candidate if it sits on a known image CDN or looks like an
// image file. Shared by the file scan and the --urls feed.
function isImageCandidate(parsed, url) {
    const looksLikeImage = IMAGE_EXT.test(parsed.pathname)
        || IMAGE_EXT.test(url)
        || IMAGE_HOST_HINTS.some((hint) => hint.test(parsed.host));
    if (!looksLikeImage) return false;
    // Skip obvious non-image assets even on image hosts (fonts, manifests...).
    if (/\.(js|css|json|html?|svg|woff2?|ttf|txt|xml|php|ico)(\?|$)/i.test(parsed.pathname)) return false;
    if (OWN_HOSTS.some((own) => parsed.host.toLowerCase().includes(own))) return false;
    if (ONLY.length && !ONLY.some((host) => parsed.host.toLowerCase().includes(host))) return false;
    return true;
}

function collectUrls() {
    const found = new Map();
    FILES.forEach((rel) => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) {
            console.warn(`  ! skipped (missing): ${rel}`);
            return;
        }
        const text = fs.readFileSync(abs, 'utf8');

        // Helper-built Imgur URLs first — they are real assets even though no
        // literal URL appears in the file.
        for (const match of text.matchAll(IMGUR_HELPER_RE)) {
            const url = imgurHelperUrl(match[2], match[4]);
            if (ONLY.length && !ONLY.some((host) => hostOf(url).includes(host))) continue;
            if (!found.has(url)) found.set(url, new Set());
            found.get(url).add(rel);
        }

        const matches = text.match(URL_RE) || [];
        matches.forEach((raw) => {
            // Strip trailing punctuation the regex may have swallowed.
            const url = raw.replace(/[),.;]+$/, '');
            let parsed;
            try {
                parsed = new URL(url);
            } catch {
                return;
            }
            // Template placeholders such as `https://i.imgur.com/${id}.${ext}` are code,
            // not literal assets.
            if (url.includes('${')) return;

            if (!isImageCandidate(parsed, url)) return;
            if (!found.has(url)) found.set(url, new Set());
            found.get(url).add(rel);
        });
    });

    // Extra URLs supplied out-of-band (e.g. catalogue docs in Firestore).
    if (URLS_FILE) {
        const abs = path.resolve(ROOT, URLS_FILE);
        if (!fs.existsSync(abs)) {
            console.warn(`  ! --urls file not found: ${URLS_FILE}`);
        } else {
            const text = fs.readFileSync(abs, 'utf8');
            (text.match(URL_RE) || []).forEach((raw) => {
                const url = raw.replace(/[),.;]+$/, '');
                let parsed;
                try {
                    parsed = new URL(url);
                } catch {
                    return;
                }
                if (!isImageCandidate(parsed, url)) return;
                if (!found.has(url)) found.set(url, new Set());
                found.get(url).add(URLS_FILE);
            });
        }
    }

    return found;
}

function extForContentType(type, url) {
    const base = String(type || '').split(';')[0].trim().toLowerCase();
    if (base === 'image/webp') return '.webp';
    if (base === 'image/jpeg') return '.jpg';
    if (base === 'image/png') return '.png';
    if (base === 'image/gif') return '.gif';
    if (base === 'image/avif') return '.avif';
    const fromPath = path.extname(new URL(url).pathname).toLowerCase();
    return IMAGE_EXT.test(fromPath) ? fromPath : '.jpg';
}

function baseNameFor(url) {
    const parsed = new URL(url);
    const raw = decodeURIComponent(path.basename(parsed.pathname)).replace(IMAGE_EXT, '');
    const cleaned = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70);
    const host = parsed.host.replace(/^(www|images|image)\./, '').replace(/[^a-z0-9]+/g, '-');
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 6);
    return `${host ? `${host}-` : ''}${cleaned || 'image'}-${hash}`;
}

function looksLikeImageBuffer(buffer, ext) {
    if (!buffer || buffer.length < 512) return false;
    const head = buffer.subarray(0, 12);
    if (ext === '.jpg') return head[0] === 0xff && head[1] === 0xd8;
    if (ext === '.png') return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (ext === '.gif') return head.subarray(0, 3).toString('latin1') === 'GIF';
    if (ext === '.webp') return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
    if (ext === '.avif') return head.subarray(4, 8).toString('latin1') === 'ftyp';
    return true;
}

// Some CDNs hand back WebP (or another format) behind a `.jpg` URL and a
// `Content-Type: image/jpeg` header. Trust the file's magic bytes over the
// header so a perfectly good image is not written off as "not an image".
function sniffImageExt(buffer) {
    if (!buffer || buffer.length < 16) return null;
    const head = buffer.subarray(0, 16);
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return '.jpg';
    if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
    if (head.subarray(0, 3).toString('latin1') === 'GIF') return '.gif';
    if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return '.webp';
    if (head.subarray(4, 8).toString('latin1') === 'ftyp') return '.avif';
    return null;
}

async function fetchOnce(url, attempt) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            Referer: new URL(url).origin + '/',
        },
    });
    if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
        buffer,
        contentType: response.headers.get('content-type') || '',
        attempt,
    };
}

async function fetchWithRetry(url, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await fetchOnce(url, attempt);
        } catch (error) {
            lastError = error;
            // 4xx (other than rate limits) will not fix themselves.
            if (error.status && error.status < 500 && error.status !== 429) break;
            await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
    }
    throw lastError;
}

async function mapLimit(items, limit, worker) {
    const results = [];
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await worker(items[index], index);
        }
    });
    await Promise.all(runners);
    return results;
}

// Files that could reference a mirrored asset. Pruning without a repo-wide scan
// would delete images that a page still points at.
const SKIP_DIRS = new Set(['node_modules', '.git', '.freebuff', '.netlify', '.vercel', 'dist', 'build', '.scratch']);
const SCAN_EXT = /\.(html?|js|mjs|cjs|css|json|md)$/i;

function walkScanFiles(dir, out = []) {
    for (const name of fs.readdirSync(dir)) {
        const abs = path.join(dir, name);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
            if (SKIP_DIRS.has(name)) continue;
            walkScanFiles(abs, out);
        } else if (SCAN_EXT.test(name)) {
            out.push(abs);
        }
    }
    return out;
}

function collectReferencedCatalogFiles() {
    const referenced = new Set();
    walkScanFiles(ROOT).forEach((abs) => {
        if (abs === MANIFEST) return;
        const text = fs.readFileSync(abs, 'utf8');
        const matches = text.match(/products\/catalog\/([A-Za-z0-9._@-]+)/g) || [];
        matches.forEach((match) => referenced.add(match.replace('products/catalog/', '')));
    });
    return referenced;
}

// Regenerate the remote->local alias module the storefront imports. Keeping it
// in sync with the manifest means any URL still living in Firestore resolves to
// its mirrored file at read time.
function readManualAliases() {
    if (!fs.existsSync(MANUAL_ALIASES)) return {};
    try {
        const parsed = JSON.parse(fs.readFileSync(MANUAL_ALIASES, 'utf8'));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.warn(`  ! could not parse ${path.relative(ROOT, MANUAL_ALIASES)}: ${error.message}`);
        return {};
    }
}

function writeAliases(manifest) {
    if (!fs.existsSync(OUT_DIR)) return;
    const entries = Object.entries(manifest).filter(([url, entry]) => url !== 'failed' && entry?.local);
    const generated = new Map(entries.map(([url, entry]) => [url, entry.local]));
    // Manual overrides win: they repoint a broken URL at a re-sourced local file.
    Object.entries(readManualAliases()).forEach(([url, local]) => {
        if (url.startsWith('_')) return; // _README and other metadata keys
        if (typeof local !== 'string' || !local) return;
        const abs = path.join(ROOT, local);
        if (!fs.existsSync(abs)) {
            console.warn(`  ! manual alias target missing, skipping: ${local}`);
            return;
        }
        generated.set(url, local);
    });
    const lines = [...generated].map(([url, local]) => `  ${JSON.stringify(url)}: ${JSON.stringify(local)},`);
    const body = [
        '// AUTO-GENERATED by scripts/mirror-catalog-images.js — do not edit by hand.',
        '// Maps third-party catalogue image URLs to their local mirror so storefront',
        '// cards never depend on an external CDN, even when the product record lives',
        '// in Firestore and was written before the image was mirrored.',
        'export const REMOTE_IMAGE_ALIASES = {',
        ...lines,
        '};',
        '',
    ].join('\n');
    // .mjs, not .js: package.json is CommonJS, so Node would treat a .js file
    // here as CJS and reject the named import (browsers are unaffected).
    fs.writeFileSync(path.join(OUT_DIR, 'aliases.mjs'), body);
}

function pruneOrphans(manifest) {
    if (!fs.existsSync(OUT_DIR)) return 0;
    const referenced = collectReferencedCatalogFiles();
    // Only image files are prune candidates. Tooling that lives beside the art
    // (manifest.json, aliases.mjs, aliases.manual.json, localize-image.mjs) is
    // never deleted just because a page doesn't spell out its path.
    const onDisk = fs.readdirSync(OUT_DIR).filter((name) => IMAGE_EXT.test(name) && !PROTECTED_CATALOG_FILES.has(name));
    const orphans = onDisk.filter((name) => !referenced.has(name));

    orphans.forEach((name) => {
        fs.unlinkSync(path.join(OUT_DIR, name));
        console.log(`  pruned products/catalog/${name}`);
    });

    // Keep the manifest honest: drop entries whose file is gone.
    Object.keys(manifest).forEach((url) => {
        if (url === 'failed') return;
        const local = manifest[url]?.local;
        if (!local) return;
        const fileName = path.posix.basename(local);
        if (!fs.existsSync(path.join(OUT_DIR, fileName))) delete manifest[url];
    });

    return orphans.length;
}

// Pull every image URL referenced by the live catalogue (image, cardImage and
// the images[] gallery) out of Firestore, read-only.
async function fetchFirestoreCatalogImageUrls() {
    const urls = new Set();
    let pageToken = '';
    let pages = 0;

    do {
        const endpoint = new URL(`https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/products`);
        endpoint.searchParams.set('key', FIREBASE_API_KEY);
        endpoint.searchParams.set('pageSize', String(FIRESTORE_PAGE_SIZE));
        if (pageToken) endpoint.searchParams.set('pageToken', pageToken);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let payload;
        try {
            const response = await fetch(endpoint, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            payload = await response.json();
        } finally {
            clearTimeout(timer);
        }

        for (const doc of payload.documents || []) {
            const fields = doc.fields || {};
            const stringValue = (key) => fields[key]?.stringValue;
            const gallery = fields.images?.arrayValue?.values?.map((entry) => entry.stringValue) || [];
            [stringValue('image'), stringValue('cardImage'), ...gallery]
                .filter(Boolean)
                .forEach((url) => {
                    if (/^https?:\/\//i.test(url)) urls.add(url);
                });
        }

        pageToken = payload.nextPageToken || '';
        pages += 1;
    } while (pageToken && pages < 20);

    return urls;
}

// ── local upload server (--serve) ─────────────────────────────────────────
// The deployed site is static, so nothing in production can write into the repo.
// Run this locally and open the admin from its origin: uploaded product images
// are written into products/catalog/ — the directory the mirror pipeline owns —
// and registered in uploads.json so `--prune` never treats them as orphans.
const STATIC_MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
    '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function slugifyUploadName(value) {
    const base = String(value || 'product-image').replace(/\.[^.]+$/, '');
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return slug || 'product-image';
}

function readUploadsRegistry() {
    if (!fs.existsSync(UPLOADS_REGISTRY)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(UPLOADS_REGISTRY, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function registerUpload(entry) {
    const registry = readUploadsRegistry();
    if (registry.some((item) => item.file === entry.file)) return false;
    registry.push(entry);
    fs.writeFileSync(UPLOADS_REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
    return true;
}

// Store bytes in products/catalog/. Identical content is deduped by hash so a
// retry or a re-crop does not litter the directory with near-copies.
function storeCatalogUpload(buffer, name) {
    const ext = sniffImageExt(buffer);
    if (!ext) throw new Error('not a recognised image');
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 6);
    const existing = fs.existsSync(OUT_DIR)
        ? fs.readdirSync(OUT_DIR).find((file) => file.endsWith(`-${hash}${ext}`))
        : null;
    const fileName = existing || `${slugifyUploadName(name)}-${hash}${ext}`;
    if (!existing) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUT_DIR, fileName), buffer);
    }
    return { fileName, local: path.posix.join('products', 'catalog', fileName), bytes: buffer.length, deduped: Boolean(existing) };
}

// Opt-in (--commit): commit a newly stored image straight from the upload
// server, so a local upload session leaves a clean, reviewable commit instead
// of a pile of untracked files. Only the image itself and its registry entry
// are committed — never anything else staged or dirtied in the working tree —
// so an in-progress edit elsewhere is left untouched.
function gitCommitUpload(stored, registered) {
    const paths = [];
    if (!stored.deduped) paths.push(stored.local);
    if (registered) paths.push('products/catalog/uploads.json');
    if (!paths.length) return { committed: false, reason: 'nothing new to commit' };

    const message = stored.deduped
        ? `Record catalogue image upload ${stored.fileName}`
        : `Add catalogue image ${stored.fileName}`;
    try {
        // Stage explicitly (covers the new untracked file), then commit only
        // these paths so concurrently staged work is not swept in.
        execFileSync('git', ['add', '--', ...paths], { cwd: ROOT, stdio: 'pipe' });
        execFileSync('git', ['commit', '-m', message, '--', ...paths], { cwd: ROOT, stdio: 'pipe' });
        console.log(`  commit  ${message}`);
        return { committed: true, message };
    } catch (error) {
        const detail = String(error.stderr || error.message || '').trim().split('\n').pop() || 'git failed';
        console.warn(`  commit skipped: ${detail}`);
        return { committed: false, error: detail };
    }
}

// Only reflect an Origin that is itself loopback — the local admin page. We no
// longer allow '*': a foreign localhost page must not be able to read a
// rejection reason, and it can never satisfy the token check anyway.
function isLoopbackOrigin(origin) {
    if (typeof origin !== 'string' || !origin) return false;
    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
    } catch {
        return false;
    }
}

function corsHeaders(req) {
    return isLoopbackOrigin(req.headers.origin) ? { 'Access-Control-Allow-Origin': req.headers.origin } : {};
}

function sendJson(res, status, payload, req) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        ...(req ? corsHeaders(req) : {}),
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

// Constant-time token check so a local attacker cannot learn the secret by
// timing guesses. Accepts the X-Catalog-Token header or a ?token= query param.
function requestUploadToken(req, requestUrl) {
    const header = req.headers[UPLOAD_TOKEN_HEADER];
    if (typeof header === 'string' && header) return header;
    return requestUrl.searchParams.get('token') || '';
}

function uploadTokenMatches(candidate) {
    if (!candidate) return false;
    const given = Buffer.from(String(candidate));
    const expected = Buffer.from(UPLOAD_TOKEN);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function startUploadServer() {
    const server = http.createServer((req, res) => {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                ...corsHeaders(req),
                'Access-Control-Allow-Methods': 'POST, GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Catalog-Token',
            });
            res.end();
            return;
        }

        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (requestUrl.pathname === '/api/catalog-upload') {
            if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'POST only' }, req);
            // Reject unauthenticated callers before reading a single body byte.
            if (!uploadTokenMatches(requestUploadToken(req, requestUrl))) {
                console.warn('  upload rejected: missing or invalid token');
                return sendJson(res, 401, { success: false, error: 'missing or invalid upload token' }, req);
            }
            const contentType = String(req.headers['content-type'] || '');
            if (!/^image\//i.test(contentType)) return sendJson(res, 415, { success: false, error: 'Content-Type must be image/*' }, req);

            const chunks = [];
            let size = 0;
            let aborted = false;
            req.on('data', (chunk) => {
                size += chunk.length;
                if (size > MAX_UPLOAD_BYTES) {
                    aborted = true;
                    sendJson(res, 413, { success: false, error: `image exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB` }, req);
                    req.destroy();
                    return;
                }
                chunks.push(chunk);
            });
            req.on('end', () => {
                if (aborted) return;
                try {
                    const name = requestUrl.searchParams.get('name') || 'product-image';
                    const stored = storeCatalogUpload(Buffer.concat(chunks), name);
                    const registered = registerUpload({ file: stored.local, name, bytes: stored.bytes, uploadedAt: new Date().toISOString() });
                    console.log(`  upload  ${stored.local}  (${(stored.bytes / 1024).toFixed(0)} KB${stored.deduped ? ', deduped' : ''})`);
                    const commit = COMMIT ? gitCommitUpload(stored, registered) : null;
                    sendJson(res, 200, { success: true, local: stored.local, bytes: stored.bytes, deduped: stored.deduped, ...(commit ? { commit } : {}) }, req);
                } catch (error) {
                    console.warn(`  upload rejected: ${error.message}`);
                    sendJson(res, 400, { success: false, error: error.message }, req);
                }
            });
            req.on('error', () => { if (!res.headersSent) sendJson(res, 500, { success: false, error: 'upload stream error' }, req); });
            return;
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return sendJson(res, 405, { success: false, error: 'method not allowed' }, req);
        }

        let pathname = decodeURIComponent(requestUrl.pathname);
        if (pathname === '/') pathname = '/index.html';
        const abs = path.join(ROOT, pathname);
        if (!abs.startsWith(ROOT)) {
            res.writeHead(403);
            res.end('forbidden');
            return;
        }
        fs.readFile(abs, (error, data) => {
            if (error) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('not found');
                return;
            }
            const ext = path.extname(abs).toLowerCase();
            let payload = data;
            // Hand the same-origin admin page the per-run token, so it can keep
            // uploading while a foreign localhost page cannot.
            if (ext === '.html' && req.method !== 'HEAD') {
                const html = data.toString('utf8');
                const inject = `<script>window.CATALOG_UPLOAD_TOKEN=${JSON.stringify(UPLOAD_TOKEN)};window.CATALOG_UPLOAD_ENDPOINT=${JSON.stringify(UPLOAD_ENDPOINT_PATH)};</script>`;
                payload = Buffer.from(/<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${inject}</head>`) : `${inject}\n${html}`);
            }
            res.writeHead(200, { 'Content-Type': STATIC_MIME[ext] || 'application/octet-stream' });
            res.end(req.method === 'HEAD' ? undefined : payload);
        });
    });

    server.listen(SERVE_PORT, SERVE_HOST, () => {
        console.log(`\nCatalog upload server on http://${SERVE_HOST}:${SERVE_PORT}`);
        console.log('  Admin:      open /admin.html or /admin/products.html from this origin');
        console.log(`  Endpoint:   POST ${UPLOAD_ENDPOINT_PATH}?name=<filename>  (raw image bytes)`);
        console.log('  Registry:   products/catalog/uploads.json');
        console.log(`  Token:      ${UPLOAD_TOKEN}`);
        console.log('              required as X-Catalog-Token (or ?token=); auto-injected into served HTML');
        console.log('              override with --token <value> or CATALOG_UPLOAD_TOKEN');
        if (COMMIT) {
            let inRepo = true;
            try {
                execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, stdio: 'pipe' });
            } catch {
                inRepo = false;
            }
            console.log(inRepo
                ? '  Commit:     on — each new image is committed automatically (--commit)'
                : '  Commit:     on, but this is not a git working tree — commits will be skipped');
        }
        console.log('  Stop with Ctrl+C.\n');
    });
    return server;
}

// ── re-source (--re-source) ───────────────────────────────────────────────
// Self-service fix for a dead catalogue image: mirror the replacement (or adopt
// an existing in-repo file), point the broken URL at it in aliases.manual.json,
// and regenerate the alias module — no hand-editing JSON.
async function reSourceImage({ broken, replacement, name, dryRun }) {
    if (!broken || !/^https?:\/\//i.test(broken)) {
        throw new Error('--broken must be an http(s) image URL');
    }
    if (!replacement) {
        throw new Error('--replacement is required (an image URL, or an existing file inside the repo)');
    }

    if (dryRun) {
        const remote = /^https?:\/\//i.test(replacement);
        console.log('\n--dry-run: no files written.');
        console.log(`  broken       ${broken}`);
        console.log(`  replacement  ${replacement}${remote ? '  (would be mirrored into products/catalog/)' : '  (must already exist in the repo)'}`);
        console.log(`  would map    ${broken} -> the local file, in products/catalog/aliases.manual.json`);
        console.log('               and regenerate products/catalog/aliases.mjs');
        return;
    }

    const manual = fs.existsSync(MANUAL_ALIASES)
        ? JSON.parse(fs.readFileSync(MANUAL_ALIASES, 'utf8'))
        : { _README: 'Hand-maintained remote->local overrides for catalogue images that cannot be mirrored (dead 404 or hotlink-blocked). scripts/mirror-catalog-images.js merges these over the generated aliases.mjs. Keys beginning with _ are metadata.' };
    const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

    let local;
    if (/^https?:\/\//i.test(replacement)) {
        const already = manifest[replacement];
        if (already?.local && fs.existsSync(path.join(ROOT, already.local))) {
            // Already mirrored — reuse the existing file rather than re-fetch it.
            local = already.local;
            console.log(`  reused     ${replacement}\n          ->   ${local}`);
        } else {
            const { buffer, contentType } = await fetchWithRetry(replacement);
            if (!sniffImageExt(buffer)) {
                throw new Error(`replacement is not a recognised image (${contentType || 'unknown type'})`);
            }
            const fallbackName = decodeURIComponent(new URL(replacement).pathname.split('/').filter(Boolean).pop() || 'replacement');
            const stored = storeCatalogUpload(buffer, name || fallbackName);
            local = stored.local;
            manifest[replacement] = { local, bytes: stored.bytes, contentType, fetchedAt: new Date().toISOString() };
            console.log(`  mirrored   ${replacement}\n          ->   ${local}${stored.deduped ? ' (identical bytes already on disk)' : ` (${(stored.bytes / 1024).toFixed(0)} KB)`}`);
        }
    } else {
        const abs = path.isAbsolute(replacement) ? replacement : path.resolve(ROOT, replacement);
        if (!abs.startsWith(ROOT)) throw new Error('--replacement path must live inside the repo');
        if (!fs.existsSync(abs)) throw new Error(`--replacement path not found: ${replacement}`);
        local = path.relative(ROOT, abs).split(path.sep).join('/');
        if (!IMAGE_EXT.test(local)) throw new Error(`--replacement is not a recognised image file: ${local}`);
        console.log(`  adopted    ${local}`);
    }

    manual[broken] = local;
    fs.writeFileSync(MANUAL_ALIASES, `${JSON.stringify(manual, null, 2)}\n`);

    // The broken URL is now resolved — drop it from the dead-source record.
    if (Array.isArray(manifest.failed)) {
        manifest.failed = manifest.failed.filter((entry) => entry.url !== broken);
        if (!manifest.failed.length) delete manifest.failed;
    }
    fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    writeAliases(manifest);

    console.log(`\n✓ Re-sourced 1 image`);
    console.log(`  ${broken}\n    -> ${local}`);
    console.log('  products/catalog/aliases.manual.json updated; products/catalog/aliases.mjs regenerated.');
    console.log('  Commit products/catalog/ (and the new local file, if any) with your product change.');
}

async function main() {
    if (SERVE) {
        startUploadServer();
        return;
    }

    if (RESOURCE) {
        await reSourceImage({ broken: RESOURCE_BROKEN, replacement: RESOURCE_REPLACEMENT, name: RESOURCE_NAME, dryRun: DRY_RUN });
        return;
    }

    const urlMap = collectUrls();

    if (FIRESTORE) {
        try {
            const firestoreUrls = await fetchFirestoreCatalogImageUrls();
            let added = 0;
            for (const url of firestoreUrls) {
                let parsed;
                try {
                    parsed = new URL(url);
                } catch {
                    continue;
                }
                if (!isImageCandidate(parsed, url)) continue;
                if (!urlMap.has(url)) {
                    urlMap.set(url, new Set(['firestore']));
                    added += 1;
                }
            }
            console.log(`\nFirestore catalogue (${FIRESTORE_PROJECT}): ${firestoreUrls.size} image URL(s), ${added} new candidate(s).`);
        } catch (error) {
            console.warn(`  ! Firestore catalogue fetch failed: ${error.message} — continuing with repo files only`);
        }
    }

    const urls = [...urlMap.keys()];
    console.log(`\nCandidate remote images: ${urls.length}`);
    if (!urls.length) {
        console.log('Nothing to mirror — every catalog image already resolves locally.');
        if (fs.existsSync(MANIFEST)) {
            const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
            // Write the alias module BEFORE pruning. Database-sourced images are
            // referenced only by that module, so pruning first would see them as
            // orphans and delete perfectly good files.
            writeAliases(manifest);
            if (PRUNE) {
                const pruned = pruneOrphans(manifest);
                fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
                writeAliases(manifest);
                console.log(`Pruned ${pruned} unreferenced catalog file(s).`);
            }
            // Nothing was re-checked, so leave any recorded dead sources in place —
            // they are surfaced until a run actually re-fetches and clears them.
            if (manifest.failed?.length) {
                console.log(`\n⚠ ${manifest.failed.length} known DEAD source(s) still recorded — see products/catalog/manifest.json:`);
                manifest.failed.forEach((entry) => console.log(`  ${String(entry.error).padEnd(10)} ${String(entry.url).slice(0, 120)}`));
            }
        }
        return;
    }

    const hostCounts = {};
    urls.forEach((url) => {
        const host = new URL(url).host;
        hostCounts[host] = (hostCounts[host] || 0) + 1;
    });
    console.log('By host:', hostCounts);

    if (DRY_RUN) {
        console.log('\n--dry-run: no files written. Planned destinations:\n');
        urls.slice(0, 400).forEach((url) => {
            console.log(`  ${baseNameFor(url)}<ext>  <=  ${url.slice(0, 110)}`);
        });
        if (urls.length > 400) console.log(`  ...and ${urls.length - 400} more`);
        return;
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
    let downloaded = 0;
    let reused = 0;
    let failed = 0;
    let bytes = 0;

    const results = await mapLimit(urls, CONCURRENCY, async (url) => {
        const existing = manifest[url];
        if (existing && !FORCE && fs.existsSync(path.join(ROOT, existing.local))) {
            reused += 1;
            return { url, ...existing, status: 'reused' };
        }

        try {
            const { buffer, contentType } = await fetchWithRetry(url);
            const sniffed = sniffImageExt(buffer);
            const ext = sniffed || extForContentType(contentType, url);
            if (!sniffed && !looksLikeImageBuffer(buffer, ext)) {
                throw new Error(`not an image (${contentType || 'unknown type'})`);
            }
            const fileName = `${baseNameFor(url)}${ext}`;
            const abs = path.join(OUT_DIR, fileName);
            fs.writeFileSync(abs, buffer);
            const local = path.posix.join('products', 'catalog', fileName);
            downloaded += 1;
            bytes += buffer.length;
            process.stdout.write(`  ok   ${fileName}  (${(buffer.length / 1024).toFixed(0)} KB)\n`);
            return { url, local, bytes: buffer.length, contentType, status: 'downloaded' };
        } catch (error) {
            failed += 1;
            process.stdout.write(`  FAIL ${url.slice(0, 90)}  -> ${error.message}\n`);
            return { url, status: 'failed', error: error.message };
        }
    });

    results.forEach((entry) => {
        if (entry.status === 'downloaded' || entry.status === 'reused') {
            manifest[entry.url] = { local: entry.local, bytes: entry.bytes || 0, contentType: entry.contentType || '', fetchedAt: new Date().toISOString() };
        }
    });

    // Keep a durable record of dead sources. A 404 here means the product's
    // image is already broken on the storefront and must be re-sourced, since
    // there is nothing to mirror.
    const manualAliases = readManualAliases();
    const failures = results
        .filter((entry) => entry.status === 'failed')
        .map((entry) => ({ url: entry.url, error: entry.error, checkedAt: new Date().toISOString() }));
    // A dead URL that has a manual alias is already re-sourced — it resolves to a
    // local file on the storefront, so it is not an open problem.
    const resolved = failures.filter((entry) => manualAliases[entry.url]);
    const unresolved = failures.filter((entry) => !manualAliases[entry.url]);
    // Bounded: keep only the most recent run's unresolved dead sources so the manifest stays auditable.
    if (unresolved.length) manifest.failed = unresolved;
    else delete manifest.failed;

    fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    writeAliases(manifest);

    console.log(`\nDownloaded ${downloaded}, reused ${reused}, failed ${failed}.`);
    console.log(`Bytes fetched this run: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Manifest: ${path.relative(ROOT, MANIFEST)} (${Object.keys(manifest).length - (unresolved.length ? 1 : 0)} mirrored URLs)`);

    if (resolved.length) {
        console.log(`\n✓ ${resolved.length} dead source(s) re-sourced via products/catalog/aliases.manual.json:`);
        resolved.forEach((entry) => console.log(`  ${entry.url.slice(0, 100)} -> ${manualAliases[entry.url]}`));
    }

    if (unresolved.length) {
        console.log(`\n⚠ ${unresolved.length} source(s) are DEAD and cannot be mirrored — re-source these before shipping:`);
        unresolved.forEach((entry) => console.log(`  ${entry.error.padEnd(10)} ${entry.url.slice(0, 120)}`));
    }

    if (REWRITE) {
        let touched = 0;
        FILES.forEach((rel) => {
            const abs = path.join(ROOT, rel);
            if (!fs.existsSync(abs)) return;
            const before = fs.readFileSync(abs, 'utf8');
            let after = before;

            // Resolve each mirrored file relative to the page doing the referencing,
            // so an admin page links ../products/catalog/... and a root page links
            // products/catalog/... without hand-fixing dozens of paths.
            const replacements = new Map();
            Object.entries(manifest).forEach(([url, entry]) => {
                if (url === 'failed' || !entry?.local) return;
                const relative = path.relative(path.dirname(abs), path.join(ROOT, entry.local));
                replacements.set(url, relative.split(path.sep).join('/'));
            });

            replacements.forEach((local, url) => {
                if (after.includes(url)) after = after.split(url).join(local);
            });
            // Query-string variants of a mirrored URL resolve to the same manifest entry.
            replacements.forEach((local, url) => {
                const stem = url.split('?')[0];
                if (!after.includes(stem)) return;
                const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                after = after.replace(new RegExp(`${escaped}(?:\\?[^"'\\\`\\s)]*)?`, 'g'), local);
            });
            // Swap helper calls for the local file they now resolve to.
            after = after.replace(IMGUR_HELPER_RE, (full, _q1, id, _q3, ext) => {
                const entry = manifest[imgurHelperUrl(id, ext)];
                if (!entry?.local) return full;
                const relative = path.relative(path.dirname(abs), path.join(ROOT, entry.local));
                return `'${relative.split(path.sep).join('/')}'`;
            });

            if (after !== before) {
                fs.writeFileSync(abs, after);
                touched += 1;
                console.log(`  rewritten ${rel}`);
            }
        });
        console.log(`\nRewrote ${touched} file(s).`);
    } else {
        console.log('\nRun again with --rewrite to point the source files at products/catalog/.');
    }

    if (PRUNE) {
        const pruned = pruneOrphans(manifest);
        fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
        writeAliases(manifest);
        console.log(`\nPruned ${pruned} unreferenced catalog file(s).`);
    }
}

// Exposed for the in-process end-to-end test (scripts/catalog-upload-server.test.js),
// which copies this file into a throwaway repo and starts the server itself.
module.exports = { startUploadServer };

// Only run the CLI when invoked directly — requiring this module must not kick
// off a mirror run or bind a port.
if (require.main === module) {
    main().catch((error) => {
        const detail = process.env.DEBUG ? (error.stack || error.message) : (error.message || String(error));
        console.error(`\n✗ ${detail}`);
        process.exit(1);
    });
}
