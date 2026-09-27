import { db, auth } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  buildProductHref,
  getProductCardImage,
  getProductImages,
  getProductSizes,
  getProductSortTimestamp,
  mergeCatalogProducts,
} from "../product-data.js";

const SITE_ORIGIN = "https://backdoorco.vercel.app";

const canvas = document.getElementById("assetCanvas");
const templateRoot = document.getElementById("assetTemplateRoot");
const canvasViewport = document.getElementById("canvasViewport");
const canvasScaleShell = document.getElementById("canvasScaleShell");
const productSelect = document.getElementById("productSelect");
const productSearch = document.getElementById("productSearch");
const productSnapshot = document.getElementById("productSnapshot");
const productCountLabel = document.getElementById("productCountLabel");
const templateSelect = document.getElementById("templateSelect");
const fontSelect = document.getElementById("fontSelect");
const weightSelect = document.getElementById("weightSelect");
const themeSelect = document.getElementById("themeSelect");
const kickerInput = document.getElementById("kickerInput");
const headlineInput = document.getElementById("headlineInput");
const bodyInput = document.getElementById("bodyInput");
const badgeInput = document.getElementById("badgeInput");
const ctaInput = document.getElementById("ctaInput");
const handleInput = document.getElementById("handleInput");
const promoInput = document.getElementById("promoInput");
const priceToggle = document.getElementById("priceToggle");
const priceVisitToggle = document.getElementById("priceVisitToggle");
const visitSiteUrlInput = document.getElementById("visitSiteUrlInput");
const visitUrlGroup = document.getElementById("visitUrlGroup");
const sizesToggle = document.getElementById("sizesToggle");
const imageUrlInput = document.getElementById("imageUrlInput");
const imageUploadInput = document.getElementById("imageUploadInput");
const captionOutput = document.getElementById("captionOutput");
const copyCaptionBtn = document.getElementById("copyCaptionBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resolutionLabel = document.getElementById("resolutionLabel");
const stageTitle = document.getElementById("stageTitle");
const openProductLink = document.getElementById("openProductLink");
const addQueueBtn = document.getElementById("addQueueBtn");
const queueList = document.getElementById("queueList");
const queueCount = document.getElementById("queueCount");
const batchExportBtn = document.getElementById("batchExportBtn");
const batchProgress = document.getElementById("batchProgress");
const clearQueueBtn = document.getElementById("clearQueueBtn");
const draftNameInput = document.getElementById("draftNameInput");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const draftsList = document.getElementById("draftsList");
const filterSelect = document.getElementById("filterSelect");
const blurToggle = document.getElementById("blurToggle");
const watermarkToggle = document.getElementById("watermarkToggle");
const grainSlider = document.getElementById("grainSlider");
const grainValue = document.getElementById("grainValue");
const scheduleDateInput = document.getElementById("scheduleDateInput");
const schedulePostBtn = document.getElementById("schedulePostBtn");
const scheduledGrid = document.getElementById("scheduledGrid");

const state = {
  products: [],
  filteredProducts: [],
  productId: "",
  template: "drop",
  ratio: "1-1",
  theme: "backdoor",
  font: "space-grotesk",
  fontWeight: "900",
  imageFilter: "none",
  blurOn: false,
  watermarkOn: false,
  grainIntensity: 16,
  customImageSrc: "",
  queue: [],
};

const presets = {
  drop: {
    template: "drop",
    ratio: "1-1",
    theme: "backdoor",
    kicker: "NEW DROP",
    badge: "AVAILABLE NOW",
    cta: "SHOP BACKDOOR",
    showPrice: true,
    showSizes: true,
    visitSite: false,
  },
  story: {
    template: "story",
    ratio: "9-16",
    theme: "backdoor",
    kicker: "BACKDOOR DROP",
    badge: "TAP TO SHOP",
    cta: "SHOP NOW",
    showPrice: true,
    showSizes: true,
    visitSite: false,
  },
  sale: {
    template: "sale",
    ratio: "1-1",
    theme: "red",
    kicker: "LIMITED OFFER",
    badge: "PRICE DROP",
    cta: "SHOP THE SALE",
    showPrice: true,
    showSizes: false,
    visitSite: false,
  },
  restock: {
    template: "restock",
    ratio: "1-1",
    theme: "mono",
    kicker: "RESTOCK ALERT",
    badge: "BACK IN",
    cta: "SECURE YOUR SIZE",
    showPrice: true,
    showSizes: true,
    visitSite: false,
  },
  collage: {
    template: "collage",
    ratio: "1-1",
    theme: "white",
    kicker: "NEW ARRIVALS",
    badge: "TOP 4",
    cta: "SHOP THE DROP",
    showPrice: true,
    showSizes: false,
    visitSite: false,
  },
  holiday: {
    template: "holiday",
    ratio: "1-1",
    theme: "holiday",
    kicker: "HOLIDAY DROP",
    badge: "LIMITED",
    cta: "SHOP THE SEASON",
    showPrice: true,
    showSizes: true,
    visitSite: false,
  },
  teaser: {
    template: "teaser",
    ratio: "1-1",
    theme: "teaser",
    kicker: "COMING SOON",
    badge: "COLLAB",
    cta: "SIGN UP",
    showPrice: false,
    showSizes: false,
    visitSite: true,
  },
  flash: {
    template: "flash",
    ratio: "1-1",
    theme: "red",
    kicker: "FLASH SALE",
    badge: "24H ONLY",
    cta: "SHOP NOW",
    showPrice: true,
    showSizes: false,
    visitSite: false,
  },
};

onAuthStateChanged(auth, (user) => {
  const name = user?.email?.split("@")[0] || "Admin";
  document.getElementById("userName").textContent = name;
  document.getElementById("userAvatar").textContent = name.charAt(0).toUpperCase();
  initProducts();
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

function initProducts() {
  const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

  onSnapshot(
    productsQuery,
    (snapshot) => {
      const liveProducts = [];
      snapshot.forEach((entry) => {
        liveProducts.push({ id: entry.id, ...entry.data() });
      });
      setProducts(liveProducts);
    },
    () => setProducts([])
  );

  const draftsQuery = query(collection(db, "social_drafts"), orderBy("updatedAt", "desc"));
  onSnapshot(draftsQuery, (snapshot) => renderDrafts(snapshot.docs), () => renderDrafts([]));

  const postsQuery = query(collection(db, "scheduled_posts"), orderBy("scheduledAt", "asc"));
  onSnapshot(postsQuery, (snapshot) => renderScheduledPosts(snapshot.docs), () => renderScheduledPosts([]));
}

function setProducts(liveProducts) {
  state.products = mergeCatalogProducts(liveProducts)
    .filter((product) => !product.isHidden && product.status !== "inactive")
    .sort((a, b) => getProductSortTimestamp(b) - getProductSortTimestamp(a));

  productCountLabel.textContent = `${state.products.length} products`;
  populateProducts();

  if (!state.productId && state.products[0]) {
    selectProduct(state.products[0].id, true);
  } else {
    renderAll();
  }
}

function populateProducts() {
  const term = productSearch.value.trim().toLowerCase();
  state.filteredProducts = state.products.filter((product) => {
    const haystack = [
      product.name,
      product.brand,
      product.sku,
      product.colorway,
      product.category,
    ].join(" ").toLowerCase();
    return !term || haystack.includes(term);
  });

  if (!state.filteredProducts.length) {
    productSelect.innerHTML = '<option value="">No products found</option>';
    return;
  }

  if (!state.filteredProducts.some((product) => product.id === state.productId)) {
    state.productId = state.filteredProducts[0].id;
  }

  productSelect.innerHTML = state.filteredProducts.map((product) => {
    const label = `${product.brand || "Backdoor"} - ${product.name || "Untitled"}`;
    return `<option value="${escapeHtml(product.id)}">${escapeHtml(label)}</option>`;
  }).join("");
  productSelect.value = state.productId;
}

function selectProduct(productId, seedCopy = false) {
  state.productId = productId;
  productSelect.value = productId;
  const product = getActiveProduct();
  if (product && seedCopy) seedCopyFromProduct(product);
  renderAll();
}

function seedCopyFromProduct(product) {
  headlineInput.value = product.name || "Backdoor Drop";
  bodyInput.value = buildDefaultBody(product);
}

function getActiveProduct() {
  return state.products.find((product) => product.id === state.productId) || state.products[0] || null;
}

function getCollageProducts() {
  const active = getActiveProduct();
  const lineup = [];
  if (active) lineup.push(active);
  state.products.forEach((product) => {
    if (lineup.length < 4 && product.id !== active?.id) lineup.push(product);
  });
  return lineup.slice(0, 4);
}

function applyPreset(name) {
  const preset = presets[name] || presets.drop;
  state.template = preset.template;
  state.ratio = preset.ratio;
  state.theme = preset.theme;
  templateSelect.value = preset.template;
  themeSelect.value = preset.theme;
  kickerInput.value = preset.kicker;
  badgeInput.value = preset.badge;
  ctaInput.value = preset.cta;
  priceToggle.checked = preset.showPrice;
  sizesToggle.checked = preset.showSizes;
  priceVisitToggle.checked = preset.visitSite ?? false;
  visitSiteUrlInput.value = preset.visitSiteUrl || "";
  visitUrlGroup.style.display = priceVisitToggle.checked ? "" : "none";

  const product = getActiveProduct();
  if (product) seedCopyFromProduct(product);

  document.querySelectorAll(".preset-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === name);
  });
  document.querySelectorAll("#ratioGroup .segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.ratio === state.ratio);
  });

  renderAll();
}

function renderAll() {
  renderProductSnapshot();
  renderCanvas();
  updateFont();
  applyEffects();
  updateCaption();
  updateStageMeta();
  fitCanvas();
  renderQueueUI();
}

function renderProductSnapshot() {
  const product = getActiveProduct();
  if (!product) {
    productSnapshot.innerHTML = '<div class="snapshot-name">No product selected</div>';
    return;
  }

  const image = resolveAssetUrl(getProductCardImage(product));
  const sizes = getSizesText(product);
  productSnapshot.innerHTML = `
    <img class="snapshot-img" src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "Product")}" onerror="this.style.display='none';" />
    <div>
      <div class="snapshot-name">${escapeHtml(product.name || "Untitled product")}</div>
      <div class="snapshot-meta">${escapeHtml(product.brand || "Backdoor")} / ${escapeHtml(product.category || "Product")} / ${formatMoney(product.price)}</div>
      <div class="snapshot-sizes">${escapeHtml(sizes || "Sizes not set")}</div>
    </div>
  `;
}

function renderCanvas() {
  const product = getActiveProduct();
  canvas.className = `asset-canvas ratio-${state.ratio} theme-${state.theme}`;

  if (!product && state.template !== "collage") {
    templateRoot.innerHTML = '<div class="canvas-card"><div class="empty-product">Select a product</div></div>';
    return;
  }

  if (state.template === "story") {
    templateRoot.innerHTML = renderStoryTemplate(product);
  } else if (state.template === "sale") {
    templateRoot.innerHTML = renderSaleTemplate(product);
  } else if (state.template === "restock") {
    templateRoot.innerHTML = renderRestockTemplate(product);
  } else if (state.template === "collage") {
    templateRoot.innerHTML = renderCollageTemplate();
  } else if (state.template === "holiday") {
    templateRoot.innerHTML = renderHolidayTemplate(product);
  } else if (state.template === "teaser") {
    templateRoot.innerHTML = renderTeaserTemplate(product);
  } else if (state.template === "flash") {
    templateRoot.innerHTML = renderFlashTemplate(product);
  } else {
    templateRoot.innerHTML = renderDropTemplate(product);
  }
}

function renderDropTemplate(product) {
  return `
    <article class="canvas-card template-drop">
      ${badgeMarkup()}
      <div class="copy-zone">
        ${brandMark()}
        <div class="copy-stack">
          <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
          ${titleMarkup()}
          <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
          ${priceAndSizesMarkup(product)}
          <div class="canvas-cta">${escapeHtml(ctaInput.value)}</div>
        </div>
        <div class="canvas-meta">${escapeHtml(handleInput.value)} / BACKDOORCO.XYZ</div>
      </div>
      ${productMedia(product)}
    </article>
  `;
}

function renderStoryTemplate(product) {
  return `
    <article class="canvas-card template-story">
      ${badgeMarkup()}
      ${brandMark()}
      ${productMedia(product)}
      <div class="story-footer">
        <div>
          <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
          ${titleMarkup()}
          <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
        </div>
        <div>
          ${priceAndSizesMarkup(product)}
          <div class="canvas-cta">${escapeHtml(ctaInput.value)}</div>
        </div>
      </div>
    </article>
  `;
}

function renderSaleTemplate(product) {
  return `
    <article class="canvas-card template-sale">
      ${badgeMarkup()}
      <div class="copy-zone">
        ${brandMark()}
        <div>
          <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
          <div class="sale-price">${priceToggle.checked ? (priceVisitToggle.checked ? '<span class="canvas-price--visit">Visit site for price' + (visitSiteUrlInput.value.trim() ? '<div class="canvas-visit-url">' + escapeHtml(visitSiteUrlInput.value.trim().replace(/^https?:\/\//, '')) + '</div>' : '') + '</span>' : escapeHtml(formatMoney(product?.price || 0))) : ''}</div>
          ${titleMarkup()}
          <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
        </div>
        <div>
          ${promoInput.value ? `<div class="canvas-sizes">CODE ${escapeHtml(promoInput.value)}</div>` : ""}
          <div class="canvas-cta">${escapeHtml(ctaInput.value)}</div>
        </div>
      </div>
      ${productMedia(product)}
    </article>
  `;
}

function renderRestockTemplate(product) {
  const sizes = getProductSizes(product).slice(0, 8);
  const sizeRows = sizes.length
    ? sizes.map((entry) => `<div class="restock-row"><span>${escapeHtml(entry.size)}</span><span>${entry.stock > 0 ? "READY" : "ORDER"}</span></div>`).join("")
    : '<div class="restock-row"><span>SIZES</span><span>READY</span></div>';

  return `
    <article class="canvas-card template-restock">
      ${badgeMarkup()}
      <div class="copy-zone">
        ${brandMark()}
        <div>
          <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
          ${titleMarkup()}
          <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
        </div>
        <div class="restock-list">${sizeRows}</div>
      </div>
      ${productMedia(product)}
    </article>
  `;
}

function renderCollageTemplate() {
  const lineup = getCollageProducts();
  const cards = lineup.map((product) => {
    const image = resolveAssetUrl(getProductCardImage(product));
    return `
      <div class="collage-card">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "Product")}" crossorigin="anonymous" onerror="this.style.display='none';" />
        <div>
          <div class="collage-name">${escapeHtml(product.name || "Backdoor Product")}</div>
          <div class="collage-price">${priceToggle.checked ? (priceVisitToggle.checked ? '<span class="canvas-price--visit">Visit site for price' + (visitSiteUrlInput.value.trim() ? '<div class="canvas-visit-url">' + escapeHtml(visitSiteUrlInput.value.trim().replace(/^https?:\/\//, '')) + '</div>' : '') + '</span>' : escapeHtml(formatMoney(product.price))) : ''}</div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <article class="canvas-card template-collage">
      ${badgeMarkup()}
      <div>
        ${brandMark()}
        <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
      </div>
      <div class="collage-grid">${cards}</div>
      <div>
        ${titleMarkup()}
        <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
        <div class="canvas-cta">${escapeHtml(ctaInput.value)}</div>
      </div>
    </article>
  `;
}

function renderHolidayTemplate(product) {
  return `
    <article class="canvas-card template-holiday">
      ${badgeMarkup()}
      <div class="copy-zone">
        ${brandMark()}
        <div class="copy-stack">
          <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
          ${titleMarkup()}
          <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
          ${priceAndSizesMarkup(product)}
          <div class="canvas-cta">${escapeHtml(ctaInput.value)}</div>
        </div>
        <div class="canvas-meta">${escapeHtml(handleInput.value)} / BACKDOORCO.XYZ</div>
      </div>
      ${productMedia(product)}
    </article>
  `;
}

function renderTeaserTemplate(product) {
  return `
    <article class="canvas-card template-teaser">
      ${badgeMarkup()}
      ${brandMark()}
      <div class="teaser-icon">🔒</div>
      <div>
        ${titleMarkup()}
        <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
      </div>
      <div class="teaser-reveal">${escapeHtml(ctaInput.value)}</div>
      <div class="canvas-meta">${escapeHtml(handleInput.value)} / BACKDOORCO.XYZ</div>
    </article>
  `;
}

function renderFlashTemplate(product) {
  return `
    <article class="canvas-card template-flash">
      ${badgeMarkup()}
      <div class="copy-zone">
        ${brandMark()}
        <div>
          <div class="canvas-kicker">${escapeHtml(kickerInput.value)}</div>
          <div class="flash-price">${priceToggle.checked ? (priceVisitToggle.checked ? '<span class="canvas-price--visit">Visit site for price' + (visitSiteUrlInput.value.trim() ? '<div class="canvas-visit-url">' + escapeHtml(visitSiteUrlInput.value.trim().replace(/^https?:\/\//, '')) + '</div>' : '') + '</span>' : escapeHtml(formatMoney(product?.price || 0))) : ''}</div>
          ${titleMarkup()}
          <div class="canvas-body">${escapeHtml(bodyInput.value)}</div>
          <div class="flash-timer">⏰ 24:00:00</div>
        </div>
        <div>
          ${promoInput.value ? `<div class="canvas-sizes">CODE ${escapeHtml(promoInput.value)}</div>` : ""}
          <div class="canvas-cta">${escapeHtml(ctaInput.value)}</div>
        </div>
      </div>
      ${productMedia(product)}
    </article>
  `;
}

function productMedia(product) {
  const image = getSelectedImage(product);
  if (!image) {
    return '<div class="product-media"><div class="empty-product">Add product image</div></div>';
  }

  return `
    <div class="product-media">
      <div class="media-plate"></div>
      <img src="${escapeHtml(image)}" alt="${escapeHtml(product?.name || "Product")}" crossorigin="anonymous" onerror="this.style.display='none';" />
    </div>
  `;
}

function titleMarkup() {
  const headline = headlineInput.value || "Backdoor Drop";
  const sizeClass = headline.length > 54 ? " title-long" : headline.length > 36 ? " title-mid" : "";
  return `<h1 class="canvas-title${sizeClass}">${escapeHtml(headline)}</h1>`;
}

function badgeMarkup() {
  const badge = badgeInput.value.trim();
  return badge ? `<div class="canvas-badge">${escapeHtml(badge)}</div>` : "";
}

function brandMark() {
  return `
    <div class="brand-mark">
      <strong>B</strong>
      <span>BACK<em>DOOR</em></span>
    </div>
  `;
}

function priceAndSizesMarkup(product) {
  let price = '';
  if (priceToggle.checked) {
    if (priceVisitToggle.checked) {
      const url = visitSiteUrlInput.value.trim();
      const urlDisplay = url ? `<div class="canvas-visit-url">${escapeHtml(url.replace(/^https?:\/\//, ''))}</div>` : '';
      price = `<div class="canvas-price canvas-price--visit">Visit site for price${urlDisplay}</div>`;
    } else {
      price = `<div class="canvas-price">${escapeHtml(formatMoney(product?.price || 0))}</div>`;
    }
  }
  const sizes = sizesToggle.checked ? `<div class="canvas-sizes">${escapeHtml(getSizesText(product))}</div>` : "";
  return `<div>${price}${sizes}</div>`;
}

function getSelectedImage(product) {
  const override = imageUrlInput.value.trim();
  if (override) return resolveAssetUrl(override);
  if (state.customImageSrc) return state.customImageSrc;
  return resolveAssetUrl(getProductCardImage(product) || getProductImages(product)[0]);
}

function getSizesText(product) {
  const sizes = getProductSizes(product).map((entry) => entry.size).filter(Boolean);
  if (!sizes.length) return "";
  if (sizes.length <= 8) return `Sizes ${sizes.join(", ")}`;
  return `Sizes ${sizes[0]} - ${sizes[sizes.length - 1]}`;
}

function buildDefaultBody(product) {
  const parts = [];
  if (product.brand) parts.push(product.brand);
  if (product.colorway) parts.push(product.colorway);
  const sizeText = getSizesText(product);
  if (sizeText) parts.push(sizeText);
  return `${parts.join(" / ")}. Available now at Backdoor.`;
}

function updateCaption() {
  const product = getActiveProduct();
  const headline = headlineInput.value || product?.name || "Backdoor Drop";
  const body = bodyInput.value || "";
  const cta = ctaInput.value || "SHOP BACKDOOR";
  const handle = handleInput.value || "@backdoorco";
  const brandTag = hashtag(product?.brand || "Backdoor");
  const categoryTag = hashtag(product?.category || "Streetwear");
  const productUrl = product ? `${SITE_ORIGIN}/${buildProductHref(product)}` : SITE_ORIGIN;
  const promoLine = promoInput.value ? `Code: ${promoInput.value}\n` : "";
  let caption;

  if (state.template === "collage") {
    const list = getCollageProducts().map((entry, index) => `${index + 1}. ${entry.name} - ${formatMoney(entry.price)}`).join("\n");
    caption = `Backdoor new arrivals\n\n${list}\n\n${cta}: ${SITE_ORIGIN}/shop-all\n${handle}\n\n#Backdoor #BackdoorCo #NewDrops #Streetwear #SneakerDrops`;
  } else if (state.template === "sale") {
    caption = `${headline}\n${body}\n${promoLine}\n${cta}: ${productUrl}\n${handle}\n\n#Backdoor #BackdoorCo #Sale #${brandTag} #${categoryTag}`;
  } else if (state.template === "restock") {
    caption = `Restock alert: ${headline}\n${body}\n\n${cta}: ${productUrl}\n${handle}\n\n#Backdoor #BackdoorCo #Restock #${brandTag} #SneakerRestock`;
  } else if (state.template === "holiday") {
    caption = `🎄 ${headline}\n${body}\n\n${cta}: ${productUrl}\n${handle}\n\n#Backdoor #BackdoorCo #HolidayDrop #${brandTag} #SneakerSeason`;
  } else if (state.template === "teaser") {
    caption = `👀 ${headline}\n${body}\n\n${cta}: ${SITE_ORIGIN}/shop-all\n${handle}\n\n#Backdoor #BackdoorCo #ComingSoon #${brandTag} #Collab`;
  } else if (state.template === "flash") {
    caption = `⚡ ${headline}\n${body}\n${promoLine}\n\n${cta}: ${productUrl}\n${handle}\n\n#Backdoor #BackdoorCo #FlashSale #${brandTag} #LimitedTime`;
  } else {
    caption = `${headline}\n${body}\n\n${cta}: ${productUrl}\n${handle}\n\n#Backdoor #BackdoorCo #NewDrop #${brandTag} #${categoryTag}`;
  }

  captionOutput.value = caption.replace(/\n{3,}/g, "\n\n").trim();
}

function updateStageMeta() {
  const size = getCanvasSize();
  const templateLabel = templateSelect.options[templateSelect.selectedIndex]?.textContent || "Product Drop";
  stageTitle.textContent = templateLabel;
  resolutionLabel.textContent = `${size.width} x ${size.height}`;

  const product = getActiveProduct();
  if (product) {
    openProductLink.href = `../${buildProductHref(product)}`;
  } else {
    openProductLink.href = "../shop-all.html";
  }
}

const FONT_WEIGHT_MAP = {
  "space-grotesk": ["400", "500", "600", "700"],
  "inter": ["400", "700", "900"],
  "bebas": ["400"],
  "playfair": ["400", "700", "900"],
  "oswald": ["400", "700"],
  "poppins": ["400", "700", "900"],
};

const WEIGHT_LABELS = {
  "300": "Light",
  "400": "Regular",
  "500": "Medium",
  "600": "Semi Bold",
  "700": "Bold",
  "900": "Black",
};

function populateWeightOptions(fontKey) {
  const available = FONT_WEIGHT_MAP[fontKey] || ["400", "700", "900"];
  const current = weightSelect.value;
  const selected = available.includes(current) ? current : available[available.length - 1];

  weightSelect.innerHTML = available.map(w =>
    `<option value="${w}"${w === selected ? " selected" : ""}>${WEIGHT_LABELS[w] || w}</option>`
  ).join("");

  state.fontWeight = selected;
}

function updateFont() {
  const fonts = {
    "space-grotesk": '"Space Grotesk", sans-serif',
    "inter": '"Inter", sans-serif',
    "bebas": '"Bebas Neue", cursive',
    "playfair": '"Playfair Display", serif',
    "oswald": '"Oswald", sans-serif',
    "poppins": '"Poppins", sans-serif',
  };
  canvas.style.setProperty("--canvas-font", fonts[state.font] || fonts["space-grotesk"]);
  canvas.style.setProperty("--canvas-weight", state.fontWeight);
}

/* ─── Drafts ─── */
function getDraftState() {
  return {
    template: state.template,
    ratio: state.ratio,
    theme: state.theme,
    font: state.font,
    fontWeight: state.fontWeight,
    productId: state.productId,
    imageFilter: state.imageFilter,
    blurOn: state.blurOn,
    watermarkOn: state.watermarkOn,
    grainIntensity: state.grainIntensity,
    copy: {
      kicker: kickerInput.value,
      headline: headlineInput.value,
      body: bodyInput.value,
      badge: badgeInput.value,
      cta: ctaInput.value,
      handle: handleInput.value,
      promo: promoInput.value,
    },
    media: {
      showPrice: priceToggle.checked,
      showSizes: sizesToggle.checked,
      visitSite: priceVisitToggle.checked,
      visitSiteUrl: visitSiteUrlInput.value,
      imageUrl: imageUrlInput.value,
    },
  };
}

async function saveDraft() {
  const name = draftNameInput.value.trim() || "Untitled Draft";
  await addDoc(collection(db, "social_drafts"), {
    name,
    settings: getDraftState(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  draftNameInput.value = "";
}

function loadDraft(draft) {
  const s = draft.settings;
  state.template = s.template;
  state.ratio = s.ratio;
  state.theme = s.theme;
  state.font = s.font || "space-grotesk";
  state.fontWeight = s.fontWeight || "900";
  state.imageFilter = s.imageFilter || "none";
  state.blurOn = s.blurOn || false;
  state.watermarkOn = s.watermarkOn || false;
  state.grainIntensity = s.grainIntensity ?? 16;

  templateSelect.value = s.template;
  themeSelect.value = s.theme;
  fontSelect.value = s.font || "space-grotesk";
  weightSelect.value = s.fontWeight || "900";
  populateWeightOptions(s.font || "space-grotesk");
  filterSelect.value = s.imageFilter || "none";
  blurToggle.checked = s.blurOn || false;
  watermarkToggle.checked = s.watermarkOn || false;
  grainSlider.value = s.grainIntensity ?? 16;
  grainValue.textContent = (s.grainIntensity ?? 16) + "%";

  kickerInput.value = s.copy?.kicker || "";
  headlineInput.value = s.copy?.headline || "";
  bodyInput.value = s.copy?.body || "";
  badgeInput.value = s.copy?.badge || "";
  ctaInput.value = s.copy?.cta || "";
  handleInput.value = s.copy?.handle || "";
  promoInput.value = s.copy?.promo || "";

  priceToggle.checked = s.media?.showPrice ?? true;
  sizesToggle.checked = s.media?.showSizes ?? true;
  priceVisitToggle.checked = s.media?.visitSite ?? false;
  visitSiteUrlInput.value = s.media?.visitSiteUrl || "";
  imageUrlInput.value = s.media?.imageUrl || "";
  visitUrlGroup.style.display = (s.media?.visitSite) ? "" : "none";
  priceVisitToggle.disabled = !(s.media?.showPrice ?? true);

  if (s.productId && state.products.some(p => p.id === s.productId)) {
    state.productId = s.productId;
    productSelect.value = s.productId;
  }

  renderAll();
}

async function deleteDraft(draftId) {
  await deleteDoc(doc(db, "social_drafts", draftId));
}

function renderDrafts(docs) {
  if (!docs || !docs.length) {
    draftsList.innerHTML = "";
    return;
  }
  const sorted = docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));

  draftsList.innerHTML = sorted.map(d => {
    const date = d.updatedAt?.toDate?.() || new Date();
    const timeStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="draft-item" data-draft="${d.id}">
        <div class="draft-info">
          <div class="draft-name">${escapeHtml(d.name || "Untitled")}</div>
          <div class="draft-date">${timeStr}</div>
        </div>
        <button class="draft-delete" data-delete="${d.id}" title="Delete">&times;</button>
      </div>
    `;
  }).join("");

  draftsList.querySelectorAll(".draft-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return;
      const draft = sorted.find(d => d.id === el.dataset.draft);
      if (draft) loadDraft(draft);
    });
  });

  draftsList.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteDraft(btn.dataset.delete);
    });
  });
}

/* ─── Effects ─── */
function applyEffects() {
  const images = templateRoot.querySelectorAll(".product-media img");
  images.forEach(img => {
    img.dataset.filter = state.imageFilter === "none" ? "" : state.imageFilter;
  });

  const mediaEls = templateRoot.querySelectorAll(".product-media");
  mediaEls.forEach(el => {
    el.classList.toggle("blur-bg", state.blurOn);
  });

  updateWatermark();
  canvas.style.setProperty("--grain-opacity", state.grainIntensity / 100);
  grainValue.textContent = state.grainIntensity + "%";
}

function updateWatermark() {
  let wm = templateRoot.querySelector(".canvas-watermark");
  if (state.watermarkOn && !wm) {
    wm = document.createElement("div");
    wm.className = "canvas-watermark";
    wm.innerHTML = "<strong>B</strong> BACKDOOR";
    templateRoot.appendChild(wm);
  } else if (!state.watermarkOn && wm) {
    wm.remove();
  }
}

/* ─── Scheduler ─── */
async function schedulePost() {
  const dateVal = scheduleDateInput.value;
  if (!dateVal) { alert("Select a date and time first."); return; }
  const scheduledAt = new Date(dateVal);
  if (scheduledAt <= new Date()) { alert("Pick a future date and time."); return; }

  if (!window.html2canvas) { alert("Export library still loading."); return; }

  const origBtn = schedulePostBtn.innerHTML;
  schedulePostBtn.disabled = true;
  schedulePostBtn.innerHTML = "Scheduling...";
  const origT = canvas.style.transform;
  canvas.style.transform = "none";

  try {
    const rendered = await window.html2canvas(canvas, {
      useCORS: true, allowTaint: true, backgroundColor: null, scale: 1,
      width: canvas.offsetWidth, height: canvas.offsetHeight,
      windowWidth: canvas.offsetWidth, windowHeight: canvas.offsetHeight, logging: false,
    });

    await addDoc(collection(db, "scheduled_posts"), {
      scheduledAt: Timestamp.fromDate(scheduledAt),
      imageBase64: rendered.toDataURL("image/png"),
      caption: captionOutput.value,
      productName: getActiveProduct()?.name || "Untitled",
      templateName: state.template,
      createdAt: serverTimestamp(),
      status: "scheduled",
    });

    scheduleDateInput.value = "";
    alert("Post scheduled!");
  } catch (e) {
    console.error("Schedule failed", e);
    alert("Scheduling failed. Try again.");
  } finally {
    canvas.style.transform = origT;
    schedulePostBtn.disabled = false;
    schedulePostBtn.innerHTML = origBtn;
  }
}

function renderScheduledPosts(docs) {
  if (!docs || !docs.length) {
    scheduledGrid.innerHTML = "";
    return;
  }

  const sorted = docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.scheduledAt?.toMillis?.() || 0) - (b.scheduledAt?.toMillis?.() || 0));

  scheduledGrid.innerHTML = sorted.map(p => {
    const date = p.scheduledAt?.toDate?.() || new Date();
    const timeStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="scheduled-card">
        <img src="${p.imageBase64 || ""}" alt="" />
        <div class="sched-info">
          <div class="sched-time">${timeStr}</div>
          <div class="sched-caption">${escapeHtml((p.caption || "").slice(0, 60))}</div>
        </div>
        <button class="sched-delete" data-delete="${p.id}" title="Delete">&times;</button>
      </div>
    `;
  }).join("");

  scheduledGrid.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteScheduledPost(btn.dataset.delete));
  });
}

async function deleteScheduledPost(postId) {
  await deleteDoc(doc(db, "scheduled_posts", postId));
}

function fitCanvas() {
  const size = getCanvasSize();
  const bounds = canvasViewport.getBoundingClientRect();
  const padding = 52;
  const scale = Math.min(
    1,
    Math.max(0.2, (bounds.width - padding) / size.width),
    Math.max(0.2, (bounds.height - padding) / size.height)
  );

  canvasScaleShell.style.width = `${size.width * scale}px`;
  canvasScaleShell.style.height = `${size.height * scale}px`;
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = "top left";
}

function getCanvasSize() {
  if (state.ratio === "9-16") return { width: 1080, height: 1920 };
  if (state.ratio === "16-9") return { width: 1200, height: 675 };
  return { width: 1080, height: 1080 };
}

function resolveAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `../${raw.replace(/^\.?\//, "")}`;
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function hashtag(value) {
  return String(value || "Backdoor").replace(/[^a-z0-9]/gi, "");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderQueueUI() {
  const items = state.queue.map(id => state.products.find(p => p.id === id)).filter(Boolean);
  queueList.innerHTML = items.map(p =>
    `<div class="queue-chip"><span>${escapeHtml((p.brand || "Backdoor") + " - " + (p.name || "Untitled"))}</span><button data-remove="${escapeHtml(p.id)}" title="Remove">&times;</button></div>`
  ).join("");
  queueCount.textContent = items.length + " items";
  batchExportBtn.disabled = !items.length;
  clearQueueBtn.style.display = items.length ? "" : "none";
  document.querySelectorAll("#queueList button[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { state.queue = state.queue.filter(i => i !== btn.dataset.remove); renderQueueUI(); });
  });
  addQueueBtn.disabled = !!state.queue.find(id => id === state.productId);
}

function addToQueue() {
  if (!state.productId || state.queue.includes(state.productId)) return;
  state.queue.push(state.productId);
  renderQueueUI();
}

function clearQueue() {
  state.queue = [];
  renderQueueUI();
}

async function exportQueue() {
  if (!window.html2canvas || !window.JSZip) { alert("Libraries still loading..."); return; }
  const items = state.queue.map(id => state.products.find(p => p.id === id)).filter(Boolean);
  if (!items.length) return;

  const origBtn = batchExportBtn.innerHTML;
  const savedPid = state.productId;
  const savedCustom = state.customImageSrc;
  const savedTemplate = state.template, savedRatio = state.ratio, savedTheme = state.theme;
  const savedHeadline = headlineInput.value, savedBody = bodyInput.value;
  const origT = canvas.style.transform, origClass = canvas.className;
  batchExportBtn.disabled = true;
  batchExportBtn.innerHTML = "Exporting...";
  batchProgress.style.display = "block";
  batchProgress.firstChild.style.width = "0%";
  canvas.style.transform = "none";

  const zip = new window.JSZip();
  let ok = 0;
  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    try {
      state.customImageSrc = "";
      selectProduct(p.id, true);
      canvas.className = "asset-canvas ratio-" + state.ratio + " theme-" + state.theme;
      await new Promise(r => setTimeout(r, 150));
      const rendered = await window.html2canvas(canvas, {
        useCORS: true, allowTaint: true, backgroundColor: null, scale: 2,
        width: canvas.offsetWidth, height: canvas.offsetHeight,
        windowWidth: canvas.offsetWidth, windowHeight: canvas.offsetHeight, logging: false
      });
      zip.file("backdoor_" + state.template + "_" + slugify(p.name || "asset") + ".png",
        rendered.toDataURL("image/png").split(",")[1], { base64: true });
      ok++;
    } catch (e) {
      console.error("Failed to export", p.name, e);
    }
    batchProgress.firstChild.style.width = ((i + 1) / items.length * 100) + "%";
  }

  state.customImageSrc = savedCustom;
  state.template = savedTemplate; state.ratio = savedRatio; state.theme = savedTheme;
  headlineInput.value = savedHeadline; bodyInput.value = savedBody;
  templateSelect.value = savedTemplate; themeSelect.value = savedTheme;
  canvas.className = origClass;
  canvas.style.transform = origT;
  selectProduct(savedPid, false);
  batchProgress.style.display = "none";
  batchExportBtn.disabled = false;
  batchExportBtn.innerHTML = origBtn;

  if (!ok) { alert("Export failed. Check console for details."); return; }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.download = "backdoor_batch_" + new Date().toISOString().slice(0, 10) + ".zip";
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
  alert("Batch export complete! " + ok + "/" + items.length + " files");
}

productSearch.addEventListener("input", () => {
  populateProducts();
  renderAll();
});

productSelect.addEventListener("change", () => selectProduct(productSelect.value, true));

document.querySelectorAll(".preset-btn").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

document.querySelectorAll("#ratioGroup .segment").forEach((button) => {
  button.addEventListener("click", () => {
    state.ratio = button.dataset.ratio;
    document.querySelectorAll("#ratioGroup .segment").forEach((entry) => {
      entry.classList.toggle("active", entry === button);
    });
    renderAll();
  });
});

templateSelect.addEventListener("change", () => {
  state.template = templateSelect.value;
  renderAll();
});

themeSelect.addEventListener("change", () => {
  state.theme = themeSelect.value;
  renderAll();
});

fontSelect.addEventListener("change", () => {
  state.font = fontSelect.value;
  populateWeightOptions(state.font);
  renderAll();
});

weightSelect.addEventListener("change", () => {
  state.fontWeight = weightSelect.value;
  renderAll();
});

filterSelect.addEventListener("change", () => {
  state.imageFilter = filterSelect.value;
  applyEffects();
});

blurToggle.addEventListener("change", () => {
  state.blurOn = blurToggle.checked;
  applyEffects();
});

watermarkToggle.addEventListener("change", () => {
  state.watermarkOn = watermarkToggle.checked;
  applyEffects();
});

grainSlider.addEventListener("input", () => {
  state.grainIntensity = parseInt(grainSlider.value) || 0;
  canvas.style.setProperty("--grain-opacity", state.grainIntensity / 100);
  grainValue.textContent = state.grainIntensity + "%";
});

saveDraftBtn.addEventListener("click", saveDraft);

schedulePostBtn.addEventListener("click", schedulePost);

[
  kickerInput,
  headlineInput,
  bodyInput,
  badgeInput,
  ctaInput,
  handleInput,
  promoInput,
  imageUrlInput,
].forEach((input) => {
  input.addEventListener("input", renderAll);
});

[priceToggle, priceVisitToggle, sizesToggle].forEach((input) => {
  input.addEventListener("change", () => {
    if (input === priceToggle) {
      priceVisitToggle.disabled = !priceToggle.checked;
      if (!priceToggle.checked) priceVisitToggle.checked = false;
    }
    visitUrlGroup.style.display = priceVisitToggle.checked ? "" : "none";
    renderAll();
  });
});

visitSiteUrlInput.addEventListener("input", renderAll);

imageUploadInput.addEventListener("change", () => {
  const file = imageUploadInput.files?.[0];
  if (!file) {
    state.customImageSrc = "";
    renderAll();
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    state.customImageSrc = String(event.target?.result || "");
    imageUrlInput.value = "";
    renderAll();
  };
  reader.readAsDataURL(file);
});

copyCaptionBtn.addEventListener("click", async () => {
  const text = captionOutput.value;
  try {
    await navigator.clipboard.writeText(text);
    copyCaptionBtn.textContent = "Copied";
    copyCaptionBtn.classList.add("copied");
    setTimeout(() => {
      copyCaptionBtn.textContent = "Copy Caption";
      copyCaptionBtn.classList.remove("copied");
    }, 1300);
  } catch {
    captionOutput.select();
    document.execCommand("copy");
  }
});

downloadBtn.addEventListener("click", async () => {
  if (!window.html2canvas) {
    window.alert("Export library is still loading.");
    return;
  }

  const originalText = downloadBtn.innerHTML;
  const originalTransform = canvas.style.transform;
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = "Rendering...";
  canvas.style.transform = "none";

  try {
    const rendered = await window.html2canvas(canvas, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 2,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
      windowWidth: canvas.offsetWidth,
      windowHeight: canvas.offsetHeight,
      logging: false,
    });
    const product = getActiveProduct();
    const link = document.createElement("a");
    link.download = `backdoor_${state.template}_${slugify(product?.name || "asset")}.png`;
    link.href = rendered.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Export failed", error);
    window.alert("Export failed. Try a different image source if the selected image blocks canvas export.");
  } finally {
    canvas.style.transform = originalTransform;
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = originalText;
  }
});

window.addEventListener("resize", fitCanvas);

addQueueBtn.addEventListener("click", addToQueue);
batchExportBtn.addEventListener("click", exportQueue);
clearQueueBtn.addEventListener("click", clearQueue);

applyPreset("drop");
populateWeightOptions(state.font);
