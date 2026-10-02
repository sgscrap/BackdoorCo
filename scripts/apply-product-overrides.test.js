// Integration tests for product-data.js — the whole path from a raw product
// document (as stored in Firestore or in SEEDED_PRODUCTS) to the image fields
// the storefront actually renders (image / cardImage / images).
//
// Run: node scripts/apply-product-overrides.test.js   (or `npm test`)
//
// product-data.js is authored as an ES module but lives in a CommonJS package
// ("type": "commonjs"), so Node refuses to import it directly. Rather than
// duplicating the logic here, the test copies the shipped module to a temporary
// .mjs and imports that — the real code, just with an extension Node accepts.
// Its only relative import resolves against the repo root, which is where the
// copy lives, so nothing else has to change.

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// ── tiny async harness (same shape as the sibling tests) ───────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, body) {
  try {
    await body();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  FAIL  ${name}\n        ${err && err.message}`);
  }
}

const ROOT = path.join(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'products', 'catalog');
const DEAD_REMOTE = 'https://unmirrored-dead-cdn.example.com/nope.jpg';

(async () => {
  const productDataPath = path.join(ROOT, 'product-data.js');
  const tmpPath = path.join(ROOT, '.product-data.test-tmp.mjs');
  fs.copyFileSync(productDataPath, tmpPath);

  let mod;
  try {
    mod = await import(pathToFileURL(tmpPath).href);
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }

  const {
    applyProductOverrides,
    getSeededProducts,
    mergeCatalogProducts,
    getProductImages,
    getProductCardImage,
    BLACK_CAT_IMAGES,
    OFF_WHITE_AF1_TEN_IMAGES,
  } = mod;

  const { localizeCatalogImage, CATALOG_IMAGE_PLACEHOLDER } =
    await import(pathToFileURL(path.join(CATALOG_DIR, 'localize-image.mjs')).href);
  const { REMOTE_IMAGE_ALIASES } = await import(pathToFileURL(path.join(CATALOG_DIR, 'aliases.mjs')).href);

  const isRemote = (value) => /^https?:\/\//i.test(String(value || ''));

  // ── seeded catalogue ─────────────────────────────────────────────────────
  await test('getSeededProducts renders every image field locally', () => {
    const products = getSeededProducts();
    assert.ok(products.length > 0, 'no seeded products');
    for (const product of products) {
      assert.ok(!isRemote(product.image), `${product.id} image is still remote: ${product.image}`);
      assert.ok(!isRemote(product.cardImage), `${product.id} cardImage is still remote: ${product.cardImage}`);
      for (const image of product.images || []) {
        assert.ok(!isRemote(image), `${product.id} has a remote gallery image: ${image}`);
      }
    }
  });

  await test('a relative (already-local) seeded product passes through unchanged', () => {
    const product = getSeededProducts().find((entry) => entry.id === 'seed-off-white-be-right-back-sneakers-light-grey-caramel');
    assert.ok(product, 'the Be Right Back seeded product is missing');
    assert.strictEqual(product.image, 'products/off-white-be-right-back-01.jpg');
    assert.strictEqual(product.cardImage, 'products/off-white-be-right-back-01.jpg');
    assert.ok(product.images.every((image) => !isRemote(image)));
  });

  // ── raw doc → placeholder ────────────────────────────────────────────────
  await test('a raw doc with an unmirrored remote image lands on the placeholder in every field', () => {
    const overridden = applyProductOverrides({
      id: 'raw-dead-image',
      name: 'Dead Image Product',
      category: 'Accessories',
      price: '120',
      image: DEAD_REMOTE,
      cardImage: DEAD_REMOTE,
      images: [DEAD_REMOTE, 'products/catalog/i-imgur-com-rk5baet-dda5e3.jpg'],
    });
    assert.strictEqual(overridden.image, CATALOG_IMAGE_PLACEHOLDER);
    assert.strictEqual(overridden.cardImage, CATALOG_IMAGE_PLACEHOLDER);
    assert.strictEqual(overridden.images[0], CATALOG_IMAGE_PLACEHOLDER);
    // An already-local gallery entry is left alone.
    assert.strictEqual(overridden.images[1], 'products/catalog/i-imgur-com-rk5baet-dda5e3.jpg');
    // Price is coerced by the same pass.
    assert.strictEqual(overridden.price, 120);
  });

  // ── raw doc → mirrored local file ────────────────────────────────────────
  await test('a raw doc with a mirrored remote image resolves to its local file', () => {
    const remote = Object.keys(REMOTE_IMAGE_ALIASES)[0];
    assert.ok(remote, 'the alias map is empty');
    const local = REMOTE_IMAGE_ALIASES[remote];
    const overridden = applyProductOverrides({
      id: 'raw-mirrored-image',
      name: 'Mirrored Image Product',
      category: 'Accessories',
      price: 90,
      image: remote,
      cardImage: `${remote}?action=crop&width=600`,
      images: [remote],
    });
    assert.strictEqual(overridden.image, local);
    assert.strictEqual(overridden.cardImage, local, 'a query-suffixed URL should still resolve');
    assert.deepStrictEqual(overridden.images, [local]);
  });

  // ── read-time gallery overrides ──────────────────────────────────────────
  await test("the Off-White AF1 'The Ten' doc gets the full seeded GOAT gallery", () => {
    const overridden = applyProductOverrides({
      id: 'seed-off-white-nike-air-force-1-low-the-ten',
      name: "Off-White x Nike Air Force 1 Low 'The Ten'",
      category: 'Sneakers',
      price: 4000,
      image: 'products/catalog/goat-com-246778-00-png-a39cf8.png',
      images: ['products/catalog/goat-com-246778-00-png-a39cf8.png'],
    });
    assert.strictEqual(overridden.image, OFF_WHITE_AF1_TEN_IMAGES[0]);
    assert.strictEqual(overridden.cardImage, OFF_WHITE_AF1_TEN_IMAGES[0]);
    assert.deepStrictEqual(overridden.images, [...OFF_WHITE_AF1_TEN_IMAGES]);
    assert.strictEqual(overridden.imageFit, 'contain');
  });

  await test('the Black Cat doc gets the seeded gallery and a 2020 name rewrite', () => {
    const overridden = applyProductOverrides({
      id: 'raw-black-cat',
      name: "Jordan 4 Retro 'Black Cat' 2025",
      category: 'Sneakers',
      price: 500,
      image: DEAD_REMOTE,
      images: [DEAD_REMOTE],
      sizes: [{ size: 'US 10', stock: 3, price: 500 }],
    });
    assert.strictEqual(overridden.image, BLACK_CAT_IMAGES[0]);
    assert.deepStrictEqual(overridden.images, [...BLACK_CAT_IMAGES]);
    assert.ok(overridden.name.includes('2020'), `name was not rewritten: ${overridden.name}`);
    assert.ok(!overridden.name.includes('2025'), `name still contains 2025: ${overridden.name}`);
  });

  // ── merge path ───────────────────────────────────────────────────────────
  await test('mergeCatalogProducts replaces a seeded product by SKU and localises the winner', () => {
    const seeded = getSeededProducts();
    const target = seeded.find((entry) => entry.sku === 'OMIA295S26FAB0010564');
    assert.ok(target, 'the seeded Be Right Back SKU is missing');

    const merged = mergeCatalogProducts([
      {
        id: 'live-off-white-brb',
        name: target.name,
        sku: target.sku,
        category: 'Sneakers',
        price: 360,
        image: DEAD_REMOTE,
        cardImage: DEAD_REMOTE,
        images: [DEAD_REMOTE],
      },
    ]);

    assert.strictEqual(merged.length, seeded.length, 'a SKU match should replace, not add');
    assert.ok(merged.some((entry) => entry.id === 'live-off-white-brb'), 'the live product is missing');
    assert.ok(!merged.some((entry) => entry.id === target.id), 'the seeded product was not replaced');
    const winner = merged.find((entry) => entry.id === 'live-off-white-brb');
    assert.strictEqual(winner.image, CATALOG_IMAGE_PLACEHOLDER);
    assert.strictEqual(winner.cardImage, CATALOG_IMAGE_PLACEHOLDER);
    assert.deepStrictEqual(winner.images, [CATALOG_IMAGE_PLACEHOLDER]);
  });

  // ── derived render fields ────────────────────────────────────────────────
  await test('getProductImages dedupes the localised gallery without losing order', () => {
    const keys = Object.keys(REMOTE_IMAGE_ALIASES).filter((key) => !key.includes('?') && !key.includes('#'));
    const remoteA = keys[0];
    const localA = REMOTE_IMAGE_ALIASES[remoteA];
    // A second, genuinely different local file so the result has two entries.
    const remoteB = keys.find((key) => REMOTE_IMAGE_ALIASES[key] !== localA);
    const localB = REMOTE_IMAGE_ALIASES[remoteB];
    assert.ok(remoteA && remoteB && localA !== localB, 'need two distinct mirrored images');
    const images = getProductImages({
      id: 'dedupe-doc',
      name: 'Dedupe Product',
      category: 'Accessories',
      price: 10,
      image: DEAD_REMOTE,
      // The same mirrored source three ways collapse to one local file.
      images: [remoteA, `${remoteA}?w=600`, `${remoteA}#frag`, remoteB],
    });
    assert.deepStrictEqual(images, [localA, localB]);
  });

  await test('getProductCardImage prefers the localised cardImage and falls back to the gallery', () => {
    const withCard = getProductCardImage({
      id: 'card-doc',
      name: 'Card Product',
      category: 'Accessories',
      price: 10,
      cardImage: DEAD_REMOTE,
      image: DEAD_REMOTE,
    });
    assert.strictEqual(withCard, CATALOG_IMAGE_PLACEHOLDER);

    const withoutCard = getProductCardImage({
      id: 'no-card-doc',
      name: 'No Card Product',
      category: 'Accessories',
      price: 10,
      image: DEAD_REMOTE,
      images: [],
    });
    assert.strictEqual(withoutCard, CATALOG_IMAGE_PLACEHOLDER);
  });

  // ── integrity ────────────────────────────────────────────────────────────
  await test('every value applyProductOverrides can emit is either local or the bundled placeholder', () => {
    const docs = [
      { id: 'a', name: 'A', category: 'Accessories', price: 1, image: DEAD_REMOTE },
      { id: 'b', name: 'B', category: 'Sneakers', price: 1, image: 'products/catalog/i-imgur-com-rk5baet-dda5e3.jpg' },
      {
        id: 'seed-off-white-nike-air-force-1-low-the-ten',
        name: "Off-White x Nike Air Force 1 Low 'The Ten'",
        category: 'Sneakers',
        price: 1,
        image: DEAD_REMOTE,
      },
    ];
    const values = [];
    for (const doc of docs) {
      const overridden = applyProductOverrides(doc);
      values.push(overridden.image, overridden.cardImage, ...(overridden.images || []));
    }
    for (const value of values.filter(Boolean)) {
      assert.ok(!isRemote(value), `a remote URL survived: ${value}`);
      assert.ok(fs.existsSync(path.join(ROOT, value)), `${value} is not a bundled file`);
    }
    assert.ok(fs.existsSync(path.join(ROOT, CATALOG_IMAGE_PLACEHOLDER)), `${CATALOG_IMAGE_PLACEHOLDER} is missing`);
    assert.strictEqual(localizeCatalogImage(DEAD_REMOTE), CATALOG_IMAGE_PLACEHOLDER);
  });

  // ── summary ──────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    for (const { name, err } of failures) console.error(`\n[${name}] ${err.stack || err.message}`);
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
