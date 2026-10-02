// Helpers for importing a prepared Instagram rollout into the Backdoor Asset
// Studio. Pure and DOM-free so the studio (admin/social.js) and the unit tests
// can share the same parsing/validation and control mapping.
//
// The shape consumed here is the one produced by
// scripts/prepare-instagram-rollout.js (admin/instagram-rollout.prepared.json).

export const ROLLOUT_URL = "instagram-rollout.prepared.json";

export const TEMPLATES = ["drop", "story", "sale", "restock", "collage", "holiday", "teaser", "flash"];
export const THEMES = ["backdoor", "mono", "white", "volt", "red", "holiday", "teaser"];
export const RATIOS = ["1-1", "9-16", "16-9"];
export const IMAGE_FILTERS = ["none", "grayscale", "sepia", "contrast", "warm", "cool"];

const TEMPLATE_SET = new Set(TEMPLATES);

function text(value, fallback = "") {
  return value == null ? fallback : String(value);
}

function boolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Validate and normalize a prepared rollout payload.
 * Throws with a readable message when the payload is not usable.
 */
export function parseRollout(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("rollout file is not an object");
  }
  if (!Array.isArray(payload.assets)) {
    throw new Error("rollout file has no assets array");
  }

  const seen = new Set();
  const assets = payload.assets.map((raw, index) => {
    const asset = raw && typeof raw === "object" ? raw : {};
    const id = text(asset.id, `asset-${index + 1}`);
    if (seen.has(id)) throw new Error(`duplicate asset id "${id}"`);
    seen.add(id);

    const template = text(asset.template);
    if (!TEMPLATE_SET.has(template)) throw new Error(`asset "${id}" has unknown template "${template}"`);

    const ratio = RATIOS.includes(text(asset.ratio)) ? text(asset.ratio) : "1-1";
    const theme = THEMES.includes(text(asset.theme)) ? text(asset.theme) : "backdoor";
    const filename = text(asset.filename) || `backdoor_${template}_${id}.png`;
    const copy = asset.copy && typeof asset.copy === "object" ? asset.copy : {};
    const toggles = asset.toggles && typeof asset.toggles === "object" ? asset.toggles : {};
    const effects = asset.effects && typeof asset.effects === "object" ? asset.effects : {};

    return {
      id,
      order: Number.isFinite(asset.order) ? asset.order : index + 1,
      template,
      ratio,
      theme,
      font: text(asset.font, "space-grotesk"),
      fontWeight: text(asset.fontWeight, "900"),
      productRef: text(asset.product?.id || asset.productRef),
      carouselGroup: text(asset.carouselGroup) || null,
      filename,
      caption: text(asset.caption),
      copy: {
        kicker: text(copy.kicker),
        headline: text(copy.headline),
        body: text(copy.body),
        badge: text(copy.badge),
        cta: text(copy.cta),
        promo: text(copy.promo),
      },
      toggles: {
        showPrice: boolean(toggles.showPrice, true),
        showSizes: boolean(toggles.showSizes, true),
        visitSite: boolean(toggles.visitSite, false),
        visitSiteUrl: text(toggles.visitSiteUrl),
      },
      effects: {
        imageFilter: IMAGE_FILTERS.includes(text(effects.imageFilter)) ? text(effects.imageFilter) : "none",
        blur: boolean(effects.blur, false),
        watermark: boolean(effects.watermark, false),
        grain: Number.isFinite(effects.grain) ? effects.grain : 16,
      },
      imageOverride: text(asset.imageOverride),
    };
  });

  assets.sort((a, b) => a.order - b.order);

  return {
    campaign: text(payload.campaign),
    brand: text(payload.brand),
    handle: text(payload.handle, "@backdoorco"),
    siteOrigin: text(payload.siteOrigin),
    assets,
  };
}

/** Group assets by carousel, preserving order. Ungrouped assets form their own bucket. */
export function carouselGroups(assets = []) {
  const groups = [];
  const byKey = new Map();
  for (const asset of assets) {
    const key = asset.carouselGroup || "";
    let group = byKey.get(key);
    if (!group) {
      group = { group: asset.carouselGroup || null, assets: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.assets.push(asset);
  }
  return groups;
}

/** Map a prepared asset onto the studio's control values. */
export function studioControlsFor(asset, rollout = {}) {
  return {
    productRef: asset.productRef || asset.product?.id || "",
    template: asset.template || "drop",
    ratio: asset.ratio || "1-1",
    theme: asset.theme || "backdoor",
    font: asset.font || "space-grotesk",
    fontWeight: asset.fontWeight || "900",
    imageFilter: asset.effects?.imageFilter || "none",
    blur: Boolean(asset.effects?.blur),
    watermark: Boolean(asset.effects?.watermark),
    grain: Number.isFinite(asset.effects?.grain) ? asset.effects.grain : 16,
    showPrice: asset.toggles?.showPrice !== false,
    showSizes: asset.toggles?.showSizes !== false,
    visitSite: Boolean(asset.toggles?.visitSite),
    visitSiteUrl: asset.toggles?.visitSiteUrl || "",
    imageOverride: asset.imageOverride || "",
    customImageSrc: "",
    handle: rollout.handle || "@backdoorco",
    copy: { ...asset.copy },
    filename: asset.filename,
  };
}
