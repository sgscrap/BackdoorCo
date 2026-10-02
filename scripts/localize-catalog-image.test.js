// Unit tests for products/catalog/localize-image.mjs — the read-time resolver
// that keeps storefront imagery local.
// Run: node scripts/localize-catalog-image.test.js   (or `npm test`)
//
// The resolver is an ES module, so it is pulled in with a dynamic import from
// this CommonJS harness. The alias map and the manual overrides are read from
// disk, so the "mirrored" expectations always match what ships.

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
const asFileUrl = (name) => pathToFileURL(path.join(CATALOG_DIR, name)).href;

(async () => {
  const { localizeCatalogImage, CATALOG_IMAGE_PLACEHOLDER, FIRST_PARTY_IMAGE_HOSTS } = await import(asFileUrl('localize-image.mjs'));
  const { REMOTE_IMAGE_ALIASES } = await import(asFileUrl('aliases.mjs'));
  const manualAliases = require(path.join(CATALOG_DIR, 'aliases.manual.json'));

  const aliasKeys = Object.keys(REMOTE_IMAGE_ALIASES);

  // ── mirrored ────────────────────────────────────────────────────────────
  await test('every mirrored URL resolves to its local file', () => {
    assert.ok(aliasKeys.length > 0, 'the alias map is empty');
    for (const remote of aliasKeys) {
      const local = REMOTE_IMAGE_ALIASES[remote];
      assert.strictEqual(localizeCatalogImage(remote), local, `${remote} should resolve to ${local}`);
      assert.ok(!/^https?:\/\//i.test(local), `${remote} resolved to a remote path (${local})`);
    }
  });

  await test('a query string or hash still resolves through the alias map', () => {
    const clean = aliasKeys.filter((key) => !key.includes('?') && !key.includes('#'));
    assert.ok(clean.length > 0, 'no suffix-free alias keys to test');
    for (const remote of clean.slice(0, 15)) {
      assert.strictEqual(localizeCatalogImage(`${remote}?action=crop&width=600`), REMOTE_IMAGE_ALIASES[remote]);
      assert.strictEqual(localizeCatalogImage(`${remote}#fragment`), REMOTE_IMAGE_ALIASES[remote]);
    }
  });

  await test('manual overrides re-point dead sources at a local file', () => {
    const entries = Object.entries(manualAliases).filter(([key]) => !key.startsWith('_'));
    assert.ok(entries.length > 0, 'no manual overrides found');
    for (const [remote, local] of entries) {
      assert.strictEqual(localizeCatalogImage(remote), local);
      assert.notStrictEqual(localizeCatalogImage(remote), CATALOG_IMAGE_PLACEHOLDER, `${remote} should be re-sourced, not placeholdered`);
    }
  });

  // ── unmirrored ──────────────────────────────────────────────────────────
  await test('unmirrored third-party URLs fall back to the local placeholder', () => {
    const cases = [
      'https://evil-cdn.example.com/pic.jpg',
      'http://some-other-cdn.net/a.png?x=1',
      'https://images.stockx.com/images/definitely-not-mirrored.jpg',
      'HTTPS://UPPER-CASE-CDN.EXAMPLE/X.JPG',
    ];
    for (const url of cases) {
      assert.strictEqual(localizeCatalogImage(url), CATALOG_IMAGE_PLACEHOLDER, `${url} should fall back`);
    }
  });

  // ── first-party ─────────────────────────────────────────────────────────
  await test('first-party hosts are left untouched', () => {
    for (const host of FIRST_PARTY_IMAGE_HOSTS) {
      const url = `https://${host}/product.jpg`;
      assert.strictEqual(localizeCatalogImage(url), url, `${host} should pass through`);
    }
    const subdomain = 'https://cdn.backdoorco.xyz/og.png';
    assert.strictEqual(localizeCatalogImage(subdomain), subdomain);
  });

  // ── data / blob / relative ──────────────────────────────────────────────
  await test('data:, blob: and relative paths pass through unchanged', () => {
    const cases = [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      'blob:https://backdoorco.xyz/8f7c-uuid',
      'products/catalog/i-imgur-com-rk5baet-dda5e3.jpg',
      'products/off-white-be-right-back-01.jpg',
      'i-imgur-com-standalone.jpg',
      '/assets/placeholder.png',
    ];
    for (const value of cases) {
      assert.strictEqual(localizeCatalogImage(value), value, `${value} should pass through`);
    }
  });

  // ── blank ───────────────────────────────────────────────────────────────
  await test('blank input stays blank', () => {
    for (const value of ['', '   ', null, undefined]) {
      assert.strictEqual(localizeCatalogImage(value), '');
    }
  });

  // ── integrity ───────────────────────────────────────────────────────────
  await test('the placeholder points at a real bundled file', () => {
    assert.match(CATALOG_IMAGE_PLACEHOLDER, /^products\/catalog\/[A-Za-z0-9._-]+$/);
    assert.ok(!/^https?:\/\//i.test(CATALOG_IMAGE_PLACEHOLDER));
    assert.ok(fs.existsSync(path.join(ROOT, CATALOG_IMAGE_PLACEHOLDER)), `${CATALOG_IMAGE_PLACEHOLDER} is missing`);
    assert.strictEqual(localizeCatalogImage(CATALOG_IMAGE_PLACEHOLDER), CATALOG_IMAGE_PLACEHOLDER);
  });

  await test('every alias target exists on disk', () => {
    const missing = aliasKeys.filter((remote) => !fs.existsSync(path.join(ROOT, REMOTE_IMAGE_ALIASES[remote])));
    assert.deepStrictEqual(missing, [], `missing local files: ${missing.slice(0, 5).join(', ')}`);
  });

  // ── summary ─────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    for (const { name, err } of failures) console.error(`\n[${name}] ${err.stack || err.message}`);
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
