#!/usr/bin/env node
// Prepare the Instagram rollout manifest for the Backdoor Asset Studio.
//
// Reads admin/instagram-rollout.json, validates every asset against the studio's
// real vocabulary (templates / themes / ratios / fonts), resolves each asset's
// product against the catalogue, and generates the caption via the same
// admin/social-copy.mjs module the live studio imports — so the prepared copy
// can never drift from what the studio renders.
//
// Usage:
//   node scripts/prepare-instagram-rollout.js            # validate only (default)
//   node scripts/prepare-instagram-rollout.js --write    # also write the prepared file
//   node scripts/prepare-instagram-rollout.js --json     # machine-readable report
//   node scripts/prepare-instagram-rollout.js --offline  # seeded catalogue only (deterministic)
//   node scripts/prepare-instagram-rollout.js --manifest <path>  # validate a different manifest
//   node scripts/prepare-instagram-rollout.js --out <path>  # write the prepared file elsewhere
//
// --out keeps a prepared file alongside its manifest instead of overwriting
// admin/instagram-rollout.prepared.json — e.g. preparing the generated rollout
// for preview in the studio without disturbing the curated launch campaign.
//
// Exits 1 when any asset fails validation, so it can gate a build.
//
// The catalogue resolver mirrors the studio's setProducts(): live Firestore
// documents merged over SEEDED_PRODUCTS via mergeCatalogProducts(), hidden and
// inactive products removed. Pass --offline (as the npm scripts do) to keep the
// prepared output deterministic and independent of the live catalogue.

'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

function argValue(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : '';
}

const MANIFEST_PATH = path.resolve(ROOT, argValue('--manifest') || path.join('admin', 'instagram-rollout.json'));
const PREPARED_PATH = path.resolve(ROOT, argValue('--out') || path.join('admin', 'instagram-rollout.prepared.json'));
const CATALOG_DIR = path.join(ROOT, 'products', 'catalog');

const FIRESTORE_PROJECT = process.env.FIRESTORE_PROJECT || 'coalition-aec44';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw';
const FIRESTORE_PAGE_SIZE = 300;

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const AS_JSON = args.has('--json');
const OFFLINE = args.has('--offline');

// ── Studio vocabulary ───────────────────────────────────────────────────────
// Must match the <select> options in admin/social.html and the branches in
// admin/social.js. A manifest that drifts from the studio fails here.
const TEMPLATES = new Set(['drop', 'story', 'sale', 'restock', 'collage', 'holiday', 'teaser', 'flash']);
const PRODUCT_OPTIONAL = new Set(['collage', 'teaser']);
const THEMES = new Set(['backdoor', 'mono', 'white', 'volt', 'red', 'holiday', 'teaser']);
const FONTS = new Set(['space-grotesk', 'inter', 'bebas', 'playfair', 'oswald', 'poppins']);
const RATIOS = {
    '1-1': { width: 1080, height: 1080 },
    '9-16': { width: 1080, height: 1920 },
    '16-9': { width: 1200, height: 675 },
};

// Mirrors the `presets` map in admin/social.js. A manifest asset may name one to
// seed template / ratio / theme / copy defaults; explicit fields win.
const PRESETS = {
    drop: { template: 'drop', ratio: '1-1', theme: 'backdoor', kicker: 'NEW DROP', badge: 'AVAILABLE NOW', cta: 'SHOP BACKDOOR', showPrice: true, showSizes: true, visitSite: false },
    story: { template: 'story', ratio: '9-16', theme: 'backdoor', kicker: 'BACKDOOR DROP', badge: 'TAP TO SHOP', cta: 'SHOP NOW', showPrice: true, showSizes: true, visitSite: false },
    sale: { template: 'sale', ratio: '1-1', theme: 'red', kicker: 'LIMITED OFFER', badge: 'PRICE DROP', cta: 'SHOP THE SALE', showPrice: true, showSizes: false, visitSite: false },
    restock: { template: 'restock', ratio: '1-1', theme: 'mono', kicker: 'RESTOCK ALERT', badge: 'BACK IN', cta: 'SECURE YOUR SIZE', showPrice: true, showSizes: true, visitSite: false },
    collage: { template: 'collage', ratio: '1-1', theme: 'white', kicker: 'NEW ARRIVALS', badge: 'TOP 4', cta: 'SHOP THE DROP', showPrice: true, showSizes: false, visitSite: false },
    holiday: { template: 'holiday', ratio: '1-1', theme: 'holiday', kicker: 'HOLIDAY DROP', badge: 'LIMITED', cta: 'SHOP THE SEASON', showPrice: true, showSizes: true, visitSite: false },
    teaser: { template: 'teaser', ratio: '1-1', theme: 'teaser', kicker: 'COMING SOON', badge: 'COLLAB', cta: 'SIGN UP', showPrice: false, showSizes: false, visitSite: true },
    flash: { template: 'flash', ratio: '1-1', theme: 'red', kicker: 'FLASH SALE', badge: '24H ONLY', cta: 'SHOP NOW', showPrice: true, showSizes: false, visitSite: false },
};

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
// (same pattern as scripts/report-placeholder-images.js). social-copy.mjs and
// localize-image.mjs are already ESM and import directly.
async function loadModules() {
    const tmpPath = path.join(ROOT, '.product-data.rollout-tmp.mjs');
    fs.copyFileSync(path.join(ROOT, 'product-data.js'), tmpPath);
    let productData;
    try {
        productData = await import(pathToFileURL(tmpPath).href);
    } finally {
        fs.rmSync(tmpPath, { force: true });
    }
    const copy = await import(pathToFileURL(path.join(ROOT, 'admin', 'social-copy.mjs')).href);
    const localize = await import(pathToFileURL(path.join(CATALOG_DIR, 'localize-image.mjs')).href);
    return { productData, copy, localize };
}

// ── Resolution ──────────────────────────────────────────────────────────────
function coerceString(value) {
    return value == null ? '' : String(value);
}

function resolveCopy(asset, preset) {
    const copy = asset.copy || {};
    const pick = (key, fallback) => (copy[key] != null ? copy[key] : fallback);
    return {
        kicker: coerceString(pick('kicker', preset?.kicker)),
        headline: coerceString(pick('headline', '')),
        body: coerceString(pick('body', '')),
        badge: coerceString(pick('badge', preset?.badge)),
        cta: coerceString(pick('cta', preset?.cta)),
        promo: coerceString(pick('promo', '')),
    };
}

function resolveToggles(asset, preset) {
    const toggles = asset.toggles || {};
    const pick = (key, fallback) => (toggles[key] != null ? toggles[key] : fallback);
    return {
        showPrice: Boolean(pick('showPrice', preset?.showPrice ?? true)),
        showSizes: Boolean(pick('showSizes', preset?.showSizes ?? true)),
        visitSite: Boolean(pick('visitSite', preset?.visitSite ?? false)),
        visitSiteUrl: coerceString(pick('visitSiteUrl', '')),
    };
}

function resolveAsset(asset, ctx) {
    const { index, manifest, catalogue, byId, modules } = ctx;
    const { productData, copy: copyLib, localize } = modules;
    const id = coerceString(asset.id) || `asset-${index + 1}`;
    const errors = [];
    const warnings = [];

    if (!coerceString(asset.id)) errors.push(`asset[${index}] is missing an "id"`);

    const presetName = asset.preset ? coerceString(asset.preset) : '';
    const preset = presetName ? PRESETS[presetName] : null;
    if (presetName && !preset) errors.push(`[${id}] unknown preset "${presetName}" (expected one of: ${Object.keys(PRESETS).join(', ')})`);

    const template = coerceString(asset.template) || preset?.template || '';
    const ratio = coerceString(asset.ratio) || preset?.ratio || '';
    const theme = coerceString(asset.theme) || preset?.theme || '';
    const font = coerceString(asset.font) || coerceString(manifest.defaults?.font) || 'space-grotesk';
    const fontWeight = coerceString(asset.fontWeight) || coerceString(manifest.defaults?.fontWeight) || '900';

    if (!TEMPLATES.has(template)) errors.push(`[${id}] unknown template "${template}" (expected one of: ${[...TEMPLATES].join(', ')})`);
    if (!THEMES.has(theme)) errors.push(`[${id}] unknown theme "${theme}" (expected one of: ${[...THEMES].join(', ')})`);
    if (!RATIOS[ratio]) errors.push(`[${id}] unknown ratio "${ratio}" (expected one of: ${Object.keys(RATIOS).join(', ')})`);
    if (!FONTS.has(font)) errors.push(`[${id}] unknown font "${font}" (expected one of: ${[...FONTS].join(', ')})`);

    // Product resolution.
    const productRef = coerceString(asset.productRef);
    let product = null;
    if (productRef) {
        product = byId.get(productRef) || null;
        if (!product) errors.push(`[${id}] productRef "${productRef}" is not in the catalogue (or is hidden/inactive)`);
    } else if (!PRODUCT_OPTIONAL.has(template)) {
        errors.push(`[${id}] template "${template}" requires a productRef`);
    }

    // Image override must not introduce a third-party hotlink.
    const imageOverride = coerceString(asset.imageOverride);
    if (imageOverride && localize.localizeCatalogImage(imageOverride) === localize.CATALOG_IMAGE_PLACEHOLDER) {
        errors.push(`[${id}] imageOverride "${imageOverride}" is not a mirrored/first-party image`);
    }

    const resolvedCopy = resolveCopy(asset, preset);
    if (!resolvedCopy.headline) errors.push(`[${id}] copy.headline is required`);

    const toggles = resolveToggles(asset, preset);

    // Media: override wins, else the product card image (same precedence as the studio).
    let imageUrl = '';
    if (imageOverride) {
        imageUrl = localize.localizeCatalogImage(imageOverride);
    } else if (product) {
        imageUrl = localize.localizeCatalogImage(productData.getProductCardImage(product));
    }

    const productUrl = product ? `${manifest.siteOrigin}/${productData.buildProductHref(product)}` : coerceString(manifest.siteOrigin);

    // Collage recap uses the studio's lineup: the active product first, then the
    // next three by recency (offline: the manifest-selected product, else the top item).
    const active = product || catalogue[0] || null;
    const collage = [];
    if (template === 'collage' && active) {
        collage.push(active);
        for (const candidate of catalogue) {
            if (collage.length >= 4) break;
            if (!collage.some((entry) => entry.id === candidate.id)) collage.push(candidate);
        }
    }

    const caption = copyLib.buildCaption({
        template,
        fields: resolvedCopy,
        product,
        origin: coerceString(manifest.siteOrigin),
        handle: coerceString(manifest.handle),
        productUrl,
        collage: collage.map((entry) => ({ name: entry.name, price: entry.price })),
    });

    // Matches the studio export naming: backdoor_<template>_<product-slug>.png.
    // The studio always has an active product selected, so a product-optional
    // template is still named by that product rather than a bare "asset" slug.
    const namingProduct = product || (PRODUCT_OPTIONAL.has(template) ? catalogue[0] : null);
    const filename = coerceString(asset.filename) || `backdoor_${template || 'asset'}_${copyLib.slugify(namingProduct?.name || 'asset')}.png`;

    const postAt = coerceString(asset.schedule?.postAt);
    if (postAt) {
        const when = new Date(postAt);
        if (Number.isNaN(when.getTime())) errors.push(`[${id}] schedule.postAt "${postAt}" is not a valid date`);
        else if (when.getTime() < Date.now()) warnings.push(`[${id}] schedule.postAt "${postAt}" is in the past`);
    }

    const order = Number.isFinite(asset.schedule?.order) ? asset.schedule.order : index + 1;

    return {
        errors,
        warnings,
        resolved: {
            id,
            order,
            preset: presetName || null,
            carouselGroup: coerceString(asset.carouselGroup) || null,
            template,
            ratio,
            theme,
            font,
            fontWeight,
            dimensions: RATIOS[ratio] || null,
            product: product
                ? {
                    id: String(product.id),
                    name: coerceString(product.name),
                    brand: coerceString(product.brand),
                    category: coerceString(product.category),
                    price: Number(product.price) || 0,
                }
                : null,
            copy: resolvedCopy,
            toggles,
            effects: {
                imageFilter: coerceString(asset.effects?.imageFilter) || coerceString(manifest.defaults?.imageFilter) || 'none',
                blur: asset.effects?.blur ?? Boolean(manifest.defaults?.blur),
                watermark: asset.effects?.watermark ?? Boolean(manifest.defaults?.watermark),
                grain: asset.effects?.grain ?? (Number(manifest.defaults?.grain) || 0),
            },
            imageUrl,
            imageOverride,
            productUrl,
            caption,
            hashtags: copyLib.captionTags(template, product),
            filename,
            schedule: postAt ? { order, postAt } : { order, postAt: null },
        },
    };
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
    const errors = [];
    const warnings = [];
    let manifest;

    try {
        manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (err) {
        console.error(`Could not read ${path.relative(ROOT, MANIFEST_PATH)}: ${err.message}`);
        process.exitCode = 1;
        return;
    }

    const modules = await loadModules();
    const { productData } = modules;

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
    const byId = new Map(catalogue.map((product) => [String(product.id), product]));

    const seenIds = new Set();
    const seenFilenames = new Set();
    const assets = [];

    (manifest.assets || []).forEach((asset, index) => {
        const result = resolveAsset(asset, { index, manifest, catalogue, byId, modules });
        errors.push(...result.errors);
        warnings.push(...result.warnings);

        const { resolved } = result;
        if (seenIds.has(resolved.id)) errors.push(`[${resolved.id}] duplicate asset id`);
        seenIds.add(resolved.id);
        if (seenFilenames.has(resolved.filename)) errors.push(`[${resolved.id}] duplicate export filename "${resolved.filename}"`);
        seenFilenames.add(resolved.filename);
        assets.push(resolved);
    });

    assets.sort((a, b) => a.order - b.order);

    const prepared = {
        brand: coerceString(manifest.brand),
        handle: coerceString(manifest.handle),
        siteOrigin: coerceString(manifest.siteOrigin),
        campaign: coerceString(manifest.campaign),
        defaults: manifest.defaults || {},
        counts: {
            assets: assets.length,
            templates: [...new Set(assets.map((asset) => asset.template))].sort(),
            carousels: [...new Set(assets.map((asset) => asset.carouselGroup).filter(Boolean))],
        },
        assets: assets.map((asset) => ({
            id: asset.id,
            order: asset.order,
            preset: asset.preset,
            carouselGroup: asset.carouselGroup,
            template: asset.template,
            ratio: asset.ratio,
            theme: asset.theme,
            font: asset.font,
            fontWeight: asset.fontWeight,
            dimensions: asset.dimensions,
            product: asset.product,
            copy: asset.copy,
            toggles: asset.toggles,
            effects: asset.effects,
            imageUrl: asset.imageUrl,
            imageOverride: asset.imageOverride,
            productUrl: asset.productUrl,
            caption: asset.caption,
            hashtags: asset.hashtags,
            filename: asset.filename,
            schedule: asset.schedule,
        })),
    };

    const failed = errors.length > 0;

    if (AS_JSON) {
        console.log(JSON.stringify({ ok: !failed, errors, warnings, prepared }, null, 2));
    } else {
        console.log(failed ? '✗ Instagram rollout validation failed' : '✓ Instagram rollout is valid');
        console.log(`  manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
        console.log(`  assets:   ${assets.length} across ${prepared.counts.templates.length} templates${OFFLINE ? ' (offline)' : ''}`);
        if (prepared.counts.carousels.length) console.log(`  carousels: ${prepared.counts.carousels.join(', ')}`);
        for (const warning of warnings) console.log(`  ! ${warning}`);
        for (const error of errors) console.log(`  ✗ ${error}`);
        if (WRITE && !failed) {
            fs.writeFileSync(PREPARED_PATH, JSON.stringify(prepared, null, 2) + '\n');
            console.log(`  wrote ${path.relative(ROOT, PREPARED_PATH)}`);
        } else if (WRITE && failed) {
            console.log('  not writing prepared file (validation failed)');
        }
    }

    // Set the code and return rather than process.exit(): abrupt exit while the
    // fetch sockets are closing trips a libuv assertion on Windows.
    process.exitCode = failed ? 1 : 0;
})();
