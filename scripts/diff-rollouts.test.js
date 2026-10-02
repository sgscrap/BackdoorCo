// Unit tests for scripts/diff-rollouts.js — matching two prepared rollouts by a
// stable identity and reporting added / removed / changed assets.
//
// Run: node scripts/diff-rollouts.test.js   (or `npm test`)

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { assetKey, keyAssets, compareAssets, diffRollouts } = require('./diff-rollouts.js');

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
const SCRIPT = path.join(__dirname, 'diff-rollouts.js');
const CURATED = path.join(ROOT, 'admin', 'instagram-rollout.prepared.json');
const GENERATED = path.join(ROOT, 'admin', 'instagram-rollout.generated.prepared.json');

function runDiff(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function asset(over = {}) {
  return {
    id: 'a',
    template: 'drop',
    ratio: '1-1',
    theme: 'backdoor',
    font: 'space-grotesk',
    fontWeight: '900',
    preset: 'drop',
    carouselGroup: null,
    product: { id: 'seed-x', name: 'X' },
    copy: { kicker: 'K', headline: 'H', body: 'B', badge: 'D', cta: 'C', promo: '' },
    toggles: { showPrice: true, showSizes: true, visitSite: false, visitSiteUrl: '' },
    effects: { imageFilter: 'none', blur: false, watermark: false, grain: 16 },
    imageOverride: '',
    caption: 'cap',
    hashtags: ['#A'],
    filename: 'f.png',
    schedule: { order: 1, postAt: null },
    ...over,
  };
}

const rollout = (assets) => ({ campaign: 'Test', brand: 'Backdoor', handle: '@backdoorco', siteOrigin: 'https://x', assets });

(async () => {
  // ── identity ────────────────────────────────────────────────────────────
  await test('assetKey uses product + template by default', () => {
    assert.equal(assetKey(asset({ template: 'sale' })), 'product:seed-x|sale');
    assert.equal(assetKey(asset({ productRef: 'seed-y', product: undefined })), 'product:seed-y|drop');
  });

  await test('product-less assets key on template + carousel group', () => {
    assert.equal(assetKey(asset({ product: null, template: 'collage' })), 'template:collage|');
    assert.equal(assetKey(asset({ product: null, template: 'collage', carouselGroup: 'weekly-lineup' })), 'template:collage|weekly-lineup');
  });

  await test('assetKey honors id, filename and template modes', () => {
    assert.equal(assetKey(asset({ id: 'z' }), 'id'), 'id:z');
    assert.equal(assetKey(asset({ filename: 'g.png' }), 'filename'), 'filename:g.png');
    assert.equal(assetKey(asset({ template: 'flash' }), 'template'), 'template:flash');
  });

  await test('keyAssets disambiguates duplicate keys', () => {
    const map = keyAssets([asset({ id: 'one' }), asset({ id: 'two' })], 'template');
    assert.deepEqual([...map.keys()], ['template:drop', 'template:drop#2']);
  });

  // ── field comparison ────────────────────────────────────────────────────
  await test('compareAssets reports each changed field with from/to', () => {
    const before = asset();
    const after = asset({ copy: { ...before.copy, headline: 'New' }, toggles: { ...before.toggles, showPrice: false } });
    const fields = compareAssets(before, after);
    assert.deepEqual(Object.keys(fields).sort(), ['headline', 'showPrice']);
    assert.deepEqual(fields.headline, { from: 'H', to: 'New' });
    assert.deepEqual(fields.showPrice, { from: 'true', to: 'false' });
  });

  await test('compareAssets treats null/undefined as equal and joins hashtags', () => {
    const fields = compareAssets(asset({ schedule: { order: 1, postAt: null } }), asset({ schedule: { order: 1 } }));
    assert.equal(fields.postAt, undefined);
    assert.equal(compareAssets(asset({ hashtags: ['#A', '#B'] }), asset({ hashtags: ['#A #B'] })).hashtags, undefined);
  });

  // ── diff ────────────────────────────────────────────────────────────────
  await test('identical rollouts report no differences', () => {
    const diff = diffRollouts(rollout([asset()]), rollout([clone(asset())]));
    assert.deepEqual(diff.summary, { added: 0, removed: 0, changed: 0, unchanged: 1, base: 1, head: 1 });
  });

  await test('added and removed assets are detected', () => {
    const base = rollout([asset({ id: 'keep' }), asset({ id: 'gone', product: { id: 'seed-gone' } })]);
    const head = rollout([asset({ id: 'keep' }), asset({ id: 'new', product: { id: 'seed-new' } })]);
    const diff = diffRollouts(base, head);
    assert.deepEqual(diff.added.map((entry) => entry.id), ['new']);
    assert.deepEqual(diff.removed.map((entry) => entry.id), ['gone']);
    // The kept asset is unchanged.
    assert.equal(diff.summary.unchanged, 1);
  });

  await test('a matched asset with edits is reported as changed', () => {
    const base = rollout([asset()]);
    const head = rollout([asset({ id: 'renamed-but-same-subject', copy: { ...asset().copy, body: 'Updated' } })]);
    const diff = diffRollouts(base, head);
    assert.equal(diff.summary.changed, 1);
    assert.equal(diff.changed[0].fields.body.to, 'Updated');
    assert.equal(diff.changed[0].from.id, 'a');
    assert.equal(diff.changed[0].to.id, 'renamed-but-same-subject');
  });

  await test('--key id treats a renamed asset as removed + added', () => {
    const base = rollout([asset()]);
    const head = rollout([asset({ id: 'other' })]);
    const diff = diffRollouts(base, head, { key: 'id' });
    assert.deepEqual(diff.summary, { added: 1, removed: 1, changed: 0, unchanged: 0, base: 1, head: 1 });
  });

  // ── the real deliverables ───────────────────────────────────────────────
  await test('the curated and generated prepared rollouts diff cleanly', () => {
    const base = JSON.parse(fs.readFileSync(CURATED, 'utf8'));
    const head = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    const diff = diffRollouts(base, head);
    assert.equal(diff.summary.base, base.assets.length);
    assert.equal(diff.summary.head, head.assets.length);
    // Every head asset is either added, changed, or unchanged; every base asset
    // is either removed, changed, or unchanged.
    assert.equal(diff.summary.added + diff.summary.changed + diff.summary.unchanged, head.assets.length);
    assert.equal(diff.summary.removed + diff.summary.changed + diff.summary.unchanged, base.assets.length);
    assert.ok(diff.summary.added > 0, 'the generated plan should introduce assets');
    assert.ok(diff.summary.removed > 0, 'the curated plan should lose assets');
  });

  // ── CLI ─────────────────────────────────────────────────────────────────
  await test('the CLI defaults to curated vs generated and exits 0', () => {
    const run = runDiff([]);
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    assert.match(run.stdout, /Instagram rollout diff/);
    assert.match(run.stdout, /Summary: \d+ added, \d+ removed, \d+ changed, \d+ unchanged/);
  });

  await test('--json emits a machine-readable report', () => {
    const run = runDiff(['--json']);
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    const report = JSON.parse(run.stdout);
    assert.equal(report.ok, true);
    assert.ok(Array.isArray(report.added) && Array.isArray(report.removed) && Array.isArray(report.changed));
    assert.equal(report.summary.head, report.head.assets);
  });

  await test('--key id changes the matching', () => {
    const productRun = runDiff(['--json']);
    const idRun = runDiff(['--json', '--key', 'id']);
    const byId = JSON.parse(idRun.stdout);
    const byProduct = JSON.parse(productRun.stdout);
    assert.equal(byId.key, 'id');
    assert.equal(byId.summary.changed, 0, 'distinct ids can never be "changed"');
    assert.ok(byProduct.summary.changed > 0, 'product matching should pair some assets');
  });

  await test('--fail-on-change exits 1 when plans differ', () => {
    const run = runDiff(['--fail-on-change', '--json']);
    assert.equal(run.status, 1, `${run.stdout}${run.stderr}`);
  });

  await test('--fail-on-change exits 0 for identical rollouts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff-rollouts-'));
    const copy = path.join(dir, 'same.json');
    try {
      fs.copyFileSync(CURATED, copy);
      const run = runDiff([CURATED, copy, '--fail-on-change']);
      assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
      assert.match(run.stdout, /0 added, 0 removed, 0 changed/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test('an unknown --key is rejected', () => {
    const run = runDiff(['--key', 'nope']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Unknown --key/);
  });

  await test('a missing file fails with a readable error', () => {
    const run = runDiff([path.join(ROOT, 'admin', 'does-not-exist.json')]);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Could not read rollout/);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    process.exitCode = 1;
  }
})();
