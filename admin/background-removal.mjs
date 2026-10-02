// Offline background removal for the Backdoor Asset Studio.
//
// Pure, DOM-free and dependency-free: it works on raw RGBA buffers so the
// studio (which owns the canvas) and the unit tests (which pass synthetic
// buffers) share exactly the same code.
//
// Algorithm — a "magic wand" matte tuned for product photography:
//   1. sample the background colour from the image border (per-channel median,
//      so a product bleeding into one edge does not skew it);
//   2. flood-fill inward from the border, marking every connected pixel within
//      `tolerance` of that colour — connectivity is what keeps a white logo or
//      a bright highlight *inside* the product from being erased;
//   3. soften the surviving edge by ramping the alpha of pixels within
//      `feather` pixels of the matte, based on how far their colour is from the
//      background.
//
// Images whose border is already transparent are left untouched.

/** Euclidean RGB distance, 0…441. */
export function colorDistance(a, b) {
  const dr = Number(a?.[0] || 0) - Number(b?.[0] || 0);
  const dg = Number(a?.[1] || 0) - Number(b?.[1] || 0);
  const db = Number(a?.[2] || 0) - Number(b?.[2] || 0);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Per-channel median of the outer `border` rings. Returns null when the border
 * is mostly transparent (nothing to remove) or the buffer is empty.
 */
export function medianBorderColor(pixels, width, height, { border = 2 } = {}) {
  if (!pixels || width <= 0 || height <= 0) return null;

  const rings = Math.max(1, Math.min(border, Math.floor(width / 2) || 1, Math.floor(height / 2) || 1));
  const red = [];
  const green = [];
  const blue = [];
  let transparent = 0;
  let total = 0;

  const consider = (x, y) => {
    const offset = (y * width + x) * 4;
    total++;
    if (pixels[offset + 3] === 0) {
      transparent++;
      return;
    }
    red.push(pixels[offset]);
    green.push(pixels[offset + 1]);
    blue.push(pixels[offset + 2]);
  };

  for (let y = 0; y < height; y++) {
    if (y < rings || y >= height - rings) {
      for (let x = 0; x < width; x++) consider(x, y);
    } else {
      for (let x = 0; x < rings; x++) {
        consider(x, y);
        consider(width - 1 - x, y);
      }
    }
  }

  if (!red.length || transparent > total / 2) return null;
  return [median(red), median(green), median(blue)];
}

function dilate(mask, width, height, steps) {
  const band = new Uint8Array(mask);
  let frontier = [];
  for (let i = 0; i < band.length; i++) if (band[i]) frontier.push(i);

  for (let step = 0; step < steps; step++) {
    const next = [];
    for (const i of frontier) {
      const x = i % width;
      const y = (i - x) / width;
      if (x > 0 && !band[i - 1]) { band[i - 1] = 1; next.push(i - 1); }
      if (x < width - 1 && !band[i + 1]) { band[i + 1] = 1; next.push(i + 1); }
      if (y > 0 && !band[i - width]) { band[i - width] = 1; next.push(i - width); }
      if (y < height - 1 && !band[i + width]) { band[i + width] = 1; next.push(i + width); }
    }
    frontier = next;
  }

  return band;
}

/**
 * Return a new RGBA buffer with the background made transparent.
 *
 * @param {Uint8ClampedArray|Uint8Array} pixels RGBA, length = width*height*4
 * @param {number} width
 * @param {number} height
 * @param {{tolerance?: number, feather?: number, border?: number}} options
 * @returns {Uint8ClampedArray} a copy; the input is never mutated
 */
export function removeBackground(pixels, width, height, options = {}) {
  if (!pixels || width <= 0 || height <= 0) return new Uint8ClampedArray(pixels || []);

  const tolerance = Math.max(0, Number(options.tolerance) || 0);
  const feather = Math.max(0, Math.floor(Number(options.feather) || 0));
  const out = new Uint8ClampedArray(pixels);
  const count = width * height;

  const background = medianBorderColor(pixels, width, height, options);
  if (!background) return out;

  const rgbAt = (i) => [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]];
  const matchesBackground = (i) => pixels[i * 4 + 3] === 0 || colorDistance(rgbAt(i), background) <= tolerance;

  // Flood fill from every border pixel that matches the background colour, so
  // only background *connected to the edge* is removed.
  const mask = new Uint8Array(count);
  const stack = [];
  const seed = (i) => {
    if (i < 0 || i >= count || mask[i] || !matchesBackground(i)) return;
    mask[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (y > 0) seed(i - width);
    if (y < height - 1) seed(i + width);
  }

  const band = feather > 0 ? dilate(mask, width, height, feather) : mask;
  const rampWidth = Math.max(1, tolerance);

  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    if (mask[i]) {
      out[offset + 3] = 0;
      continue;
    }
    // Soften only the pixels bordering the matte.
    if (!band[i] || pixels[offset + 3] === 0) continue;

    const distance = colorDistance(rgbAt(i), background);
    if (distance <= tolerance) continue; // enclosed background-coloured region: keep it
    const soft = Math.min(1, (distance - tolerance) / rampWidth);
    out[offset + 3] = Math.round(out[offset + 3] * soft);
  }

  return out;
}
