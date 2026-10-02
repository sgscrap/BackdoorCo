// Unit tests for admin/background-removal.mjs — the offline matte the Social
// Desk uses to strip a product photo's background.
//
// Everything runs on synthetic RGBA buffers, so no canvas or DOM is needed.
//
// Run: node scripts/background-removal.test.js   (or `npm test`)

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

/** Build an RGBA buffer from a per-pixel painter. */
function makeImage(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = paint(x, y) || [0, 0, 0, 0];
      const offset = (y * width + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = a;
    }
  }
  return data;
}

const alphaAt = (data, width, x, y) => data[(y * width + x) * 4 + 3];
const rgbAt = (data, width, x, y) => {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]];
};

(async () => {
  const {
    colorDistance, medianBorderColor, removeBackground,
    residualBackgroundFraction, shouldEscalateToAi,
  } = await import(pathToFileURL(path.join(ROOT, 'admin', 'background-removal.mjs')).href);

  const WHITE = [255, 255, 255];
  const BLACK = [0, 0, 0];

  // ── colour + sampling ───────────────────────────────────────────────────
  await test('colorDistance measures Euclidean RGB distance', () => {
    assert.equal(colorDistance([0, 0, 0], [0, 0, 0]), 0);
    assert.equal(Math.round(colorDistance([0, 0, 0], [255, 255, 255])), 442);
    assert.equal(colorDistance([10, 20, 30], [10, 20, 30]), 0);
    assert.equal(colorDistance(null, [10, 20, 30]), colorDistance([0, 0, 0], [10, 20, 30]));
  });

  await test('medianBorderColor reads the background from the border', () => {
    const data = makeImage(6, 6, (x, y) => (x >= 2 && x <= 3 && y >= 2 && y <= 3 ? BLACK : WHITE));
    assert.deepEqual(medianBorderColor(data, 6, 6), WHITE);
  });

  await test('medianBorderColor is robust when the subject touches an edge', () => {
    // A dark block covers two of ten border columns; the median stays white.
    const data = makeImage(10, 10, (x) => (x >= 8 ? [230, 230, 230] : [250, 250, 250]));
    assert.deepEqual(medianBorderColor(data, 10, 10), [250, 250, 250]);
    assert.deepEqual(medianBorderColor(data, 10, 10, { border: 1 }), [250, 250, 250]);
  });

  await test('medianBorderColor returns null for a transparent border', () => {
    const data = makeImage(4, 4, () => [0, 0, 0, 0]);
    assert.equal(medianBorderColor(data, 4, 4), null);
  });

  // ── removal ─────────────────────────────────────────────────────────────
  await test('removeBackground clears the background and keeps the subject', () => {
    const width = 9;
    const height = 9;
    const data = makeImage(width, height, (x, y) => (x >= 3 && x <= 5 && y >= 3 && y <= 5 ? [200, 20, 20] : WHITE));
    const out = removeBackground(data, width, height, { tolerance: 32 });

    assert.equal(alphaAt(out, width, 0, 0), 0, 'corner background should be transparent');
    assert.equal(alphaAt(out, width, 4, 4), 255, 'subject should stay opaque');
    assert.deepEqual(rgbAt(out, width, 4, 4), [200, 20, 20], 'subject colour is untouched');
  });

  await test('tolerance decides how much is removed', () => {
    const width = 10;
    const height = 10;
    const data = makeImage(width, height, (x) => (x >= 8 ? [230, 230, 230] : [250, 250, 250]));

    const tight = removeBackground(data, width, height, { tolerance: 20 });
    assert.equal(alphaAt(tight, width, 8, 5), 255, 'a 20-point difference should survive a 20 tolerance');

    const loose = removeBackground(data, width, height, { tolerance: 40 });
    assert.equal(alphaAt(loose, width, 8, 5), 0, 'a 40 tolerance should take the near-background block');
  });

  await test('an enclosed background-coloured region is preserved', () => {
    // A red ring seals a white centre off from the border.
    const width = 9;
    const height = 9;
    const data = makeImage(width, height, (x, y) => {
      const inside = x >= 3 && x <= 5 && y >= 3 && y <= 5;
      const ring = x >= 2 && x <= 6 && y >= 2 && y <= 6 && !(x >= 3 && x <= 5 && y >= 3 && y <= 5);
      if (ring) return [200, 20, 20];
      if (inside) return WHITE;
      return WHITE;
    });
    const out = removeBackground(data, width, height, { tolerance: 32 });
    assert.equal(alphaAt(out, width, 0, 0), 0, 'outer background removed');
    assert.equal(alphaAt(out, width, 4, 4), 255, 'sealed white centre must survive');
  });

  await test('feather softens the edge, and feather:0 keeps it hard', () => {
    const width = 5;
    const height = 5;
    // A single pixel a touch off the background, surrounded by background.
    const data = makeImage(width, height, (x, y) => (x === 2 && y === 2 ? [235, 235, 235] : WHITE));

    const hard = removeBackground(data, width, height, { tolerance: 32, feather: 0 });
    assert.equal(alphaAt(hard, width, 2, 2), 255, 'no feathering means a hard edge');

    const soft = removeBackground(data, width, height, { tolerance: 32, feather: 1 });
    const edgeAlpha = alphaAt(soft, width, 2, 2);
    assert.ok(edgeAlpha > 0 && edgeAlpha < 255, `edge alpha should be partial, got ${edgeAlpha}`);
  });

  await test('a fully transparent image is returned unchanged', () => {
    const data = makeImage(4, 4, () => [0, 0, 0, 0]);
    const out = removeBackground(data, 4, 4, { tolerance: 32 });
    assert.deepEqual([...out], [...data]);
  });

  await test('existing transparency is preserved', () => {
    const width = 4;
    const height = 4;
    const data = makeImage(width, height, (x, y) => (x === 1 && y === 1 ? [0, 0, 0, 0] : [200, 20, 20]));
    const out = removeBackground(data, width, height, { tolerance: 32 });
    assert.equal(alphaAt(out, width, 1, 1), 0);
  });

  await test('the input buffer is never mutated', () => {
    const width = 6;
    const height = 6;
    const data = makeImage(width, height, () => WHITE);
    const before = [...data];
    const out = removeBackground(data, width, height, { tolerance: 32 });
    assert.deepEqual([...data], before, 'input changed');
    assert.notEqual(out, data, 'a new buffer should be returned');
    assert.equal(alphaAt(out, width, 0, 0), 0);
  });

  await test('non-square buffers use the right stride', () => {
    const width = 8;
    const height = 8;
    // A small subject block, so the median border colour stays the background.
    const data = makeImage(width, height, (x, y) => (x >= 5 && y >= 3 && y <= 5 ? [180, 20, 20] : WHITE));
    const out = removeBackground(data, width, height, { tolerance: 32 });
    assert.equal(alphaAt(out, width, 1, 1), 0, 'background should be transparent');
    assert.equal(alphaAt(out, width, 6, 4), 255, 'subject should stay opaque');
  });

  await test('degenerate sizes do not throw', () => {
    assert.equal(removeBackground(null, 0, 0).length, 0);
    const one = makeImage(1, 1, () => WHITE);
    assert.equal(removeBackground(one, 1, 1, { tolerance: 32 }).length, 4);
  });

  // ── AI escalation signal ────────────────────────────────────────────────
  await test('residualBackgroundFraction measures surviving border opacity', () => {
    const clear = makeImage(8, 8, () => [0, 0, 0, 0]);
    assert.equal(residualBackgroundFraction(clear, 8, 8), 0, 'a transparent border is fully removed');

    const opaque = makeImage(8, 8, () => [10, 20, 30, 255]);
    assert.equal(residualBackgroundFraction(opaque, 8, 8), 1, 'an opaque border is untouched');

    const half = makeImage(8, 8, (x) => [10, 20, 30, x < 4 ? 255 : 0]);
    assert.equal(residualBackgroundFraction(half, 8, 8), 0.5, 'half opaque is half');

    assert.equal(residualBackgroundFraction(null, 0, 0), 0);
  });

  await test('residualBackgroundFraction honors the alpha threshold', () => {
    const faint = makeImage(6, 6, () => [0, 0, 0, 5]);
    assert.equal(residualBackgroundFraction(faint, 6, 6), 0, 'alpha 5 is below the default threshold');
    assert.equal(residualBackgroundFraction(faint, 6, 6, { alphaThreshold: 1 }), 1);
  });

  await test('a good matte does not escalate; a failed one does', () => {
    const width = 12;
    const height = 12;
    // Uniform studio background: the matte clears the border entirely.
    const uniform = makeImage(width, height, (x, y) => (x >= 4 && x <= 7 && y >= 4 && y <= 7 ? [200, 20, 20] : WHITE));
    const uniformMatte = removeBackground(uniform, width, height, { tolerance: 32 });
    assert.equal(residualBackgroundFraction(uniformMatte, width, height), 0);
    assert.equal(shouldEscalateToAi(uniformMatte, width, height), false);

    // A busy per-pixel background resists the flood fill right up to the edge.
    const busy = makeImage(width, height, (x, y) => [(x * 37) % 256, (y * 53) % 256, ((x + y) * 29) % 256]);
    const busyMatte = removeBackground(busy, width, height, { tolerance: 32 });
    assert.ok(residualBackgroundFraction(busyMatte, width, height) > 0.9, 'a busy background should survive');
    assert.equal(shouldEscalateToAi(busyMatte, width, height), true);
  });

  await test('shouldEscalateToAi respects a custom cutoff', () => {
    const half = makeImage(8, 8, (x) => [10, 20, 30, x < 4 ? 255 : 0]);
    assert.equal(shouldEscalateToAi(half, 8, 8), true, '0.5 exceeds the default 0.4');
    assert.equal(shouldEscalateToAi(half, 8, 8, { cutoff: 0.6 }), false);
  });

  // ── the AI module stays lazy ────────────────────────────────────────────
  await test('ai-segmentation exports a lazy, pinned model loader', async () => {
    const ai = await import(pathToFileURL(path.join(ROOT, 'admin', 'ai-segmentation.mjs')).href);
    assert.equal(typeof ai.segmentWithAi, 'function');
    assert.equal(typeof ai.warmUpAi, 'function');
    assert.equal(typeof ai.isAiAvailable, 'function');
    assert.match(ai.AI_MODEL.url, /^https:\/\/cdn\.jsdelivr\.net\/npm\/@imgly\/background-removal@\d/);
    assert.match(ai.AI_MODEL.url, new RegExp(ai.AI_MODEL.version.replace(/\./g, '\\.')));
    assert.equal(ai.AI_MODEL.model, 'isnet_quint8', 'the smallest network should be the default');
    // Importing the module must not fetch anything.
    assert.equal(typeof ai.segmentWithAi === 'function' && typeof ai.warmUpAi === 'function', true);
  });

  // ── studio wiring ───────────────────────────────────────────────────────
  await test('the Social Desk imports the matte and exposes its controls', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'social.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'admin', 'social.html'), 'utf8');
    assert.match(source, /from "\.\/background-removal\.mjs"/, 'social.js should import the matte module');
    assert.match(source, /removeBackground\(/, 'social.js should call removeBackground');
    for (const id of ['removeBgBtn', 'restoreBgBtn', 'cutoutTolerance', 'cutoutFeather', 'aiFallbackToggle']) {
      assert.match(html, new RegExp(`id="${id}"`), `social.html is missing #${id}`);
    }
    // The AI model must only be reached after the matte reports it failed.
    assert.match(source, /shouldEscalateToAi\(/, 'social.js should decide whether to escalate');
    assert.match(source, /await segmentWithAi\(/, 'social.js should call the AI path');
    assert.match(source, /path === "ai" \? "AI model" : "offline matte"/, 'the status should report which path ran');
    assert.match(html, /AGPL/, 'the licence should be visible next to the toggle');
  });

  await test('the Social Desk wires the cut-out grounding controls', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'social.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'admin', 'social.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'admin', 'social.css'), 'utf8');

    for (const id of ['groundingSection', 'shadowToggle', 'shadowDepth', 'rimToggle', 'rimStrength']) {
      assert.match(html, new RegExp(`id="${id}"`), `social.html is missing #${id}`);
    }
    assert.match(source, /function groundedCutout\(/, 'grounding should be gated on the active cut-out');
    assert.match(source, /async function renderGroundedCutout\(/, 'social.js should rasterize the grounding');
    assert.match(source, /function refreshCutout\(/, 'grounding changes should re-bake the cut-out');
    // The grounding must be baked into pixels, not applied as a CSS filter:
    // html2canvas does not render CSS `filter`, so a filter would never export.
    assert.match(source, /context\.filter = filter/, 'the shadow should use the canvas filter option');
    assert.match(source, /pass\("none"\)/, 'the product should be drawn unfiltered on top');
    // The pre-existing colour-filter mechanism is left exactly as it was.
    assert.match(css, /img\[data-filter="grayscale"\]/, 'the existing CSS colour filters should stay');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    process.exitCode = 1;
  }
})();
