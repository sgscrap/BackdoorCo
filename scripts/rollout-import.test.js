// Unit tests for admin/rollout-import.mjs — the helpers the Asset Studio uses
// to load a prepared Instagram rollout (admin/instagram-rollout.prepared.json)
// into the export queue.
//
// Run: node scripts/rollout-import.test.js   (or `npm test`)

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
const PREPARED = path.join(ROOT, 'admin', 'instagram-rollout.prepared.json');

(async () => {
  const {
    parseRollout, carouselGroups, captureStudioControls, serializeRollout,
    resolveRolloutUrl, studioControlsFor, ROLLOUT_URL,
  } = await import(pathToFileURL(path.join(ROOT, 'admin', 'rollout-import.mjs')).href);

  // ── the real prepared artifact ──────────────────────────────────────────
  await test('the delivered prepared rollout parses into every asset', () => {
    const payload = JSON.parse(fs.readFileSync(PREPARED, 'utf8'));
    const rollout = parseRollout(payload);
    assert.equal(rollout.assets.length, payload.assets.length);
    assert.ok(rollout.assets.length > 0, 'no assets parsed');
    for (const asset of rollout.assets) {
      assert.ok(asset.id && asset.template && asset.filename.endsWith('.png'), `${asset.id} is malformed`);
    }
  });

  await test('assets are ordered by their schedule order', () => {
    const rollout = parseRollout(JSON.parse(fs.readFileSync(PREPARED, 'utf8')));
    const orders = rollout.assets.map((asset) => asset.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  });

  await test('the carousel assets are grouped together', () => {
    const rollout = parseRollout(JSON.parse(fs.readFileSync(PREPARED, 'utf8')));
    const groups = carouselGroups(rollout.assets);
    const carousel = groups.find((entry) => entry.group === 'launch-carousel');
    assert.ok(carousel, 'launch-carousel group missing');
    assert.ok(carousel.assets.length >= 2, 'carousel should hold several slides');
    assert.ok(carousel.assets.every((asset) => asset.carouselGroup === 'launch-carousel'));
    // Grouping must not drop or duplicate assets.
    const grouped = groups.reduce((sum, entry) => sum + entry.assets.length, 0);
    assert.equal(grouped, rollout.assets.length);
  });

  await test('studioControlsFor maps copy, toggles and effects', () => {
    const asset = {
      id: 'x',
      template: 'sale',
      ratio: '9-16',
      theme: 'red',
      font: 'poppins',
      fontWeight: '700',
      product: { id: 'seed-abc' },
      copy: { kicker: 'K', headline: 'H', body: 'B', badge: 'D', cta: 'C', promo: 'P' },
      toggles: { showPrice: false, showSizes: true, visitSite: true, visitSiteUrl: 'https://x/shop' },
      effects: { imageFilter: 'warm', blur: true, watermark: true, grain: 40 },
      imageOverride: 'https://cdn.example/over.jpg',
      filename: 'backdoor_sale_h.png',
    };
    const controls = studioControlsFor(asset, { handle: '@backdoorco' });
    assert.equal(controls.productRef, 'seed-abc');
    assert.equal(controls.template, 'sale');
    assert.equal(controls.ratio, '9-16');
    assert.equal(controls.theme, 'red');
    assert.deepEqual(controls.copy, { kicker: 'K', headline: 'H', body: 'B', badge: 'D', cta: 'C', promo: 'P' });
    assert.equal(controls.showPrice, false);
    assert.equal(controls.showSizes, true);
    assert.equal(controls.visitSite, true);
    assert.equal(controls.visitSiteUrl, 'https://x/shop');
    assert.equal(controls.imageFilter, 'warm');
    assert.equal(controls.blur, true);
    assert.equal(controls.watermark, true);
    assert.equal(controls.grain, 40);
    assert.equal(controls.imageOverride, 'https://cdn.example/over.jpg');
    assert.equal(controls.handle, '@backdoorco');
    assert.equal(controls.filename, 'backdoor_sale_h.png');
  });

  await test('studioControlsFor falls back to studio defaults', () => {
    const controls = studioControlsFor({ id: 'x', template: 'drop', filename: 'f.png' });
    assert.equal(controls.ratio, '1-1');
    assert.equal(controls.theme, 'backdoor');
    assert.equal(controls.font, 'space-grotesk');
    assert.equal(controls.fontWeight, '900');
    assert.equal(controls.imageFilter, 'none');
    assert.equal(controls.grain, 16);
    assert.equal(controls.showPrice, true);
    assert.equal(controls.showSizes, true);
    assert.equal(controls.visitSite, false);
    assert.equal(controls.handle, '@backdoorco');
  });

  // ── capture edits back into the rollout ────────────────────────────────
  const sampleAsset = () => ({
    id: 'gen-drop-x',
    order: 3,
    template: 'drop',
    ratio: '1-1',
    theme: 'backdoor',
    font: 'space-grotesk',
    fontWeight: '900',
    productRef: 'seed-x',
    carouselGroup: 'weekly-lineup',
    filename: 'backdoor_drop_x.png',
    caption: 'old caption',
    hashtags: ['#Old'],
    copy: { kicker: 'OLD', headline: 'Old', body: 'Old', badge: 'OLD', cta: 'OLD', promo: '' },
    toggles: { showPrice: true, showSizes: true, visitSite: false, visitSiteUrl: '' },
    effects: { imageFilter: 'none', blur: false, watermark: false, grain: 16 },
    imageOverride: '',
  });

  const sampleControls = () => ({
    productRef: 'seed-y',
    template: 'sale',
    ratio: '9-16',
    theme: 'red',
    font: 'poppins',
    fontWeight: '700',
    imageFilter: 'warm',
    blur: true,
    watermark: true,
    grain: 40,
    showPrice: false,
    showSizes: true,
    visitSite: true,
    visitSiteUrl: 'https://x/shop',
    imageOverride: 'products/catalog/x.jpg',
    copy: { kicker: 'K', headline: 'H', body: 'B', badge: 'D', cta: 'C', promo: 'P' },
  });

  await test('captureStudioControls folds edits in while keeping the asset identity', () => {
    const asset = sampleAsset();
    const captured = captureStudioControls(asset, sampleControls());

    assert.equal(captured.id, 'gen-drop-x');
    assert.equal(captured.order, 3);
    assert.equal(captured.carouselGroup, 'weekly-lineup');
    assert.equal(captured.filename, 'backdoor_drop_x.png');
    assert.equal(captured.caption, 'old caption');

    assert.equal(captured.template, 'sale');
    assert.equal(captured.ratio, '9-16');
    assert.equal(captured.theme, 'red');
    assert.equal(captured.font, 'poppins');
    assert.equal(captured.fontWeight, '700');
    assert.equal(captured.productRef, 'seed-y');
    assert.deepEqual(captured.copy, { kicker: 'K', headline: 'H', body: 'B', badge: 'D', cta: 'C', promo: 'P' });
    assert.deepEqual(captured.toggles, { showPrice: false, showSizes: true, visitSite: true, visitSiteUrl: 'https://x/shop' });
    assert.deepEqual(captured.effects, { imageFilter: 'warm', blur: true, watermark: true, grain: 40 });
    assert.equal(captured.imageOverride, 'products/catalog/x.jpg');

    // Capture must not mutate the source asset.
    assert.equal(asset.template, 'drop');
    assert.equal(asset.copy.headline, 'Old');
  });

  await test('captureStudioControls falls back on unknown ratio/theme/filter', () => {
    const captured = captureStudioControls(
      { id: 'a', template: 'drop', ratio: '16-9', theme: 'mono' },
      { ratio: '4-5', theme: 'neon', imageFilter: 'x' }
    );
    assert.equal(captured.ratio, '16-9');
    assert.equal(captured.theme, 'mono');
    assert.equal(captured.effects.imageFilter, 'none');
    assert.equal(captured.copy.headline, '');
    assert.equal(captured.toggles.showPrice, true);
    assert.equal(captured.effects.grain, 16);
  });

  await test('serializeRollout round-trips through parseRollout', () => {
    const rollout = parseRollout(JSON.parse(fs.readFileSync(PREPARED, 'utf8')));
    const reparsed = parseRollout(JSON.parse(JSON.stringify(serializeRollout(rollout))));
    assert.deepEqual(reparsed, rollout);
  });

  await test('serializeRollout orders assets and preserves carousel grouping', () => {
    const out = serializeRollout({
      campaign: 'Weekly Drop',
      brand: 'Backdoor',
      handle: '@backdoorco',
      siteOrigin: 'https://x',
      assets: [
        { id: 'b', order: 2, template: 'sale', carouselGroup: null, filename: 'b.png' },
        { id: 'a', order: 1, template: 'drop', carouselGroup: 'weekly-lineup', filename: 'a.png' },
      ],
    });
    assert.deepEqual(out.assets.map((asset) => asset.id), ['a', 'b']);
    assert.equal(out.assets[0].carouselGroup, 'weekly-lineup');
    assert.equal(out.assets[1].carouselGroup, null);
    assert.equal(out.campaign, 'Weekly Drop');
    assert.equal(out.assets[1].schedule.postAt, null);
  });

  // ── rejection cases ────────────────────────────────────────────────────
  const rejects = (name, payload, expected) => test(name, () => {
    assert.throws(() => parseRollout(payload), expected);
  });

  rejects('a non-object payload is rejected', 'nope', /not an object/);
  rejects('a payload without assets is rejected', { brand: 'Backdoor' }, /no assets array/);
  rejects('an unknown template is rejected', { assets: [{ id: 'a', template: 'banner' }] }, /unknown template "banner"/);
  rejects('a duplicate asset id is rejected', { assets: [{ id: 'a', template: 'drop' }, { id: 'a', template: 'drop' }] }, /duplicate asset id "a"/);

  await test('an unknown ratio/theme falls back rather than failing', () => {
    const rollout = parseRollout({ assets: [{ id: 'a', template: 'drop', ratio: '4-5', theme: 'neon' }] });
    assert.equal(rollout.assets[0].ratio, '1-1');
    assert.equal(rollout.assets[0].theme, 'backdoor');
  });

  await test('the default rollout URL is the prepared file', () => {
    assert.equal(ROLLOUT_URL, 'instagram-rollout.prepared.json');
  });

  // ── ?rollout= override (preview an alternate prepared file) ─────────────
  await test('resolveRolloutUrl defaults to the curated prepared file', () => {
    assert.equal(resolveRolloutUrl(''), 'instagram-rollout.prepared.json');
    assert.equal(resolveRolloutUrl('?foo=bar'), 'instagram-rollout.prepared.json');
    assert.equal(resolveRolloutUrl(undefined), 'instagram-rollout.prepared.json');
  });

  await test('resolveRolloutUrl accepts a bare prepared filename', () => {
    assert.equal(
      resolveRolloutUrl('?rollout=instagram-rollout.generated.prepared.json'),
      'instagram-rollout.generated.prepared.json'
    );
  });

  await test('resolveRolloutUrl ignores paths, schemes and traversal', () => {
    const bad = [
      '?rollout=../secret.json',
      '?rollout=/etc/passwd.json',
      '?rollout=https://evil.example/x.json',
      '?rollout=sub/dir.json',
      '?rollout=evil.txt',
      '?rollout=',
    ];
    for (const search of bad) {
      assert.equal(resolveRolloutUrl(search), 'instagram-rollout.prepared.json', `should ignore ${search}`);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    process.exitCode = 1;
  }
})();
