// Reports which catalogue products still resolve to the placeholder image, so
// missing art is visible rather than silent.
//
// Two sources are scanned, each through the same read-time resolver the
// storefront uses (products/catalog/localize-image.mjs):
//   • the seeded catalogue in product-data.js (SEEDED_PRODUCTS)
//   • the live Firestore catalogue (read-only, web API key)
//
// A raw image URL that localizes to CATALOG_IMAGE_PLACEHOLDER is art we never
// mirrored. The report names the product, the field, and the offending URL.
//
// Run: node scripts/report-placeholder-images.js
//      node scripts/report-placeholder-images.js --offline   (skip Firestore)
//      node scripts/report-placeholder-images.js --json      (machine output)
//      node scripts/report-placeholder-images.js --quiet     (summary only)
//
// Exits 1 when any placeholder is found, so it can gate a build if desired.
// With --strict it also fails when the live catalogue cannot be read at all —
// the gate is fail-closed, so a Firestore outage blocks the build rather than
// silently passing an unverified catalogue.

'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'products', 'catalog');

const FIRESTORE_PROJECT = process.env.FIRESTORE_PROJECT || 'coalition-aec44';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw';
const FIRESTORE_PAGE_SIZE = 300;

const args = new Set(process.argv.slice(2));
const OFFLINE = args.has('--offline');
const AS_JSON = args.has('--json');
const QUIET = args.has('--quiet');
const STRICT = args.has('--strict');

// ── Firestore value decoding ────────────────────────────────────────────────
// Only the field types product documents use, but decoded generically enough
// that an unexpected type is ignored rather than crashing the report.
function decodeValue(value) {
    if (value == null || typeof value !== 'object') return undefined;
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('booleanValue' in value) return Boolean(value.booleanValue);
    if ('nullValue' in value) return null;
    if ('timestampValue' in value) return value.timestampValue;
    if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeValue);
    if ('mapValue' in value) return decodeFields(value.mapValue?.fields || {});
    return undefined;
}

function decodeFields(fields) {
    const out = {};
    for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
    return out;
}

async function fetchFirestoreProducts() {
    const products = [];
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
            const product = decodeFields(doc.fields || {});
            if (!product.id) {
                product.id = decodeURIComponent(String(doc.name || '').split('/').pop() || '');
            }
            products.push(product);
        }

        pageToken = payload.nextPageToken || '';
        pages += 1;
    } while (pageToken && pages < 20);

    return products;
}

// ── scan ────────────────────────────────────────────────────────────────────
// A raw product doc is "missing art" when any rendered image field localizes to
// the placeholder. The raw field survives here so the report can name the URL.
function findPlaceholders(product, localize, placeholder) {
    const fields = [];
    const check = (field, raw) => {
        const value = localize(raw);
        if (value === placeholder) fields.push({ field, url: String(raw) });
    };

    check('image', product.image);
    check('cardImage', product.cardImage);
    if (Array.isArray(product.images)) {
        product.images.forEach((raw, index) => {
            const value = localize(raw);
            if (value === placeholder) fields.push({ field: `images[${index}]`, url: String(raw) });
        });
    }
    return fields;
}

function label(product) {
    const name = String(product.name || product.id || '(unnamed)').replace(/\s+/g, ' ').trim();
    return { id: String(product.id || '(no id)'), name };
}

(async () => {
    // product-data.js is ESM in a CommonJS package; import a throwaway .mjs copy.
    const tmpPath = path.join(ROOT, '.product-data.report-tmp.mjs');
    fs.copyFileSync(path.join(ROOT, 'product-data.js'), tmpPath);
    let productData;
    try {
        productData = await import(pathToFileURL(tmpPath).href);
    } finally {
        fs.rmSync(tmpPath, { force: true });
    }

    const { localizeCatalogImage, CATALOG_IMAGE_PLACEHOLDER } =
        await import(pathToFileURL(path.join(CATALOG_DIR, 'localize-image.mjs')).href);

    const sources = [];

    // Seeded catalogue.
    const seeded = (productData.SEEDED_PRODUCTS || []).map((product) => {
        const fields = findPlaceholders(product, localizeCatalogImage, CATALOG_IMAGE_PLACEHOLDER);
        return fields.length ? { ...label(product), fields } : null;
    }).filter(Boolean);
    sources.push({ source: 'seeded', origin: 'product-data.js (SEEDED_PRODUCTS)', scanned: (productData.SEEDED_PRODUCTS || []).length, missing: seeded });

    // Live catalogue.
    if (!OFFLINE) {
        try {
            const live = await fetchFirestoreProducts();
            const missing = live.map((product) => {
                const fields = findPlaceholders(product, localizeCatalogImage, CATALOG_IMAGE_PLACEHOLDER);
                return fields.length ? { ...label(product), fields } : null;
            }).filter(Boolean);
            sources.push({ source: 'live', origin: `Firestore ${FIRESTORE_PROJECT}`, scanned: live.length, missing });
        } catch (err) {
            sources.push({ source: 'live', origin: `Firestore ${FIRESTORE_PROJECT}`, scanned: 0, missing: [], error: err.message });
        }
    }

    const totalMissing = sources.reduce((sum, entry) => sum + entry.missing.length, 0);
    const totalFields = sources.reduce((sum, entry) => sum + entry.missing.reduce((n, product) => n + product.fields.length, 0), 0);

    // The live catalogue is only "checked" if we actually read it. Under
    // --strict an unreadable live source fails the gate (fail-closed).
    const liveSource = sources.find((entry) => entry.source === 'live');
    const liveUnavailable = OFFLINE || Boolean(liveSource && liveSource.error);
    const failed = totalMissing > 0 || (STRICT && liveUnavailable);

    if (AS_JSON) {
        console.log(JSON.stringify({ placeholder: CATALOG_IMAGE_PLACEHOLDER, sources, totalMissing, totalFields, liveChecked: !liveUnavailable, strict: STRICT, failed }, null, 2));
        // Set the code and return rather than process.exit(): abrupt exit while
        // the fetch sockets are closing trips a libuv assertion on Windows.
        process.exitCode = failed ? 1 : 0;
        return;
    }

    console.log(`Placeholder report — ${CATALOG_IMAGE_PLACEHOLDER}\n`);
    for (const entry of sources) {
        const status = entry.error ? `unavailable (${entry.error})` : `${entry.missing.length}/${entry.scanned} product(s)`;
        console.log(`── ${entry.source} — ${entry.origin}`);
        console.log(`   ${status}`);
        if (!QUIET) {
            for (const product of entry.missing) {
                console.log(`   • ${product.id}  —  ${product.name}`);
                for (const field of product.fields) {
                    console.log(`       ${field.field}: ${field.url}`);
                }
            }
        }
        console.log('');
    }

    if (totalMissing === 0 && !liveUnavailable) {
        console.log('✓ Every catalogue image resolves to local art.');
    } else if (totalMissing === 0) {
        console.log('! No placeholders found, but the live catalogue could not be read — unverified.');
    } else {
        console.log(`✗ ${totalFields} image field(s) across ${totalMissing} product(s) fall back to the placeholder.`);
    }
    if (STRICT && liveUnavailable) {
        console.log('✗ --strict: the live catalogue could not be read, so the gate cannot pass.');
    }

    process.exitCode = failed ? 1 : 0;
})().catch((err) => {
    console.error(`✗ Placeholder report failed: ${err && err.message}`);
    if (process.env.DEBUG) console.error(err);
    process.exitCode = 1;
});
