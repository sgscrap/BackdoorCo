// Unit tests for the catalogue-driven Instagram rollout generator.
//   • scripts/generate-instagram-rollout.js emits a valid studio manifest
//   • selection reflects the real signals (recency / price drop / low stock)
//   • buckets are disjoint and export filenames never collide
//   • offline generation is deterministic and the committed file is not stale
//   • the output is consumable by scripts/prepare-instagram-rollout.js
//
// Run: node scripts/generate-instagram-rollout.test.js   (or `npm test`)

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
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
const GENERATOR = path.join(__dirname, 'generate-instagram-rollout.js');
const PREPARE = path.join(__dirname, 'prepare-instagram-rollout.js');
const GENERATED = path.join(ROOT, 'admin', 'instagram-rollout.generated.json');

function runGenerator(args) {
  return spawnSync(process.execPath, [GENERATOR, '--offline', ...args], { cwd: ROOT, encoding: 'utf8' });
}

function runPrepare(args) {
  return spawnSync(process.execPath, [PREPARE, '--offline', ...args], { cwd: ROOT, encoding: 'utf8' });
}

function generatedJson(args = ['--json']) {
  const run = runGenerator(args);
  assert.equal(run.status, 0, `expected exit 0, got ${run.status}\n${run.stdout}${run.stderr}`);
  return JSON.parse(run.stdout);
}

(async () => {
  const base = generatedJson();
  const manifest = base.manifest;
  const report = base.report;

  // ── manifest shape ──────────────────────────────────────────────────────
  await test('the generator emits a manifest with the studio top-level fields', () => {
    assert.equal(typeof manifest.brand, 'string');
    assert.equal(typeof manifest.handle, 'string');
    assert.equal(typeof manifest.siteOrigin, 'string');
    assert.equal(manifest.campaign, 'Weekly Drop');
    assert.equal(manifest.generatedBy, 'scripts/generate-instagram-rollout.js');
    assert.ok(Array.isArray(manifest.assets) && manifest.assets.length > 0);
  });

  await test('the default effects match the studio defaults', () => {
    assert.deepEqual(manifest.defaults, {
      font: 'space-grotesk', fontWeight: '900', imageFilter: 'none', blur: false, watermark: false, grain: 16,
    });
  });

  await test('every asset has a preset, unique id, order, and populated copy', () => {
    const ids = new Set();
    manifest.assets.forEach((asset, index) => {
      assert.ok(asset.preset, `${asset.id} has no preset`);
      assert.ok(!ids.has(asset.id), `duplicate id ${asset.id}`);
      ids.add(asset.id);
      assert.equal(asset.schedule.order, index + 1, `${asset.id} order should be sequential`);
      assert.ok(asset.copy && asset.copy.headline, `${asset.id} has no headline`);
      assert.ok(asset.copy.body, `${asset.id} has no body`);
    });
  });

  await test('export filenames are unique and deterministic', () => {
    const filenames = new Set();
    for (const asset of manifest.assets) {
      assert.ok(asset.filename.endsWith('.png'), `${asset.id} filename should be a .png`);
      assert.ok(!filenames.has(asset.filename), `duplicate filename ${asset.filename}`);
      filenames.add(asset.filename);
    }
  });

  await test('no product is posted twice under the same template', () => {
    const pairs = new Set();
    for (const asset of manifest.assets) {
      if (!asset.productRef) continue;
      const key = `${asset.preset}:${asset.productRef}`;
      assert.ok(!pairs.has(key), `duplicate ${key}`);
      pairs.add(key);
    }
  });

  // ── selection signals ───────────────────────────────────────────────────
  const productData = await (async () => {
    const tmp = path.join(ROOT, '.product-data.generate-test-tmp.mjs');
    fs.copyFileSync(path.join(ROOT, 'product-data.js'), tmp);
    try {
      return await import(pathToFileURL(tmp).href);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  })();

  const catalogue = productData.mergeCatalogProducts([])
    .filter((product) => !productData.isHidden(product) && product.status !== 'inactive')
    .sort((a, b) => productData.getProductSortTimestamp(b) - productData.getProductSortTimestamp(a));

  await test('new arrivals are the newest visible catalogue products', () => {
    const expected = catalogue.slice(0, report.counts.newArrivals).map((product) => String(product.id));
    assert.deepEqual(report.newArrivals, expected);
  });

  await test('price drops are discounted and ordered steepest-first', () => {
    assert.ok(report.priceDrops.length > 0, 'seeded catalogue should surface price drops');
    let previous = Infinity;
    for (const entry of report.priceDrops) {
      assert.ok(entry.retail > entry.price, `${entry.id} is not marked down`);
      const pct = (entry.retail - entry.price) / entry.retail;
      assert.ok(pct <= previous + 1e-9, `${entry.id} is out of order`);
      previous = pct;
    }
  });

  await test('low-stock products are in stock at or below the threshold', () => {
    const byId = new Map(catalogue.map((product) => [String(product.id), product]));
    for (const entry of report.lowStock) {
      const product = byId.get(entry.id);
      assert.ok(product, `${entry.id} is not in the catalogue`);
      assert.ok(productData.hasInStockSizes(product), `${entry.id} has no in-stock sizes`);
      assert.ok(entry.units <= 4, `${entry.id} is not low stock (${entry.units}u)`);
    }
  });

  await test('the selection buckets are disjoint', () => {
    const buckets = [report.newArrivals, report.priceDrops.map((e) => e.id), report.lowStock.map((e) => e.id), report.spotlight];
    const all = buckets.flat();
    assert.equal(new Set(all).size, all.length, `buckets overlap: ${all.join(', ')}`);
  });

  await test('the carousel group is only applied to carousel assets', () => {
    const grouped = manifest.assets.filter((asset) => asset.carouselGroup);
    assert.ok(grouped.length >= 2, 'carousel should have a cover and at least one slide');
    assert.ok(grouped.every((asset) => asset.carouselGroup === 'weekly-lineup'));
  });

  // ── validation + determinism ────────────────────────────────────────────
  await test('the committed generated manifest validates against the studio vocabulary', () => {
    const run = runPrepare(['--manifest', 'admin/instagram-rollout.generated.json']);
    assert.equal(run.status, 0, `expected exit 0, got ${run.status}\n${run.stdout}${run.stderr}`);
    assert.match(run.stdout, /is valid/);
  });

  await test('prepare resolves every generated asset (filenames match)', () => {
    const run = runPrepare(['--manifest', 'admin/instagram-rollout.generated.json', '--json']);
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    const { prepared } = JSON.parse(run.stdout);
    assert.equal(prepared.assets.length, manifest.assets.length);
    assert.deepEqual(prepared.assets.map((asset) => asset.filename), manifest.assets.map((asset) => asset.filename));
  });

  await test('offline generation is deterministic', () => {
    assert.equal(JSON.stringify(generatedJson()), JSON.stringify(base));
  });

  await test('the committed generated manifest matches a fresh --write (no drift)', () => {
    const normalize = (text) => text.replace(/\r\n/g, '\n');
    const before = normalize(fs.readFileSync(GENERATED, 'utf8'));
    const run = runGenerator(['--write']);
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    const after = normalize(fs.readFileSync(GENERATED, 'utf8'));
    assert.equal(after, before, 'admin/instagram-rollout.generated.json is stale; re-run `npm run generate:instagram`');
  });

  await test('the committed generated rollout is prepared and not stale', () => {
    const prepared = path.join(ROOT, 'admin', 'instagram-rollout.generated.prepared.json');
    const normalize = (text) => text.replace(/\r\n/g, '\n');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-prepared-'));
    const file = path.join(dir, 'fresh.prepared.json');
    try {
      const run = runPrepare(['--manifest', 'admin/instagram-rollout.generated.json', '--out', file, '--write']);
      assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
      assert.equal(
        normalize(fs.readFileSync(prepared, 'utf8')),
        normalize(fs.readFileSync(file, 'utf8')),
        'admin/instagram-rollout.generated.prepared.json is stale; re-run `npm run prepare:instagram:generated`'
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test('the studio resolves the rollout URL from the query string', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'social.js'), 'utf8');
    assert.match(source, /resolveRolloutUrl\(window\.location\.search\)/, 'social.js should honor ?rollout=');
  });

  await test('the studio wires the capture and download rollout actions', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'social.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'admin', 'social.html'), 'utf8');
    assert.match(source, /captureStudioControls\(state\.rollout\.assets\[index\]/, 'social.js should capture studio edits into the rollout');
    assert.match(source, /serializeRollout\(state\.rollout\)/, 'social.js should serialize the rollout for download');
    assert.match(html, /id="rolloutCaptureBtn"/);
    assert.match(html, /id="rolloutDownloadBtn"/);
    assert.match(html, /id="rolloutStatus"/);
  });

  // ── options ─────────────────────────────────────────────────────────────
  await test('--new controls how many arrivals are selected', () => {
    const two = generatedJson(['--json', '--new', '2']);
    assert.equal(two.report.counts.newArrivals, 2);
    assert.equal(two.report.newArrivals.length, 2);
  });

  await test('--no-carousel omits the carousel group', () => {
    const plain = generatedJson(['--json', '--no-carousel']);
    assert.ok(plain.manifest.assets.every((asset) => !asset.carouselGroup));
    assert.equal(plain.report.counts.spotlight, 0);
  });

  await test('--out writes to an alternate path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-rollout-'));
    const file = path.join(dir, 'custom.json');
    try {
      const run = runGenerator(['--write', '--out', file, '--json']);
      assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
      const written = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(written.assets.length, manifest.assets.length);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test('--help prints usage without generating', () => {
    const run = runGenerator(['--help']);
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    assert.match(run.stdout, /Generate the Instagram rollout manifest/);
    assert.doesNotMatch(run.stdout, /Generated Instagram rollout manifest/);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    process.exitCode = 1;
  }
})();
