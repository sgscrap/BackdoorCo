// Helpers for importing a prepared Instagram rollout into the Backdoor Asset
// Studio. Pure and DOM-free so the studio (admin/social.js) and the unit tests
// can share the same parsing/validation and control mapping.
//
// The shape consumed here is the one produced by
// scripts/prepare-instagram-rollout.js (admin/instagram-rollout.prepared.json).

export const ROLLOUT_URL = "instagram-rollout.prepared.json";

// A bare filename in the same directory: no scheme, no slashes, no traversal.
const ROLLOUT_FILENAME = /^[a-z0-9][a-z0-9._-]*\.json$/i;

/**
 * Resolve which prepared file the studio should load.
 *
 * The default is ROLLOUT_URL; a `?rollout=<filename>` query parameter overrides
 * it so a generated (or any alternate) prepared rollout can be previewed without
 * disturbing the curated file. Anything that is not a bare relative .json
 * filename is ignored, so the page can never be pointed at another origin.
 */
export function resolveRolloutUrl(search = "") {
  const requested = String(new URLSearchParams(search).get("rollout") || "").trim();
  return ROLLOUT_FILENAME.test(requested) ? requested : ROLLOUT_URL;
}

export const TEMPLATES = ["drop", "story", "sale", "restock", "collage", "holiday", "teaser", "flash"];
export const THEMES = ["backdoor", "mono", "white", "volt", "red", "holiday", "teaser"];
export const RATIOS = ["1-1", "9-16", "16-9"];
export const IMAGE_FILTERS = ["none", "grayscale", "sepia", "contrast", "warm", "cool"];

const TEMPLATE_SET = new Set(TEMPLATES);
const RATIO_SET = new Set(RATIOS);
const THEME_SET = new Set(THEMES);
const FILTER_SET = new Set(IMAGE_FILTERS);

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

/**
 * Fold the studio's current control values back into a rollout asset, so edits
 * made while previewing can be kept instead of being lost. Identity fields
 * (id, order, carouselGroup, filename, schedule) are preserved; everything the
 * studio owns — template, ratio, theme, productRef, copy, toggles, effects — is
 * replaced with what the controls now hold.
 */
export function captureStudioControls(asset = {}, controls = {}) {
  const source = asset && typeof asset === "object" ? asset : {};
  const copy = controls.copy && typeof controls.copy === "object" ? controls.copy : {};
  const ratio = text(controls.ratio);
  const theme = text(controls.theme);
  const filter = text(controls.imageFilter);

  return {
    ...source,
    template: text(controls.template, source.template || "drop"),
    ratio: RATIO_SET.has(ratio) ? ratio : text(source.ratio, "1-1"),
    theme: THEME_SET.has(theme) ? theme : text(source.theme, "backdoor"),
    font: text(controls.font, text(source.font, "space-grotesk")),
    fontWeight: text(controls.fontWeight, text(source.fontWeight, "900")),
    productRef: text(controls.productRef),
    copy: {
      kicker: text(copy.kicker),
      headline: text(copy.headline),
      body: text(copy.body),
      badge: text(copy.badge),
      cta: text(copy.cta),
      promo: text(copy.promo),
    },
    toggles: {
      showPrice: controls.showPrice !== false,
      showSizes: controls.showSizes !== false,
      visitSite: Boolean(controls.visitSite),
      visitSiteUrl: text(controls.visitSiteUrl),
    },
    effects: {
      imageFilter: FILTER_SET.has(filter) ? filter : "none",
      blur: Boolean(controls.blur),
      watermark: Boolean(controls.watermark),
      grain: Number.isFinite(controls.grain) ? controls.grain : 16,
    },
    imageOverride: text(controls.imageOverride),
  };
}

/**
 * Serialize a rollout back to the shape parseRollout() accepts, so a rollout
 * edited in the studio can be downloaded, re-imported, and even prepared as a
 * manifest. Assets are emitted in schedule order with normalized fields.
 */
export function serializeRollout(rollout = {}) {
  const source = rollout && typeof rollout === "object" ? rollout : {};
  const assets = Array.isArray(source.assets) ? [...source.assets] : [];
  assets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    campaign: text(source.campaign),
    brand: text(source.brand),
    handle: text(source.handle, "@backdoorco"),
    siteOrigin: text(source.siteOrigin),
    assets: assets.map((asset, index) => {
      const entry = asset && typeof asset === "object" ? asset : {};
      const copy = entry.copy && typeof entry.copy === "object" ? entry.copy : {};
      const toggles = entry.toggles && typeof entry.toggles === "object" ? entry.toggles : {};
      const effects = entry.effects && typeof entry.effects === "object" ? entry.effects : {};
      const order = Number.isFinite(entry.order) ? entry.order : index + 1;
      return {
        id: text(entry.id, `asset-${index + 1}`),
        order,
        template: text(entry.template),
        ratio: text(entry.ratio, "1-1"),
        theme: text(entry.theme, "backdoor"),
        font: text(entry.font, "space-grotesk"),
        fontWeight: text(entry.fontWeight, "900"),
        productRef: text(entry.productRef || entry.product?.id),
        carouselGroup: text(entry.carouselGroup) || null,
        filename: text(entry.filename),
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
          imageFilter: FILTER_SET.has(text(effects.imageFilter)) ? text(effects.imageFilter) : "none",
          blur: boolean(effects.blur, false),
          watermark: boolean(effects.watermark, false),
          grain: Number.isFinite(effects.grain) ? effects.grain : 16,
        },
        imageOverride: text(entry.imageOverride),
        caption: text(entry.caption),
        hashtags: Array.isArray(entry.hashtags) ? entry.hashtags.map((tag) => text(tag)).filter(Boolean) : [],
        schedule: entry.schedule && typeof entry.schedule === "object"
          ? { order, postAt: entry.schedule.postAt ?? null }
          : { order, postAt: null },
      };
    }),
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
