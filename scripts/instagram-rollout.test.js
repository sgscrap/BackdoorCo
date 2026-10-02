// Unit tests for the Instagram rollout assets file.
//   • admin/instagram-rollout.json validates against the studio vocabulary
//   • scripts/prepare-instagram-rollout.js generates a deterministic prepared file
//   • admin/social-copy.mjs captions match the studio's template branches
//   • admin/social.js imports the shared copy module (no local drift)
//   • every documented validation error is rejected
//
// Run: node scripts/instagram-rollout.test.js   (or `npm test`)

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
const SCRIPT = path.join(__dirname, 'prepare-instagram-rollout.js');
const MANIFEST = path.join(ROOT, 'admin', 'instagram-rollout.json');
const PREPARED = path.join(ROOT, 'admin', 'instagram-rollout.prepared.json');

function runRollout(args) {
  return spawnSync(process.execPath, [SCRIPT, '--offline', ...args], { cwd: ROOT, encoding: 'utf8' });
}

function cloneManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

(async () => {
  const copyLib = await import(pathToFileURL(path.join(ROOT, 'admin', 'social-copy.mjs')).href);
  const baseManifest = cloneManifest();

  // The studio always has an active product selected, so a product-less template
  // (e.g. collage) is named by the top catalogue product. Mirror that here.
  const topProductName = await (async () => {
    const tmp = path.join(ROOT, '.product-data.naming-tmp.mjs');
    fs.copyFileSync(path.join(ROOT, 'product-data.js'), tmp);
    try {
      const pd = await import(pathToFileURL(tmp).href);
      const catalogue = pd.mergeCatalogProducts([])
        .filter((product) => !pd.isHidden(product) && product.status !== 'inactive')
        .sort((a, b) => pd.getProductSortTimestamp(b) - pd.getProductSortTimestamp(a));
      return catalogue[0]?.name || 'asset';
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  })();

  // ── manifest + prepared output ──────────────────────────────────────────
  await test('the shipped manifest validates', () => {
    const run = runRollout([]);
    assert.equal(run.status, 0, `expected exit 0, got ${run.status}\n${run.stdout}${run.stderr}`);
    assert.match(run.stdout, /is valid/);
  });

  await test('the committed prepared file matches a fresh --write (no drift)', () => {
    // Compare line-ending-normalized text: the committed blob is LF, but a
    // checkout with core.autocrlf (or core.eol=crlf) rewrites it to CRLF, and
    // the regenerated file is always LF. Normalizing keeps this check
    // independent of the developer's git config.
    const normalize = (text) => text.replace(/\r\n/g, '\n');
    const before = normalize(fs.readFileSync(PREPARED, 'utf8'));
    const run = runRollout(['--write']);
    assert.equal(run.status, 0, `expected exit 0, got ${run.status}\n${run.stdout}${run.stderr}`);
    const after = normalize(fs.readFileSync(PREPARED, 'utf8'));
    assert.equal(after, before, 'admin/instagram-rollout.prepared.json is stale; re-run `npm run prepare:instagram`');
  });

  await test('the prepared file covers every manifest asset with resolved fields', () => {
    const prepared = JSON.parse(fs.readFileSync(PREPARED, 'utf8'));
    assert.equal(prepared.assets.length, baseManifest.assets.length);
    assert.deepEqual(prepared.counts.templates, baseManifest.assets.map((a) => a.template).filter((v, i, arr) => arr.indexOf(v) === i).sort());

    const filenames = new Set();
    for (const asset of prepared.assets) {
      assert.ok(asset.caption && asset.caption.length > 0, `${asset.id} has no caption`);
      assert.ok(asset.filename.endsWith('.png'), `${asset.id} filename should be a .png`);
      assert.ok(asset.dimensions && asset.dimensions.width > 0, `${asset.id} has no dimensions`);
      assert.ok(Array.isArray(asset.hashtags) && asset.hashtags.includes('#Backdoor'), `${asset.id} is missing brand hashtags`);
      assert.ok(!filenames.has(asset.filename), `duplicate filename ${asset.filename}`);
      filenames.add(asset.filename);
    }
  });

  await test('ratio maps to the studio canvas dimensions', () => {
    const prepared = JSON.parse(fs.readFileSync(PREPARED, 'utf8'));
    const expected = { '1-1': [1080, 1080], '9-16': [1080, 1920], '16-9': [1200, 675] };
    for (const asset of prepared.assets) {
      const [width, height] = expected[asset.ratio];
      assert.deepEqual(asset.dimensions, { width, height }, `${asset.id} (${asset.ratio})`);
    }
  });

  // ── no-drift caption + helper fidelity ──────────────────────────────────
  const product = { brand: 'Nike', category: 'Sneakers' };
  const fields = { headline: 'H', body: 'B', cta: 'CTA', promo: 'CODE' };
  const common = { product, origin: 'https://x', handle: '@h', productUrl: 'https://x/p' };

  await test('captions reproduce every studio template branch', () => {
    const cap = (template, extra = {}) => copyLib.buildCaption({ template, fields, ...common, ...extra });
    assert.equal(cap('sale'), 'H\nB\nCode: CODE\n\nCTA: https://x/p\n@h\n\n#Backdoor #BackdoorCo #Sale #Nike #Sneakers');
    assert.equal(cap('drop'), 'H\nB\n\nCTA: https://x/p\n@h\n\n#Backdoor #BackdoorCo #NewDrop #Nike #Sneakers');
    assert.equal(cap('restock'), 'Restock alert: H\nB\n\nCTA: https://x/p\n@h\n\n#Backdoor #BackdoorCo #Restock #Nike #SneakerRestock');
    assert.equal(cap('holiday'), '🎄 H\nB\n\nCTA: https://x/p\n@h\n\n#Backdoor #BackdoorCo #HolidayDrop #Nike #SneakerSeason');
    assert.equal(cap('teaser'), '👀 H\nB\n\nCTA: https://x/shop-all\n@h\n\n#Backdoor #BackdoorCo #ComingSoon #Nike #Collab');
    assert.equal(cap('flash'), '⚡ H\nB\nCode: CODE\n\nCTA: https://x/p\n@h\n\n#Backdoor #BackdoorCo #FlashSale #Nike #LimitedTime');
    assert.equal(
      cap('collage', { fields: { headline: 'H', body: 'B', cta: 'CTA', promo: '' }, collage: [{ name: 'Alpha', price: 100 }, { name: 'Beta', price: 50 }] }),
      'Backdoor new arrivals\n\n1. Alpha - $100\n2. Beta - $50\n\nCTA: https://x/shop-all\n@h\n\n#Backdoor #BackdoorCo #NewDrops #Streetwear #SneakerDrops'
    );
  });

  await test('caption falls back to the product name and default handle', () => {
    const caption = copyLib.buildCaption({ template: 'drop', fields: { headline: '' }, product: { name: 'Fallback', brand: 'Nike', category: 'Sneakers' }, origin: 'https://x', productUrl: 'https://x/p' });
    assert.match(caption, /^Fallback\n/);
    assert.match(caption, /@backdoorco/);
  });

  await test('slugify / hashtag / formatMoney match the studio output', () => {
    assert.equal(copyLib.slugify("Nike Kobe 6 Protro 'ASG Hollywood' (2026)"), 'nike-kobe-6-protro-asg-hollywood-2026');
    assert.equal(copyLib.hashtag('Off-White'), 'OffWhite');
    assert.equal(copyLib.hashtag(''), 'Backdoor');
    assert.equal(copyLib.formatMoney(220), '$220');
    assert.equal(copyLib.formatMoney(49.5), '$49.50');
    assert.equal(copyLib.formatMoney(0), '$0');
  });

  await test('admin/social.js imports the shared copy module and defines no local copies', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'social.js'), 'utf8');
    assert.match(source, /from "\.\/social-copy\.mjs"/, 'social.js should import ./social-copy.mjs');
    assert.match(source, /buildCaption\(/, 'updateCaption should delegate to buildCaption');
    assert.doesNotMatch(source, /function formatMoney\(/, 'formatMoney should not be defined locally');
    assert.doesNotMatch(source, /function hashtag\(/, 'hashtag should not be defined locally');
    assert.doesNotMatch(source, /function slugify\(/, 'slugify should not be defined locally');
  });

  // ── validation: each documented error case is rejected ──────────────────
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollout-test-'));
  const writeTmp = (mutate) => {
    const manifest = cloneManifest();
    mutate(manifest);
    const file = path.join(tmpDir, `manifest-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
    return file;
  };
  const rejects = async (name, mutate, expected) => {
    await test(name, () => {
      const run = runRollout(['--manifest', writeTmp(mutate)]);
      assert.equal(run.status, 1, `expected exit 1\n${run.stdout}${run.stderr}`);
      assert.match(run.stdout, expected);
    });
  };

  try {
    await test('a valid manifest at an alternate path passes', () => {
      const file = path.join(tmpDir, 'valid.json');
      fs.writeFileSync(file, JSON.stringify(baseManifest, null, 2));
      const run = runRollout(['--manifest', file]);
      assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    });

    await test('a product-less template is named by the active product, like the studio', () => {
      const file = writeTmp((m) => {
        m.assets = [m.assets.find((a) => a.id === 'launch-collage-top4')];
        delete m.assets[0].filename;
      });
      const run = runRollout(['--manifest', file, '--json']);
      assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
      const { prepared } = JSON.parse(run.stdout);
      assert.equal(prepared.assets[0].filename, `backdoor_collage_${copyLib.slugify(topProductName)}.png`);
    });

    await rejects('unknown template is rejected', (m) => { m.assets[0].template = 'banner'; }, /unknown template "banner"/);
    await rejects('unknown theme is rejected', (m) => { m.assets[0].theme = 'neon'; }, /unknown theme "neon"/);
    await rejects('unknown ratio is rejected', (m) => { m.assets[0].ratio = '4-5'; }, /unknown ratio "4-5"/);
    await rejects('unknown font is rejected', (m) => { m.assets[0].font = 'comic-sans'; }, /unknown font "comic-sans"/);
    await rejects('unknown preset is rejected', (m) => { m.assets[0].preset = 'mystery'; }, /unknown preset "mystery"/);
    await rejects('a missing productRef is rejected', (m) => { delete m.assets[0].productRef; }, /requires a productRef/);
    await rejects('an unknown productRef is rejected', (m) => { m.assets[0].productRef = 'seed-does-not-exist'; }, /is not in the catalogue/);
    await rejects('a duplicate asset id is rejected', (m) => { m.assets[1].id = m.assets[0].id; }, /duplicate asset id/);
    await rejects('a duplicate export filename is rejected', (m) => { m.assets[0].filename = 'dup.png'; m.assets[1].filename = 'dup.png'; }, /duplicate export filename/);
    await rejects('an empty headline is rejected', (m) => { m.assets[0].copy.headline = ''; }, /copy\.headline is required/);
    await rejects('an unmirrored imageOverride is rejected', (m) => { m.assets[0].imageOverride = 'https://example.com/not-mirrored.jpg'; }, /is not a mirrored\/first-party image/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    process.exitCode = 1;
  }
})();
