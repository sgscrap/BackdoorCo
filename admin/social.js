import { db, auth } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
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

const SITE_ORIGIN = "https://backdoorco.xyz";

const canvas = document.getElementById("assetCanvas");
const templateRoot = document.getElementById("assetTemplateRoot");
const canvasViewport = document.getElementById("canvasViewport");
const canvasScaleShell = document.getElementById("canvasScaleShell");
const productSelect = document.getElementById("productSelect");
const productSearch = document.getElementById("productSearch");
const productSnapshot = document.getElementById("productSnapshot");
const productCountLabel = document.getElementById("productCountLabel");
const templateSelect = document.getElementById("templateSelect");
const themeSelect = document.getElementById("themeSelect");
const kickerInput = document.getElementById("kickerInput");
const headlineInput = document.getElementById("headlineInput");
const bodyInput = document.getElementById("bodyInput");
const badgeInput = document.getElementById("badgeInput");
const ctaInput = document.getElementById("ctaInput");
const handleInput = document.getElementById("handleInput");
const promoInput = document.getElementById("promoInput");
const priceToggle = document.getElementById("priceToggle");
const sizesToggle = document.getElementById("sizesToggle");
const imageUrlInput = document.getElementById("imageUrlInput");
const imageUploadInput = document.getElementById("imageUploadInput");
const captionOutput = document.getElementById("captionOutput");
const copyCaptionBtn = document.getElementById("copyCaptionBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resolutionLabel = document.getElementById("resolutionLabel");
const stageTitle = document.getElementById("stageTitle");
const openProductLink = document.getElementById("openProductLink");

const state = {
  products: [],
  filteredProducts: [],
  productId: "",
  template: "drop",
  ratio: "1-1",
  theme: "backdoor",
  customImageSrc: "",
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
  },
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const name = user.email?.split("@")[0] || "Admin";
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
  updateCaption();
  updateStageMeta();
  fitCanvas();
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
          <div class="sale-price">${escapeHtml(formatMoney(product?.price || 0))}</div>
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
          <div class="collage-price">${escapeHtml(formatMoney(product.price))}</div>
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
  const price = priceToggle.checked ? `<div class="canvas-price">${escapeHtml(formatMoney(product?.price || 0))}</div>` : "";
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

[priceToggle, sizesToggle].forEach((input) => {
  input.addEventListener("change", renderAll);
});

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
applyPreset("drop");
