// Shared social-copy helpers for the Backdoor Asset Studio.
//
// These are pure, DOM-free functions so the studio (admin/social.js) and the
// Instagram rollout build script (scripts/prepare-instagram-rollout.js) produce
// byte-identical captions and export filenames. Keep them dependency-free so
// both a browser ES module import and a Node dynamic import resolve cleanly.

export const DEFAULT_HANDLE = "@backdoorco";
export const DEFAULT_BRAND = "Backdoor";

// Brand-level hashtags shared by every template branch. Kept here so the
// manifest's generated captions can never drift from the studio's live output.
const BASE_TAGS = ["#Backdoor", "#BackdoorCo"];

export function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function hashtag(value) {
  return String(value || DEFAULT_BRAND).replace(/[^a-z0-9]/gi, "");
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Collage recap used by the top-4 grid caption: "1. Name - $Price" lines.
export function collageList(products = []) {
  return products
    .map((entry, index) => `${index + 1}. ${entry?.name || "Backdoor Product"} - ${formatMoney(entry?.price)}`)
    .join("\n");
}

/**
 * Build the Instagram caption for a studio template.
 *
 * Mirrors the branches previously inlined in admin/social.js `updateCaption()`.
 * All inputs are plain values so the same call works from the live studio (DOM
 * reads) and from the rollout manifest.
 */
export function buildCaption({ template, fields = {}, product = null, origin = "", handle = "", productUrl = "", collage = [] } = {}) {
  const headline = fields.headline || product?.name || "Backdoor Drop";
  const body = fields.body || "";
  const cta = fields.cta || "SHOP BACKDOOR";
  const promoLine = fields.promo ? `Code: ${fields.promo}\n` : "";
  const handleText = handle || DEFAULT_HANDLE;
  const brandTag = hashtag(product?.brand || DEFAULT_BRAND);
  const categoryTag = hashtag(product?.category || "Streetwear");
  const shopUrl = `${origin}/shop-all`;
  const link = productUrl || origin;

  let caption;

  if (template === "collage") {
    caption = `Backdoor new arrivals\n\n${collageList(collage)}\n\n${cta}: ${shopUrl}\n${handleText}\n\n#Backdoor #BackdoorCo #NewDrops #Streetwear #SneakerDrops`;
  } else if (template === "sale") {
    caption = `${headline}\n${body}\n${promoLine}\n${cta}: ${link}\n${handleText}\n\n#Backdoor #BackdoorCo #Sale #${brandTag} #${categoryTag}`;
  } else if (template === "restock") {
    caption = `Restock alert: ${headline}\n${body}\n\n${cta}: ${link}\n${handleText}\n\n#Backdoor #BackdoorCo #Restock #${brandTag} #SneakerRestock`;
  } else if (template === "holiday") {
    caption = `🎄 ${headline}\n${body}\n\n${cta}: ${link}\n${handleText}\n\n#Backdoor #BackdoorCo #HolidayDrop #${brandTag} #SneakerSeason`;
  } else if (template === "teaser") {
    caption = `👀 ${headline}\n${body}\n\n${cta}: ${shopUrl}\n${handleText}\n\n#Backdoor #BackdoorCo #ComingSoon #${brandTag} #Collab`;
  } else if (template === "flash") {
    caption = `⚡ ${headline}\n${body}\n${promoLine}\n\n${cta}: ${link}\n${handleText}\n\n#Backdoor #BackdoorCo #FlashSale #${brandTag} #LimitedTime`;
  } else {
    caption = `${headline}\n${body}\n\n${cta}: ${link}\n${handleText}\n\n#Backdoor #BackdoorCo #NewDrop #${brandTag} #${categoryTag}`;
  }

  return caption.replace(/\n{3,}/g, "\n\n").trim();
}

// Hashtags used by a template, in display order, for the prepared manifest.
export function captionTags(template, product = null) {
  const brandTag = hashtag(product?.brand || DEFAULT_BRAND);
  const categoryTag = hashtag(product?.category || "Streetwear");
  if (template === "collage") return [...BASE_TAGS, "#NewDrops", "#Streetwear", "#SneakerDrops"];
  if (template === "sale") return [...BASE_TAGS, "#Sale", `#${brandTag}`, `#${categoryTag}`];
  if (template === "restock") return [...BASE_TAGS, "#Restock", `#${brandTag}`, "#SneakerRestock"];
  if (template === "holiday") return [...BASE_TAGS, "#HolidayDrop", `#${brandTag}`, "#SneakerSeason"];
  if (template === "teaser") return [...BASE_TAGS, "#ComingSoon", `#${brandTag}`, "#Collab"];
  if (template === "flash") return [...BASE_TAGS, "#FlashSale", `#${brandTag}`, "#LimitedTime"];
  return [...BASE_TAGS, "#NewDrop", `#${brandTag}`, `#${categoryTag}`];
}
