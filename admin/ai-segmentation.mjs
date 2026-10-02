// Optional AI segmentation fallback for the Backdoor Asset Studio.
//
// This module is imported by the studio but never fetches anything on its own:
// the model is downloaded lazily, and only when the offline matte leaves too
// much background behind (see shouldEscalateToAi in background-removal.mjs).
// Everything else in the studio keeps working offline and with no dependency.
//
// ── Licensing ──────────────────────────────────────────────────────────────
// @imgly/background-removal is licensed AGPL-3.0. It is loaded at runtime from
// a CDN, is opt-in (the "AI fallback" toggle), and nothing is fetched until a
// cut-out actually fails. If BackdoorCo needs to avoid AGPL network copyleft,
// swap AI_MODEL for a permissively-licensed provider — segmentWithAi() is the
// only thing that needs to change.
//
// The model files (~40 MB for the quantised network) are served by IMG.LY's
// static host using the package's own default publicPath, and are cached by the
// browser after the first run.

export const AI_MODEL = {
  package: "@imgly/background-removal",
  version: "1.5.8",
  // The `+esm` build bundles its onnxruntime-web peer dependency.
  url: "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm",
  // The smallest shipped network; "isnet_fp16" (~80 MB) is the default and is
  // more accurate but a much heavier first download.
  model: "isnet_quint8",
};

let modulePromise = null;

/** Whether this environment can even attempt the download. */
export function isAiAvailable() {
  return typeof fetch === "function" && typeof URL !== "undefined";
}

async function loadModule() {
  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ AI_MODEL.url).catch((error) => {
      modulePromise = null; // let a later attempt retry
      throw new Error(`could not load ${AI_MODEL.package} (${error.message})`);
    });
  }
  return modulePromise;
}

/**
 * Fetch the model and warm the cache so the first real cut-out is not slow.
 * Safe to call early; resolves to false when the model is unavailable.
 */
export async function warmUpAi() {
  try {
    const mod = await loadModule();
    if (typeof mod.preload === "function") await mod.preload({ model: AI_MODEL.model });
    return true;
  } catch (error) {
    console.warn("AI segmentation is unavailable", error);
    return false;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("could not read the segmented image"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Segment `src` with the AI model and return a PNG data URL with the background
 * removed. Throws a readable error when the model cannot be loaded (offline,
 * blocked, or an unsupported browser), so the caller can fall back to the matte.
 *
 * @param {string} src image URL, data URL or blob URL
 * @param {{onProgress?: (info: {key: string, current: number, total: number}) => void}} options
 */
export async function segmentWithAi(src, { onProgress } = {}) {
  if (!src) throw new Error("no image to segment");
  const mod = await loadModule();
  const removeBackground = typeof mod.removeBackground === "function" ? mod.removeBackground : mod.default;
  if (typeof removeBackground !== "function") {
    throw new Error("the segmentation module did not export removeBackground");
  }

  const blob = await removeBackground(src, {
    model: AI_MODEL.model,
    output: { format: "image/png" },
    progress: typeof onProgress === "function"
      ? (key, current, total) => onProgress({ key, current, total })
      : undefined,
  });

  if (!blob) throw new Error("the segmentation model returned no image");
  return blobToDataUrl(blob);
}
