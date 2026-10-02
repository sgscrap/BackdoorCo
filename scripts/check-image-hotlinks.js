#!/usr/bin/env node
// Guard against third-party catalogue image hotlinks.
//
// Fails when a storefront source file — or a catalogue document kept in the repo,
// such as the admin seed pages or product-data.js — points at an image on a host
// we do not serve, unless the URL is resolved locally by the mirror alias map
// (products/catalog/aliases.mjs) or the manual overrides (aliases.manual.json).
// It also fails when the mirror manifest still records unresolved dead sources.
//
// Usage:
//   node scripts/check-image-hotlinks.js
//   node scripts/check-image-hotlinks.js --files "a.js,b.html"
//   node scripts/check-image-hotlinks.js --catalog dump.json   # extra dump to scan
//   node scripts/check-image-hotlinks.js --live                # also check the live Firestore catalogue
//   node scripts/check-image-hotlinks.js --fix                 # mirror what it finds, then re-check
//   node scripts/check-image-hotlinks.js --fix --dry-run       # preview the mirror, write nothing
//   node scripts/check-image-hotlinks.js --no-manifest         # skip the manifest dead-source check
//                                                              (used by the pre-commit hook, which
//                                                              only cares about the staged files)
//
// --fix delegates to scripts/mirror-catalog-images.js (the same pipeline the
// catalogue uses), which downloads each unmirrored image and regenerates
// products/catalog/aliases.mjs. Dead sources and URL-building helpers are not
// auto-mirrorable and are reported for re-sourcing instead.
//
// The default run is fully offline and is wired into `npm test`.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'products', 'catalog');
const MANIFEST = path.join(CATALOG_DIR, 'manifest.json');
const MANUAL_ALIASES = path.join(CATALOG_DIR, 'aliases.manual.json');
const MIRROR_SCRIPT = path.join(__dirname, 'mirror-catalog-images.js');

// Keep in step with DEFAULT_FILES in scripts/mirror-catalog-images.js so the
// guard and the mirror scan the same surfaces.
function adminSeedPages() {
    const dir = path.join(ROOT, 'admin');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((name) => /^seed-.*\.html$/.test(name))
        .map((name) => `admin/${name}`);
}

const DEFAULT_FILES = [
    'product-data.js',
    'index.html',
    'shop-all.js',
    'app.js',
    'pricing.js',
    'product-page.js',
    'reviews-data.js',
    'admin.js',
    'admin/products.js',
    ...adminSeedPages(),
];

// Hosts that only ever serve image bytes. Duplicated from the mirror script on
// purpose: this guard must keep working even if that script changes shape.
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
const URL_RE = /https?:\/\/[^\s"'`)|<>]+/g;
// Catalogue data built at runtime through the old Imgur helper — a hotlink the
// literal-URL scan cannot see.
const IMGUR_HELPER_RE = /\bbuildImgurImageUrl\s*\(/;

const FIRST_PARTY_HOSTS = [
    'backdoorco.xyz',
    'backdoorco2.netlify.app',
    'backdoorco.vercel.app',
    'localhost',
    '127.0.0.1',
];

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const FILES = valueOf('--files', '')
    ? valueOf('--files', '').split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_FILES;
const CATALOG_DUMPS = args.reduce((acc, arg, i) => {
    if (arg === '--catalog' && args[i + 1]) acc.push(args[i + 1]);
    return acc;
}, []);
const LIVE = has('--live');
const FIX = has('--fix');
const DRY_RUN = has('--dry-run');
const NO_MANIFEST = has('--no-manifest');

const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/coalition-aec44/databases/(default)/documents/products'
    + '?key=AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw&pageSize=300';

function isFirstParty(host) {
    const lower = String(host || '').toLowerCase();
    return FIRST_PARTY_HOSTS.some((own) => lower === own || lower.endsWith(`.${own}`));
}

function isImageUrl(parsed, url) {
    const looksLikeImage = IMAGE_EXT.test(parsed.pathname)
        || IMAGE_EXT.test(url)
        || IMAGE_HOST_HINTS.some((hint) => hint.test(parsed.host));
    if (!looksLikeImage) return false;
    if (/\.(js|css|json|html?|svg|woff2?|ttf|txt|xml|php|ico)(\?|$)/i.test(parsed.pathname)) return false;
    return true;
}

function lineAt(text, index) {
    return text.slice(0, index).split('\n').length;
}

// Collect third-party image URLs that are *not* resolved locally.
function scanText(text, label, aliases, { isDocument = false } = {}) {
    const violations = [];
    const seen = new Set();

    for (const match of text.matchAll(URL_RE)) {
        const raw = match[0].replace(/[),.;]+$/, '');
        // Template code, illustrative placeholders (`...`), and escaped forms.
        if (raw.includes('${') || raw.includes('...') || raw.includes('\\')) continue;

        let parsed;
        try {
            parsed = new URL(raw);
        } catch {
            continue;
        }
        if (!isImageUrl(parsed, raw)) continue;
        if (isFirstParty(parsed.host)) continue;

        const bare = raw.split('?')[0].split('#')[0];
        if (aliases[raw] || aliases[bare]) continue; // resolved to a local file

        const key = `${label}|${raw}`;
        if (seen.has(key)) continue;
        seen.add(key);
        violations.push({
            label,
            line: isDocument ? null : lineAt(text, match.index),
            url: raw,
            reason: 'third-party image host with no local mirror',
        });
    }

    // A catalogue file that builds Imgur URLs at runtime would slip past the
    // literal scan; treat the helper itself as the violation.
    if (IMGUR_HELPER_RE.test(text)) {
        violations.push({ label, line: lineAt(text, text.search(IMGUR_HELPER_RE)), url: 'buildImgurImageUrl(...)', reason: 'constructs third-party (Imgur) image URLs' });
    }

    return violations;
}

async function loadAliases({ bust = false } = {}) {
    const base = pathToFileURL(path.join(CATALOG_DIR, 'aliases.mjs')).href;
    // After --fix regenerates aliases.mjs the module cache must be bypassed, or
    // the re-check would keep using the stale alias map.
    const { REMOTE_IMAGE_ALIASES } = await import(bust ? `${base}?t=${Date.now()}` : base);
    const merged = { ...REMOTE_IMAGE_ALIASES };
    if (fs.existsSync(MANUAL_ALIASES)) {
        const manual = JSON.parse(fs.readFileSync(MANUAL_ALIASES, 'utf8'));
        for (const [url, local] of Object.entries(manual)) {
            if (!url.startsWith('_') && typeof local === 'string') merged[url] = local;
        }
    }
    return merged;
}

function checkManifestDeadSources() {
    if (!fs.existsSync(MANIFEST)) return [];
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const failed = Array.isArray(manifest.failed) ? manifest.failed : [];
    return failed.map((entry) => ({
        label: 'products/catalog/manifest.json',
        line: null,
        url: entry.url,
        reason: `recorded dead source (${entry.error}) with no re-sourced alias`,
    }));
}

async function checkLiveCatalogue(aliases) {
    let payload;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(FIRESTORE_URL, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
    } catch (error) {
        console.warn(`  ! live catalogue check skipped (${error.message}) — run with network for the full check`);
        return { violations: [], checked: 0, skipped: true };
    }

    const urls = [];
    for (const doc of payload.documents || []) {
        const fields = doc.fields || {};
        const str = (key) => fields[key]?.stringValue;
        const images = fields.images?.arrayValue?.values?.map((v) => v.stringValue) || [];
        [str('image'), str('cardImage'), ...images].filter(Boolean).forEach((u) => urls.push(u));
    }

    const violations = [];
    const seen = new Set();
    let checked = 0;
    for (const url of urls) {
        if (!/^https?:\/\//i.test(url)) continue;
        checked += 1;
        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            continue;
        }
        if (isFirstParty(parsed.host)) continue;
        const bare = url.split('?')[0].split('#')[0];
        if (aliases[url] || aliases[bare]) continue;
        if (seen.has(url)) continue;
        seen.add(url);
        violations.push({ label: 'Firestore catalogue', line: null, url, reason: 'catalogue doc hotlinks a third-party image host' });
    }
    return { violations, checked, skipped: false };
}

// One full pass over every scanned surface, returning the violations plus the
// counters the summary line needs. Extracted so --fix can run it twice.
async function runScan(aliases) {
    const violations = [];
    let filesScanned = 0;
    let urlsSeen = 0;

    for (const rel of FILES) {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) {
            console.warn(`  ! skipped (missing): ${rel}`);
            continue;
        }
        filesScanned += 1;
        const text = fs.readFileSync(abs, 'utf8');
        urlsSeen += (text.match(URL_RE) || []).length;
        violations.push(...scanText(text, rel, aliases));
    }

    for (const rel of CATALOG_DUMPS) {
        const abs = path.resolve(ROOT, rel);
        if (!fs.existsSync(abs)) {
            console.warn(`  ! skipped (missing): ${rel}`);
            continue;
        }
        filesScanned += 1;
        violations.push(...scanText(fs.readFileSync(abs, 'utf8'), rel, aliases, { isDocument: true }));
    }

    if (!NO_MANIFEST) violations.push(...checkManifestDeadSources());

    let liveNote = '';
    if (LIVE) {
        const live = await checkLiveCatalogue(aliases);
        violations.push(...live.violations);
        liveNote = live.skipped ? ' (live catalogue skipped)' : `, live catalogue: ${live.checked} URLs`;
    }

    return { violations, filesScanned, urlsSeen, liveNote };
}

function printViolations(violations) {
    console.error(`\n✗ ${violations.length} third-party catalogue image hotlink(s):\n`);
    for (const v of violations) {
        const where = v.line ? `${v.label}:${v.line}` : v.label;
        console.error(`  ${where}\n      ${v.url}\n      ${v.reason}`);
    }
}

// A violation can be auto-mirrored when it is a concrete http(s) URL. Dead
// sources already recorded in the manifest are excluded (re-fetching them is
// pointless — they need re-sourcing), as is the URL-building helper.
function isMirrorable(violation) {
    return /^https?:\/\//i.test(violation.url) && violation.label !== 'products/catalog/manifest.json';
}

// Mirror the given URLs by delegating to the catalogue pipeline, which
// downloads each image and regenerates products/catalog/aliases.mjs.
function mirrorUrls(urls, { dryRun }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotlink-fix-'));
    const urlsFile = path.join(dir, 'urls.txt');
    fs.writeFileSync(urlsFile, `${urls.join('\n')}\n`);

    const childArgs = [MIRROR_SCRIPT, '--urls', urlsFile];
    if (dryRun) childArgs.push('--dry-run');

    try {
        const result = spawnSync(process.execPath, childArgs, { cwd: ROOT, stdio: 'inherit' });
        return result.status === 0;
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

(async () => {
    let aliases = await loadAliases();
    const first = await runScan(aliases);

    if (!first.violations.length) {
        console.log(`✓ No third-party catalogue image hotlinks across ${first.filesScanned} file(s)${first.liveNote}.`);
        return;
    }

    if (!FIX) {
        printViolations(first.violations);
        console.error('\nMirror the image (scripts/mirror-catalog-images.js --fix / --urls) or re-source it via products/catalog/aliases.manual.json.\n');
        process.exitCode = 1;
        return;
    }

    const mirrorable = first.violations.filter(isMirrorable);
    const urls = [...new Set(mirrorable.map((v) => v.url))];

    if (!urls.length) {
        printViolations(first.violations);
        console.error('\nNothing to mirror automatically — re-source these via products/catalog/aliases.manual.json.\n');
        process.exitCode = 1;
        return;
    }

    console.log(`\n--fix: mirroring ${urls.length} unmirrored catalogue image URL(s) via scripts/mirror-catalog-images.js…\n`);
    const mirrored = mirrorUrls(urls, { dryRun: DRY_RUN });

    if (DRY_RUN) {
        console.log('\n--dry-run: nothing was written.');
        return;
    }

    if (!mirrored) {
        console.error('\n✗ mirror run failed — see the output above.');
        process.exitCode = 1;
        return;
    }

    // Reload the regenerated alias map and re-check from scratch.
    aliases = await loadAliases({ bust: true });
    const second = await runScan(aliases);

    if (!second.violations.length) {
        console.log(`\n✓ --fix resolved every hotlink across ${second.filesScanned} file(s)${second.liveNote}.`);
        console.log('  Any source file still referencing the remote URL literally can be rewritten with:');
        console.log('    node scripts/mirror-catalog-images.js --rewrite');
        return;
    }

    console.log(`\n--fix resolved ${first.violations.length - second.violations.length} hotlink(s); ${second.violations.length} remain.`);
    printViolations(second.violations);
    console.error('\nRemaining hotlinks are not auto-mirrorable (dead sources or a URL-building helper). Re-source them via products/catalog/aliases.manual.json.\n');
    process.exitCode = 1;
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
