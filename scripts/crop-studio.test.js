// Unit tests for admin/crop-studio.js — the cropper shared by /admin.html and
// /admin/products.html.
// Run: node scripts/crop-studio.test.js   (or `npm test`)
//
// The engine is a classic browser script, so it exports itself via module.exports
// when there is no `window`. Only the pure geometry is covered here: the marquee
// state machine is verified against a real browser instead.

'use strict';

const assert = require('assert/strict');

const CropStudio = require('../admin/crop-studio.js');

// ── tiny harness (same shape as price-monitor-retail.test.js) ──────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, body) {
  try {
    body();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  FAIL  ${name}\n        ${err && err.message}`);
  }
}

function ratioOf(region) {
  return region.sw / region.sh;
}

function assertRatio(region, ratio, message) {
  // Rounded pixel sides cannot hit a ratio exactly; one pixel of slack is the
  // tightest guarantee the implementation can make.
  const drift = Math.abs(ratioOf(region) - ratio);
  assert.ok(drift <= 1 / region.sh + 1e-9, `${message} (drift ${drift})`);
}

function assertInside(region, width, height, message) {
  assert.ok(region.sx >= 0, `${message}: sx ${region.sx}`);
  assert.ok(region.sy >= 0, `${message}: sy ${region.sy}`);
  assert.ok(region.sw >= 1, `${message}: sw ${region.sw}`);
  assert.ok(region.sh >= 1, `${message}: sh ${region.sh}`);
  assert.ok(region.sx + region.sw <= width, `${message}: right edge ${region.sx + region.sw} > ${width}`);
  assert.ok(region.sy + region.sh <= height, `${message}: bottom edge ${region.sy + region.sh} > ${height}`);
}

// ── parseAspectValue ──────────────────────────────────────────────────────

test('parseAspectValue treats the free-form option as no lock', () => {
  for (const value of ['', '   ', null, undefined, 'original', 'ORIGINAL', 'free', 'freeform']) {
    assert.strictEqual(CropStudio.parseAspectValue(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});

test('parseAspectValue reads fractions, whole numbers and decimals', () => {
  assert.strictEqual(CropStudio.parseAspectValue('1'), 1);
  assert.strictEqual(CropStudio.parseAspectValue('4/3'), 4 / 3);
  assert.strictEqual(CropStudio.parseAspectValue('16/9'), 16 / 9);
  assert.strictEqual(CropStudio.parseAspectValue('3/4'), 0.75);
  assert.strictEqual(CropStudio.parseAspectValue('1.5'), 1.5);
  assert.strictEqual(CropStudio.parseAspectValue('1/1'), 1);
});

test('parseAspectValue rejects nonsense instead of producing NaN ratios', () => {
  for (const value of ['abc', '0', '0/4', '4/0', '-3', '4/3/2', '1//2']) {
    const parsed = CropStudio.parseAspectValue(value);
    assert.ok(parsed === null || Number.isFinite(parsed) && parsed > 0, `bad parse for ${value}: ${parsed}`);
  }
  assert.strictEqual(CropStudio.parseAspectValue('0'), null);
  assert.strictEqual(CropStudio.parseAspectValue('4/0'), null);
});

// ── largestCropRegion ─────────────────────────────────────────────────────

test('largestCropRegion centres the biggest locked box', () => {
  const landscape = CropStudio.largestCropRegion(1200, 800, 1);
  assert.deepStrictEqual(landscape, { sx: 200, sy: 0, sw: 800, sh: 800 });

  const portrait = CropStudio.largestCropRegion(600, 1200, 4 / 3);
  assert.deepStrictEqual(portrait, { sx: 0, sy: 375, sw: 600, sh: 450 });
  assertRatio(portrait, 4 / 3, 'portrait 4:3');
});

test('largestCropRegion returns the whole image when there is no ratio', () => {
  const region = CropStudio.largestCropRegion(900, 600, null);
  assert.deepStrictEqual(region, { sx: 0, sy: 0, sw: 900, sh: 600 });
  assert.ok(CropStudio.isFullImageRegion(region, 900, 600));
});

test('largestCropRegion never exceeds the image and stays inside', () => {
  const ratios = [1, 4 / 3, 3 / 4, 16 / 9];
  for (const [w, h] of [[1200, 800], [800, 1200], [500, 500], [4000, 100]]) {
    for (const ratio of ratios) {
      const region = CropStudio.largestCropRegion(w, h, ratio);
      assertInside(region, w, h, `largestCropRegion(${w},${h},${ratio})`);
      assertRatio(region, ratio, `largestCropRegion(${w},${h},${ratio}) ratio`);
    }
  }
});

// ── isFullImageRegion ─────────────────────────────────────────────────────

test('isFullImageRegion only reports true for a pixel-exact full frame', () => {
  assert.ok(CropStudio.isFullImageRegion({ sx: 0, sy: 0, sw: 900, sh: 600 }, 900, 600));
  assert.ok(!CropStudio.isFullImageRegion({ sx: 1, sy: 0, sw: 899, sh: 600 }, 900, 600));
  assert.ok(!CropStudio.isFullImageRegion({ sx: 0, sy: 0, sw: 900, sh: 599 }, 900, 600));
  assert.ok(!CropStudio.isFullImageRegion(null, 900, 600));
});

// ── moveCropRegion ────────────────────────────────────────────────────────

test('moveCropRegion slides the box without resizing it', () => {
  const start = { sx: 200, sy: 100, sw: 600, sh: 400 };
  const moved = CropStudio.moveCropRegion(start, 50, -40, 1200, 900);
  assert.deepStrictEqual(moved, { sx: 250, sy: 60, sw: 600, sh: 400 });
});

test('moveCropRegion clamps to the image instead of drifting outside', () => {
  const start = { sx: 200, sy: 100, sw: 600, sh: 400 };

  const hardLeft = CropStudio.moveCropRegion(start, -9999, -9999, 1200, 900);
  assert.deepStrictEqual(hardLeft, { sx: 0, sy: 0, sw: 600, sh: 400 });
  assertInside(hardLeft, 1200, 900, 'clamped top-left');

  const hardRight = CropStudio.moveCropRegion(start, 9999, 9999, 1200, 900);
  assert.deepStrictEqual(hardRight, { sx: 600, sy: 500, sw: 600, sh: 400 });
  assertInside(hardRight, 1200, 900, 'clamped bottom-right');
});

test('moveCropRegion cannot move a full-image box at all', () => {
  const full = { sx: 0, sy: 0, sw: 900, sh: 600 };
  assert.deepStrictEqual(CropStudio.moveCropRegion(full, 120, 80, 900, 600), full);
});

// ── resizeCropRegion ──────────────────────────────────────────────────────

test('resizeCropRegion keeps a locked ratio when dragging a corner', () => {
  const start = { sx: 100, sy: 100, sw: 600, sh: 400 };
  const ratio = 4 / 3;

  for (const handle of ['nw', 'ne', 'se', 'sw']) {
    const resized = CropStudio.resizeCropRegion(start, handle, -90, -60, 1200, 900, ratio);
    assertInside(resized, 1200, 900, `corner ${handle}`);
    assertRatio(resized, ratio, `corner ${handle} ratio`);
    assert.ok(resized.sw > 1 && resized.sh > 1, `corner ${handle} collapsed`);
  }
});

test('resizeCropRegion anchors the opposite corner when dragging a corner', () => {
  const start = { sx: 100, sy: 100, sw: 600, sh: 400 };
  // Dragging NW keeps the SE corner pinned at (700, 500).
  const resized = CropStudio.resizeCropRegion(start, 'nw', -50, -20, 1200, 900, 4 / 3);
  assert.strictEqual(resized.sx + resized.sw, 700, 'SE x should not move');
  assert.strictEqual(resized.sy + resized.sh, 500, 'SE y should not move');
});

test('resizeCropRegion anchors the opposite edge when dragging an edge', () => {
  const start = { sx: 100, sy: 100, sw: 600, sh: 400 };

  const west = CropStudio.resizeCropRegion(start, 'w', 40, 0, 1200, 900, 4 / 3);
  assert.strictEqual(west.sx + west.sw, 700, 'east edge should stay put');
  assertRatio(west, 4 / 3, 'west edge ratio');

  const east = CropStudio.resizeCropRegion(start, 'e', 40, 0, 1200, 900, 4 / 3);
  assert.strictEqual(east.sx, 100, 'west edge should stay put');
  assertRatio(east, 4 / 3, 'east edge ratio');

  const north = CropStudio.resizeCropRegion(start, 'n', 0, -60, 1200, 900, 4 / 3);
  assert.strictEqual(north.sy + north.sh, 500, 'south edge should stay put');
  assertRatio(north, 4 / 3, 'north edge ratio');
});

test('resizeCropRegion clamps a locked box to the image without breaking the ratio', () => {
  const start = { sx: 0, sy: 0, sw: 600, sh: 400 };
  const ratio = 4 / 3;
  // Ask for a box far larger than the image in every direction.
  for (const handle of ['nw', 'ne', 'se', 'sw', 'e', 'w', 'n', 's']) {
    const resized = CropStudio.resizeCropRegion(start, handle, 5000, 5000, 800, 600, ratio);
    assertInside(resized, 800, 600, `clamped ${handle}`);
    assertRatio(resized, ratio, `clamped ${handle} ratio`);
  }
});

test('resizeCropRegion never inverts, even when dragged past the opposite edge', () => {
  const start = { sx: 100, sy: 100, sw: 400, sh: 300 };

  const invertedX = CropStudio.resizeCropRegion(start, 'w', 5000, 0, 1200, 900, null);
  assert.ok(invertedX.sw > 0, `sw inverted: ${invertedX.sw}`);
  assertInside(invertedX, 1200, 900, 'inverted x');

  const invertedY = CropStudio.resizeCropRegion(start, 'n', 0, 5000, 1200, 900, null);
  assert.ok(invertedY.sh > 0, `sh inverted: ${invertedY.sh}`);
  assertInside(invertedY, 1200, 900, 'inverted y');

  const locked = CropStudio.resizeCropRegion(start, 'nw', 9999, 9999, 1200, 900, 1);
  assert.ok(locked.sw > 0 && locked.sh > 0, 'locked box collapsed');
  assertRatio(locked, 1, 'locked inverted ratio');
});

test('resizeCropRegion honours both axes when the ratio is free-form', () => {
  const start = { sx: 100, sy: 100, sw: 600, sh: 400 };
  const resized = CropStudio.resizeCropRegion(start, 'se', 100, 50, 1200, 900, null);
  assert.deepStrictEqual(resized, { sx: 100, sy: 100, sw: 700, sh: 450 });
});

// ── fitCropRegionInBounds ─────────────────────────────────────────────────

test('fitCropRegionInBounds pulls an oversized or off-image region back in', () => {
  const ratio = 16 / 9;
  const cases = [
    { sx: -500, sy: -500, sw: 3000, sh: 2000 },
    { sx: 5000, sy: 5000, sw: 400, sh: 225 },
    { sx: 0, sy: 0, sw: 10, sh: 5 }
  ];
  for (const region of cases) {
    const fitted = CropStudio.fitCropRegionInBounds(region, 1200, 900, ratio, 32);
    assertInside(fitted, 1200, 900, `fitted ${JSON.stringify(region)}`);
    assertRatio(fitted, ratio, `fitted ${JSON.stringify(region)} ratio`);
  }
});

// ── nearestPreset ─────────────────────────────────────────────────────────

test('nearestPreset snaps any crop onto the closest storefront frame', () => {
  const presets = [
    { ratio: 1, aspect: 'square' },
    { ratio: 4 / 3, aspect: 'landscape' },
    { ratio: 3 / 4, aspect: 'portrait' },
    { ratio: 16 / 9, aspect: 'wide' }
  ];

  assert.strictEqual(CropStudio.nearestPreset(1, presets).aspect, 'square');
  assert.strictEqual(CropStudio.nearestPreset(1.02, presets).aspect, 'square');
  assert.strictEqual(CropStudio.nearestPreset(1.5, presets).aspect, 'landscape');
  assert.strictEqual(CropStudio.nearestPreset(3.5, presets).aspect, 'wide');
  assert.strictEqual(CropStudio.nearestPreset(0.5, presets).aspect, 'portrait');
  assert.strictEqual(CropStudio.nearestPreset(1.7, presets).aspect, 'wide');
  assert.strictEqual(CropStudio.nearestPreset(null, presets), null);
  assert.strictEqual(CropStudio.nearestPreset(2, []), null);
  assert.strictEqual(CropStudio.nearestPreset(2, undefined), null);
});

// ── detectSubjectRegion ───────────────────────────────────────────────────

// Paints a synthetic { width, height, data } the detector accepts, so the
// heuristic can be exercised without a canvas.
function makeImage(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const rgba = paint(x, y) || [255, 255, 255, 255];
      data[i] = rgba[0];
      data[i + 1] = rgba[1];
      data[i + 2] = rgba[2];
      data[i + 3] = rgba.length > 3 ? rgba[3] : 255;
    }
  }
  return { width, height, data };
}

const WHITE = [252, 252, 252];
const INK = [40, 45, 55];

function subjectOnWhite(width, height, box) {
  return makeImage(width, height, (x, y) => (
    x >= box.sx && x < box.sx + box.sw && y >= box.sy && y < box.sy + box.sh ? INK : WHITE
  ));
}

test('detectSubjectRegion finds nothing on a blank canvas', () => {
  assert.strictEqual(CropStudio.detectSubjectRegion(makeImage(200, 200, () => WHITE)), null);
});

test('detectSubjectRegion boxes a subject sitting on a flat backdrop', () => {
  const box = { sx: 60, sy: 40, sw: 81, sh: 121 };
  const detected = CropStudio.detectSubjectRegion(subjectOnWhite(200, 200, box));
  assert.deepStrictEqual(detected, box);
});

test('detectSubjectRegion keeps an off-centre subject off-centre', () => {
  const box = { sx: 12, sy: 150, sw: 70, sh: 40 };
  const detected = CropStudio.detectSubjectRegion(subjectOnWhite(200, 200, box));
  assert.deepStrictEqual(detected, box);
  assert.ok(detected.sx < (200 - detected.sw) / 2, 'left edge should stay left');
  assert.ok(detected.sy > (200 - detected.sh) / 2, 'top edge should stay low');
});

test('detectSubjectRegion still boxes a subject that touches an edge', () => {
  const box = { sx: 0, sy: 20, sw: 90, sh: 160 };
  assert.deepStrictEqual(CropStudio.detectSubjectRegion(subjectOnWhite(200, 200, box)), box);
});

test('detectSubjectRegion ignores stray specks away from the subject', () => {
  const box = { sx: 60, sy: 40, sw: 81, sh: 121 };
  const specked = makeImage(200, 200, (x, y) => (
    x >= box.sx && x < box.sx + box.sw && y >= box.sy && y < box.sy + box.sh
      ? INK
      : (x === 2 && y === 2) || (x === 197 && y === 190) ? [0, 0, 0] : WHITE
  ));
  assert.deepStrictEqual(CropStudio.detectSubjectRegion(specked), box);
});

test('detectSubjectRegion reads alpha when the backdrop is transparent', () => {
  const box = { sx: 50, sy: 30, sw: 100, sh: 140 };
  const cutout = makeImage(200, 200, (x, y) => (
    x >= box.sx && x < box.sx + box.sw && y >= box.sy && y < box.sy + box.sh
      ? [INK[0], INK[1], INK[2], 255]
      : [0, 0, 0, 0]
  ));
  assert.deepStrictEqual(CropStudio.detectSubjectRegion(cutout), box);
});

test('detectSubjectRegion tolerates a noisy backdrop', () => {
  const box = { sx: 60, sy: 40, sw: 81, sh: 121 };
  const noisy = makeImage(200, 200, (x, y) => {
    if (x >= box.sx && x < box.sx + box.sw && y >= box.sy && y < box.sy + box.sh) return INK;
    const jitter = (x * 7 + y * 13) % 21;
    return [245 + jitter, 245 + jitter, 245 + jitter];
  });
  assert.deepStrictEqual(CropStudio.detectSubjectRegion(noisy), box);
});

test('detectSubjectRegion refuses a full-bleed photo', () => {
  // Corners disagree, so there is no backdrop to key on: the caller centres.
  const gradient = makeImage(200, 200, (x, y) => {
    const level = Math.round(((x + y) / 398) * 255);
    return [level, level, level];
  });
  assert.strictEqual(CropStudio.detectSubjectRegion(gradient), null);
});

test('detectSubjectRegion refuses a subject that already fills the frame', () => {
  // Flat white border, but the ink covers all but a hair of the image.
  const nearlyFull = subjectOnWhite(200, 200, { sx: 1, sy: 1, sw: 198, sh: 198 });
  assert.strictEqual(CropStudio.detectSubjectRegion(nearlyFull), null);
});

test('detectSubjectRegion rejects input it cannot read', () => {
  assert.strictEqual(CropStudio.detectSubjectRegion(null), null);
  assert.strictEqual(CropStudio.detectSubjectRegion({ width: 0, height: 0, data: [] }), null);
  assert.strictEqual(CropStudio.detectSubjectRegion({ width: 8, height: 8, data: new Uint8ClampedArray(4) }), null);
});

// ── subjectCropRegion ─────────────────────────────────────────────────────

test('subjectCropRegion pads the subject without leaving the image', () => {
  const subject = { sx: 60, sy: 40, sw: 81, sh: 121 };
  const region = CropStudio.subjectCropRegion(subject, 200, 200, null, 32, 0.1);
  assertInside(region, 200, 200, 'padded subject');
  assert.ok(region.sx <= subject.sx && region.sy <= subject.sy, 'should grow outwards');
  assert.ok(region.sx + region.sw >= subject.sx + subject.sw, 'right edge should grow');
  assert.ok(region.sy + region.sh >= subject.sy + subject.sh, 'bottom edge should grow');
  assert.ok(region.sw > subject.sw && region.sh > subject.sh, 'should actually pad');
});

test('subjectCropRegion clips padding that would escape the image', () => {
  // 25px of padding around a 50px subject spills off the top-left corner, so
  // the box is clipped rather than pushed off the image.
  const region = CropStudio.subjectCropRegion({ sx: 0, sy: 0, sw: 50, sh: 50 }, 100, 100, null, 32, 0.5);
  assert.deepStrictEqual(region, { sx: 0, sy: 0, sw: 75, sh: 75 });
});

test('subjectCropRegion frames the locked aspect around the subject', () => {
  const subject = { sx: 60, sy: 40, sw: 81, sh: 121 };

  // The tall side wins and the frame stays centred on the subject, so a square
  // card of a tall product shows the whole product rather than its middle.
  const square = CropStudio.subjectCropRegion(subject, 200, 200, 1, 32, 0);
  assert.deepStrictEqual(square, { sx: 40, sy: 40, sw: 121, sh: 121 });

  // Centred subject, roomy image: every aspect fits without hitting the bounds.
  const centred = { sx: 160, sy: 140, sw: 81, sh: 121 };
  for (const ratio of [1, 4 / 3, 3 / 4, 16 / 9]) {
    const region = CropStudio.subjectCropRegion(centred, 400, 400, ratio, 32, 0);
    assertInside(region, 400, 400, `subject ratio ${ratio}`);
    assertRatio(region, ratio, `subject ratio ${ratio}`);
    assert.ok(region.sw >= centred.sw && region.sh >= centred.sh, `ratio ${ratio} cut the subject off`);
    const centreX = region.sx + region.sw / 2;
    const centreY = region.sy + region.sh / 2;
    assert.ok(Math.abs(centreX - (centred.sx + centred.sw / 2)) <= 1, `ratio ${ratio} centre x`);
    assert.ok(Math.abs(centreY - (centred.sy + centred.sh / 2)) <= 1, `ratio ${ratio} centre y`);
  }
});

test('subjectCropRegion lets the image bounds win over the aspect', () => {
  // 16:9 cannot contain a 121px-tall subject in a 200px-tall image, so the
  // frame uses the full width and the subject is cropped instead of overflowing.
  const region = CropStudio.subjectCropRegion({ sx: 60, sy: 40, sw: 81, sh: 121 }, 200, 200, 16 / 9, 32, 0);
  assert.strictEqual(region.sw, 200, 'should use the full width');
  assertInside(region, 200, 200, 'clamped wide frame');
  assertRatio(region, 16 / 9, 'clamped wide frame');
});

test('subjectCropRegion returns null instead of a bogus box', () => {
  assert.strictEqual(CropStudio.subjectCropRegion(null, 200, 200, 1, 32, 0), null);
  assert.strictEqual(CropStudio.subjectCropRegion({ sx: 0, sy: 0, sw: 0, sh: 40 }, 200, 200, 1, 32, 0), null);
});

// ── resolveDefaultRegion ──────────────────────────────────────────────────

test('resolveDefaultRegion frames the subject and reports it auto-framed', () => {
  const subject = { sx: 60, sy: 40, sw: 81, sh: 121 };
  const resolved = CropStudio.resolveDefaultRegion(subject, 200, 200, 1, 32, 0.04);
  assert.strictEqual(resolved.autoFramed, true);
  assertInside(resolved.region, 200, 200, 'auto-framed region');
  assertRatio(resolved.region, 1, 'auto-framed region');
  // The frame still contains the whole subject it was built around.
  assert.ok(resolved.region.sx <= subject.sx && resolved.region.sy <= subject.sy, 'should contain the subject');
  assert.ok(resolved.region.sx + resolved.region.sw >= subject.sx + subject.sw, 'right edge should contain');
  assert.ok(resolved.region.sy + resolved.region.sh >= subject.sy + subject.sh, 'bottom edge should contain');
});

test('resolveDefaultRegion falls back to the geometric centre, unflagged, with no subject', () => {
  const resolved = CropStudio.resolveDefaultRegion(null, 200, 120, 4 / 3, 32, 0.04);
  assert.strictEqual(resolved.autoFramed, false);
  assert.deepStrictEqual(resolved.region, CropStudio.largestCropRegion(200, 120, 4 / 3));
});

test('resolveDefaultRegion centres when the detected box cannot be framed', () => {
  // A zero-sized box is not frameable, so the geometric centre wins and the
  // auto-framed flag stays off.
  const resolved = CropStudio.resolveDefaultRegion({ sx: 0, sy: 0, sw: 0, sh: 0 }, 200, 200, 1, 32, 0.04);
  assert.strictEqual(resolved.autoFramed, false);
  assert.deepStrictEqual(resolved.region, CropStudio.largestCropRegion(200, 200, 1));
});

test('resolveDefaultRegion auto-frames even with no locked aspect', () => {
  const resolved = CropStudio.resolveDefaultRegion({ sx: 60, sy: 40, sw: 81, sh: 121 }, 200, 200, null, 32, 0);
  assert.strictEqual(resolved.autoFramed, true);
  // A detected subject must not collapse back to the whole-image upload path.
  assert.ok(!CropStudio.isFullImageRegion(resolved.region, 200, 200), 'subject frame should not read as full image');
});

// ── DOM-free guards ───────────────────────────────────────────────────────

test('detectImageSubject degrades to null without a DOM', () => {
  assert.strictEqual(CropStudio.detectImageSubject(null, {}), null);
  assert.strictEqual(CropStudio.detectImageSubject({ naturalWidth: 100, naturalHeight: 100 }, {}), null);
});

test('a studio with no elements still builds and reports no subject', () => {
  const studio = CropStudio.create({});
  assert.strictEqual(studio.detectSubject(), null);
  assert.strictEqual(studio.getRegion(), null);
  assert.strictEqual(studio.isAutoFramed(), false);
  assert.strictEqual(studio.frameSubject(), false, 'nothing to frame without an image');
  studio.setImage('');
  studio.setRatio(1);
  studio.resetRegion();
  studio.destroy();
});

// ── exposed constants ─────────────────────────────────────────────────────

test('the engine exposes the limits both pages rely on', () => {
  assert.strictEqual(CropStudio.MIN_PX, 32);
  assert.strictEqual(CropStudio.DEFAULT_MAX_SIDE, 1600);
  assert.strictEqual(CropStudio.ARROW_STEP_PX, 8);
  assert.strictEqual(CropStudio.DETECT_MAX_SAMPLE, 256);
  assert.strictEqual(typeof CropStudio.DETECT_PADDING, 'number');
  assert.strictEqual(typeof CropStudio.create, 'function');
  assert.strictEqual(typeof CropStudio.cropDataUrlToPng, 'function');
  assert.strictEqual(typeof CropStudio.detectSubjectRegion, 'function');
  assert.strictEqual(typeof CropStudio.subjectCropRegion, 'function');
  assert.strictEqual(typeof CropStudio.resolveDefaultRegion, 'function');
  assert.strictEqual(typeof CropStudio.detectImageSubject, 'function');
});

// ── summary ───────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  for (const { name, err } of failures) console.error(`\n[${name}] ${err.stack || err.message}`);
  process.exit(1);
}
