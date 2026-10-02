#!/usr/bin/env node
// Generate the Instagram rollout manifest from the live Backdoor catalogue.
//
// Instead of hand-authoring the asset list, this script reads the same catalogue
// the storefront renders (live Firestore merged over SEEDED_PRODUCTS), picks out
// the products worth posting about, and emits a manifest in the exact shape that
// scripts/prepare-instagram-rollout.js validates and prepares:
//
//   generator ──▶ admin/instagram-rollout.generated.json
//              ──▶ scripts/prepare-instagram-rollout.js --manifest <that file>
//              ──▶ admin/instagram-rollout.prepared.json ──▶ Asset Studio
//
// Selection signals (each bucket is disjoint, so no product is posted twice and
// no export filename can collide):
//   • new arrivals  – newest products by getProductSortTimestamp()  → drop / story
//   • price drops   – retailPrice above price, steepest discount    → sale
//   • low stock     – in-stock with getTotalStock() <= threshold    → restock
//   • spotlight     – next products by recency                      → carousel
// plus a collage recap of the new arrivals and an optional weekly carousel.
//
// Usage:
//   node scripts/generate-instagram-rollout.js             # dry run: report only
//   node scripts/generate-instagram-rollout.js --write     # write the manifest
//   node scripts/generate-instagram-rollout.js --json       # machine-readable
//   node scripts/generate-instagram-rollout.js --offline    # seeded catalogue only
//   node scripts/generate-instagram-rollout.js --out <path> # alternate output path
//
// Tunables: --new <n> --sale <n> --low <n> --low-stock-max <n> --carousel <n>
//           --no-carousel --campaign <name> --handle <@name> --site <origin>
//
// Offline generation is deterministic (no timestamps are embedded), so the
// committed generated manifest can be drift-checked in CI exactly like the
// prepared file.

'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);

function flagValue(flag, fallback = '') {
    const index = args.indexOf(flag);
    return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

function intFlag(flag, fallback) {
    const parsed = Number.parseInt(flagValue(flag, ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const OFFLINE = args.includes('--offline');
const WRITE = args.includes('--write');
const AS_JSON = args.includes('--json');
const NO_CAROUSEL = args.includes('--no-carousel');
const HELP = args.includes('--help') || args.includes('-h');

const OUT_PATH = path.resolve(ROOT, flagValue('--out', path.join('admin', 'instagram-rollout.generated.json')));
const CAMPAIGN = flagValue('--campaign', 'Weekly Drop');
const BRAND = flagValue('--brand', 'Backdoor');
const HANDLE = flagValue('--handle', '@backdoorco');
const SITE_ORIGIN = flagValue('--site', 'https://backdoorco.vercel.app');

const NEW_COUNT = Math.max(1, intFlag('--new', 4));
const SALE_COUNT = Math.max(0, intFlag('--sale', 3));
const LOW_COUNT = Math.max(0, intFlag('--low', 2));
const LOW_STOCK_MAX = Math.max(0, intFlag('--low-stock-max', 4));
const CAROUSEL_SLIDES = Math.max(0, intFlag('--carousel', 2));

const DEFAULT_DEFAULTS = {
    font: 'space-grotesk',
    fontWeight: '900',
    imageFilter: 'none',
    blur: false,
    watermark: false,
    grain: 16,
};

const FIRESTORE_PROJECT = process.env.FIRESTORE_PROJECT || 'coalition-aec44';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw';
const FIRESTORE_PAGE_SIZE = 300;

const USAGE = `Generate the Instagram rollout manifest from the live catalogue.

  node scripts/generate-instagram-rollout.js [options]

  --write              write the manifest (default: report only)
  --out <path>         output path (default: admin/instagram-rollout.generated.json)
  --offline            use the seeded catalogue only (deterministic)
  --json               emit a machine-readable report
  --new <n>            new arrivals to select (default 4)
  --sale <n>           price drops to select (default 3)
  --low <n>            low-stock products to select (default 2)
  --low-stock-max <n>  low-stock threshold, total units (default 4)
  --carousel <n>       carousel spotlight slides after the cover (default 2)
  --no-carousel        omit the weekly carousel group
  --campaign <name>    campaign label (default "Weekly Drop")
  --brand <name>       brand label (default "Backdoor")
  --handle <@name>     social handle (default "@backdoorco")
  --site <origin>      canonical site origin
  --help               show this help`;

// ── Firestore value decoding (only the types product docs use) ───────────────
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
            if (!product.id) product.id = decodeURIComponent(String(doc.name || '').split('/').pop() || '');
            products.push(product);
        }

        pageToken = payload.nextPageToken || '';
        pages += 1;
    } while (pageToken && pages < 20);

    return products;
}

// ── Modules ─────────────────────────────────────────────────────────────────
// product-data.js is ESM in a CommonJS package; import a throwaway .mjs copy
// (same pattern as scripts/prepare-instagram-rollout.js). social-copy.mjs is
// already ESM and imports directly.
async function loadModules() {
    const tmpPath = path.join(ROOT, '.product-data.generate-tmp.mjs');
    fs.copyFileSync(path.join(ROOT, 'product-data.js'), tmpPath);
    let productData;
    try {
        productData = await import(pathToFileURL(tmpPath).href);
    } finally {
        fs.rmSync(tmpPath, { force: true });
    }
    const copy = await import(pathToFileURL(path.join(ROOT, 'admin', 'social-copy.mjs')).href);
    return { productData, copy };
}

// ── Selection ───────────────────────────────────────────────────────────────
function discountOf(product) {
    const price = Number(product?.price) || 0;
    const retail = Number(product?.retailPrice) || 0;
    if (price <= 0 || retail <= 0 || retail <= price) return null;
    const amount = retail - price;
    return { amount, pct: amount / retail, retail, price };
}

function isShoppable(productData, product) {
    return !productData.isHidden(product)
        && product.status !== 'inactive'
        && !productData.isOutOfStock(product)
        && productData.hasInStockSizes(product);
}

function selectBuckets(productData, catalogue) {
    const idOf = (product) => String(product.id);
    const seen = new Set();
    const take = (list, count) => {
        const picked = [];
        for (const product of list) {
            if (picked.length >= count) break;
            if (seen.has(idOf(product))) continue;
            seen.add(idOf(product));
            picked.push(product);
        }
        return picked;
    };

    const byRecency = [...catalogue].sort(
        (a, b) => productData.getProductSortTimestamp(b) - productData.getProductSortTimestamp(a)
    );

    const newArrivals = take(byRecency, NEW_COUNT);

    const priceDrops = take(
        byRecency
            .filter((product) => discountOf(product))
            .sort((a, b) => (discountOf(b).pct - discountOf(a).pct)
                || (productData.getProductSortTimestamp(b) - productData.getProductSortTimestamp(a))),
        SALE_COUNT
    );

    const lowStock = take(
        byRecency
            .filter((product) => isShoppable(productData, product) && productData.getTotalStock(product) <= LOW_STOCK_MAX)
            .sort((a, b) => (productData.getTotalStock(a) - productData.getTotalStock(b))
                || (productData.getProductSortTimestamp(b) - productData.getProductSortTimestamp(a))),
        LOW_COUNT
    );

    const carouselEnabled = !NO_CAROUSEL && CAROUSEL_SLIDES > 0;
    const spotlight = carouselEnabled ? take(byRecency, CAROUSEL_SLIDES) : [];

    return { newArrivals, priceDrops, lowStock, spotlight };
}

// ── Copy ────────────────────────────────────────────────────────────────────
function tagline(product) {
    const parts = [];
    if (product.brand) parts.push(String(product.brand));
    const flavor = product.colorway || product.category;
    if (flavor) parts.push(String(flavor));
    return parts.join(' / ') || String(product.name || 'Backdoor');
}

function productSlug(copy, product) {
    return copy.slugify(String(product.id || product.name || 'asset').replace(/^seed-/, ''));
}

function assetFor(copy, { id, product, preset, headline, body, filename, carouselGroup, badge, promo }) {
    const asset = { id, preset };
    if (product) asset.productRef = String(product.id);
    asset.copy = { headline: headline || String(product?.name || 'New at Backdoor'), body };
    if (badge != null) asset.copy.badge = badge;
    if (promo != null) asset.copy.promo = promo;
    if (carouselGroup) asset.carouselGroup = carouselGroup;
    if (filename) asset.filename = filename;
    return asset;
}

function buildAssets(copy, productData, buckets) {
    const { newArrivals, priceDrops, lowStock, spotlight } = buckets;
    const assets = [];
    const carouselGroup = 'weekly-lineup';
    const carouselTotal = 1 + spotlight.length;

    // Products that share a name (e.g. two colorways of the same silhouette) get
    // their colorway folded into the headline so the cards stay distinguishable.
    const selected = [...newArrivals, ...priceDrops, ...lowStock, ...spotlight];
    const nameCounts = new Map();
    for (const product of selected) {
        const name = String(product.name || '');
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    const headlineFor = (product) => {
        const name = String(product.name || 'New at Backdoor');
        if ((nameCounts.get(name) || 0) > 1 && product.colorway) return `${name} — ${product.colorway}`;
        return name;
    };

    // Hero story for the newest arrival (portrait, 9-16 via the story preset).
    if (newArrivals[0]) {
        const product = newArrivals[0];
        assets.push(assetFor(copy, {
            id: `gen-story-${productSlug(copy, product)}`,
            product,
            preset: 'story',
            headline: headlineFor(product),
            body: `${tagline(product)}. Tap to shop.`,
            filename: `backdoor_story_${productSlug(copy, product)}.png`,
        }));
    }

    // One drop card per new arrival.
    for (const product of newArrivals) {
        assets.push(assetFor(copy, {
            id: `gen-drop-${productSlug(copy, product)}`,
            product,
            preset: 'drop',
            headline: headlineFor(product),
            body: `${tagline(product)}. Available now at Backdoor.`,
            filename: `backdoor_drop_${productSlug(copy, product)}.png`,
        }));
    }

    // Price-drop sale cards, promo code derived from the discount.
    for (const product of priceDrops) {
        const discount = discountOf(product);
        const pct = Math.max(1, Math.round(discount.pct * 100));
        assets.push(assetFor(copy, {
            id: `gen-sale-${productSlug(copy, product)}`,
            product,
            preset: 'sale',
            headline: headlineFor(product),
            body: `${tagline(product)}. Marked down ${pct}% while stock lasts.`,
            promo: `DROP${pct}`,
            filename: `backdoor_sale_${productSlug(copy, product)}.png`,
        }));
    }

    // Restock cards for low-stock products.
    for (const product of lowStock) {
        const units = productData.getTotalStock(product);
        assets.push(assetFor(copy, {
            id: `gen-restock-${productSlug(copy, product)}`,
            product,
            preset: 'restock',
            headline: headlineFor(product),
            body: `${tagline(product)}. Back on the shelf — ${units} left.`,
            filename: `backdoor_restock_${productSlug(copy, product)}.png`,
        }));
    }

    // Collage recap of the new arrivals (product-less template, explicit filename).
    if (newArrivals.length) {
        assets.push(assetFor(copy, {
            id: 'gen-collage-new-arrivals',
            preset: 'collage',
            headline: 'New Arrivals',
            body: `The ${newArrivals.length} newest pairs on the shelf right now.`,
            filename: 'backdoor_collage_new_arrivals.png',
        }));
    }

    // Weekly carousel: a collage cover plus drop slides on spotlight products.
    if (carouselTotal > 1) {
        assets.push(assetFor(copy, {
            id: 'gen-carousel-cover',
            preset: 'collage',
            carouselGroup,
            headline: 'This Week At Backdoor',
            body: `Swipe this week's lineup — ${carouselTotal} slides deep.`,
            badge: `1 / ${carouselTotal}`,
            filename: 'backdoor_collage_weekly_lineup.png',
        }));
        spotlight.forEach((product, index) => {
            assets.push(assetFor(copy, {
                id: `gen-carousel-${productSlug(copy, product)}`,
                product,
                preset: 'drop',
                carouselGroup,
                headline: headlineFor(product),
                body: `${tagline(product)}. Slide ${index + 2} of ${carouselTotal} in this week's lineup.`,
                badge: `${index + 2} / ${carouselTotal}`,
                filename: `backdoor_carousel_${productSlug(copy, product)}.png`,
            }));
        });
    }

    return assets;
}

function buildManifest(productData, copy, buckets) {
    const assets = buildAssets(copy, productData, buckets).map((asset, index) => ({
        ...asset,
        schedule: { order: index + 1, postAt: null },
    }));

    return {
        brand: BRAND,
        handle: HANDLE,
        siteOrigin: SITE_ORIGIN,
        campaign: CAMPAIGN,
        generatedBy: 'scripts/generate-instagram-rollout.js',
        defaults: { ...DEFAULT_DEFAULTS },
        assets,
    };
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
    if (HELP) {
        console.log(USAGE);
        return;
    }

    const warnings = [];
    const { productData, copy } = await loadModules();

    let live = [];
    if (!OFFLINE) {
        try {
            live = await fetchFirestoreProducts();
        } catch (err) {
            warnings.push(`live catalogue unavailable (${err.message}); using seeded catalogue`);
        }
    }

    const catalogue = productData.mergeCatalogProducts(live)
        .filter((product) => !productData.isHidden(product) && product.status !== 'inactive')
        .sort((a, b) => productData.getProductSortTimestamp(b) - productData.getProductSortTimestamp(a));

    if (catalogue.length === 0) {
        console.error('No products in the catalogue; nothing to generate.');
        process.exitCode = 1;
        return;
    }

    const buckets = selectBuckets(productData, catalogue);

    if (!buckets.newArrivals.length) {
        console.error('No new arrivals found; nothing to generate.');
        process.exitCode = 1;
        return;
    }
    if (SALE_COUNT > 0 && !buckets.priceDrops.length) {
        warnings.push('no price drops found (retailPrice above price); sale cards skipped');
    }
    if (LOW_COUNT > 0 && !buckets.lowStock.length) {
        warnings.push(`no low-stock products found at or below ${LOW_STOCK_MAX} units; restock cards skipped`);
    }
    if (!NO_CAROUSEL && CAROUSEL_SLIDES > 0 && !buckets.spotlight.length) {
        warnings.push('no spotlight products left for the carousel; carousel skipped');
    }

    const manifest = buildManifest(productData, copy, buckets);
    const report = {
        mode: OFFLINE ? 'offline' : 'live',
        catalogue: catalogue.length,
        counts: {
            assets: manifest.assets.length,
            newArrivals: buckets.newArrivals.length,
            priceDrops: buckets.priceDrops.length,
            lowStock: buckets.lowStock.length,
            spotlight: buckets.spotlight.length,
        },
        newArrivals: buckets.newArrivals.map((product) => String(product.id)),
        priceDrops: buckets.priceDrops.map((product) => ({
            id: String(product.id),
            retail: discountOf(product).retail,
            price: discountOf(product).price,
        })),
        lowStock: buckets.lowStock.map((product) => ({ id: String(product.id), units: productData.getTotalStock(product) })),
        spotlight: buckets.spotlight.map((product) => String(product.id)),
    };

    let written = null;
    if (WRITE) {
        fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + '\n');
        written = path.relative(ROOT, OUT_PATH);
    }

    if (AS_JSON) {
        console.log(JSON.stringify({ ok: true, warnings, report, written, manifest }, null, 2));
        return;
    }

    console.log('✓ Generated Instagram rollout manifest');
    console.log(`  catalogue:   ${report.catalogue} products (${report.mode})`);
    console.log(`  new arrivals ${report.counts.newArrivals}: ${report.newArrivals.join(', ') || '—'}`);
    console.log(`  price drops  ${report.counts.priceDrops}: ${report.priceDrops.map((entry) => `${entry.id} (-$${entry.retail - entry.price})`).join(', ') || '—'}`);
    console.log(`  low stock    ${report.counts.lowStock}: ${report.lowStock.map((entry) => `${entry.id} (${entry.units}u)`).join(', ') || '—'}`);
    console.log(`  spotlight    ${report.counts.spotlight}: ${report.spotlight.join(', ') || '—'}`);
    console.log(`  assets:      ${report.counts.assets}`);
    for (const warning of warnings) console.log(`  ! ${warning}`);

    if (written) {
        console.log(`  wrote ${written}`);
    } else {
        console.log('  (dry run — pass --write to save the manifest)');
    }

    // Set the code and return rather than process.exit(): abrupt exit while the
    // fetch sockets are closing trips a libuv assertion on Windows.
    process.exitCode = 0;
})();
