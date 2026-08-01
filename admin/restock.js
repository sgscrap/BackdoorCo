import { db, auth } from "./firebase-config.js";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  buildProductHref,
  getProductCardImage,
  getProductSizes,
  getProductSortTimestamp,
  mergeCatalogProducts,
} from "../product-data.js";

const STORAGE_KEY = "backdoor:restock-links:v1";

const state = {
  products: [],
  filteredProducts: [],
  records: {},
  productId: "",
  filter: "all",
};

const productSearch = document.getElementById("productSearch");
const productSelect = document.getElementById("productSelect");
const selectedProduct = document.getElementById("selectedProduct");
const selectedStatus = document.getElementById("selectedStatus");
const purchaseUrlInput = document.getElementById("purchaseUrlInput");
const retailUrlInput = document.getElementById("retailUrlInput");
const purchaseCostInput = document.getElementById("purchaseCostInput");
const targetPriceInput = document.getElementById("targetPriceInput");
const restockStatusInput = document.getElementById("restockStatusInput");
const targetSizesInput = document.getElementById("targetSizesInput");
const restockNoteInput = document.getElementById("restockNoteInput");
const openPurchaseBtn = document.getElementById("openPurchaseBtn");
const openRetailBtn = document.getElementById("openRetailBtn");
const openLiveBtn = document.getElementById("openLiveBtn");
const saveLinksBtn = document.getElementById("saveLinksBtn");
const restockBody = document.getElementById("restockBody");
const restockSummary = document.getElementById("restockSummary");
const emptyState = document.getElementById("emptyState");
const toastContainer = document.getElementById("toastContainer");

onAuthStateChanged(auth, async (user) => {
  const name = user?.email?.split("@")[0] || "Admin";
  document.getElementById("userName").textContent = name;
  document.getElementById("userAvatar").textContent = name.charAt(0).toUpperCase();

  state.records = loadRecords();
  await loadPrivateDefaults();
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
      snapshot.forEach((entry) => liveProducts.push({ id: entry.id, ...entry.data() }));
      setProducts(liveProducts);
    },
    () => setProducts([])
  );
}

function setProducts(liveProducts) {
  state.products = mergeCatalogProducts(liveProducts)
    .filter((product) => !product.isHidden && product.status !== "inactive")
    .sort((a, b) => getProductSortTimestamp(b) - getProductSortTimestamp(a));

  populateProducts();
  if (!state.productId && state.products[0]) {
    state.productId = state.products[0].id;
  }
  renderAll();
}

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records, null, 2));
}

async function loadPrivateDefaults() {
  try {
    const response = await fetch("restock-private.local.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const defaults = data?.records && typeof data.records === "object" ? data.records : {};
    let changed = false;

    Object.entries(defaults).forEach(([productId, record]) => {
      if (!state.records[productId]) {
        state.records[productId] = {
          ...record,
          privateLocal: true,
          updatedAt: record.updatedAt || new Date().toISOString(),
        };
        changed = true;
      }
    });

    if (changed) saveRecords();
  } catch {
    // Optional local-only defaults file is allowed to be missing.
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

function renderAll() {
  renderSelectedProduct();
  renderTable();
}

function renderSelectedProduct() {
  const product = getActiveProduct();
  if (!product) {
    selectedProduct.innerHTML = '<div class="selected-title">No product selected</div>';
    selectedStatus.textContent = "Select product";
    return;
  }

  const record = getRecord(product);
  const image = resolveAssetUrl(getProductCardImage(product));
  const stock = getStock(product);
  selectedStatus.textContent = getStatusLabel(record.restockStatus);

  selectedProduct.innerHTML = `
    <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "Product")}" referrerpolicy="no-referrer" onerror="this.style.display='none';" />
    <div>
      <div class="selected-title">${escapeHtml(product.name || "Untitled product")}</div>
      <div class="selected-meta">${escapeHtml(product.brand || "Backdoor")} / ${escapeHtml(product.category || "Product")} / ${formatMoney(product.price)}</div>
      <div class="selected-sizes">${escapeHtml(getSizesText(product) || "No sizes listed")} / ${stock} units</div>
    </div>
  `;

  purchaseUrlInput.value = record.purchaseUrl || "";
  retailUrlInput.value = record.retailUrl || "";
  purchaseCostInput.value = numberOrBlank(record.purchaseCost ?? product.reorderCost);
  targetPriceInput.value = numberOrBlank(record.targetPrice ?? product.price);
  restockStatusInput.value = record.restockStatus || "watching";
  targetSizesInput.value = record.targetSizes || getSizesText(product).replace(/^Sizes\s+/i, "");
  restockNoteInput.value = record.restockNote || "";

  updateOpenButtons(record, product);
}

function renderTable() {
  const rows = state.filteredProducts.filter(matchesCurrentFilter);
  restockSummary.textContent = `${rows.length} of ${state.products.length} products`;
  emptyState.classList.toggle("d-none", rows.length > 0);

  restockBody.innerHTML = rows.map((product) => {
    const record = getRecord(product);
    const image = resolveAssetUrl(getProductCardImage(product));
    const stock = getStock(product);
    const stockClass = stock <= 0 ? "empty" : stock <= 5 ? "low" : "ok";
    const purchase = normalizeUrl(record.purchaseUrl);
    const retail = normalizeUrl(record.retailUrl);
    const purchaseCost = Number(record.purchaseCost ?? product.reorderCost ?? 0) || 0;
    const targetPrice = Number(record.targetPrice ?? product.price ?? 0) || 0;
    const margin = purchaseCost > 0 ? targetPrice - purchaseCost : 0;
    const status = record.restockStatus || "watching";

    return `
      <tr>
        <td>
          <div class="restock-product-cell">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "Product")}" referrerpolicy="no-referrer" onerror="this.style.display='none';" />
            <div>
              <div class="product-name">${escapeHtml(product.name || "Untitled product")}</div>
              <div class="product-meta">${escapeHtml(product.brand || "Backdoor")} / ${escapeHtml(product.sku || "No SKU")}</div>
            </div>
          </div>
        </td>
        <td><span class="stock-pill ${stockClass}">${stock} units</span></td>
        <td>
          <div class="link-stack">
            <span class="link-pill ${purchase ? "ok" : "missing"}">Purchase</span>
            <span class="link-pill ${retail ? "ok" : "missing"}">Retail</span>
          </div>
          <div class="link-state">${escapeHtml(record.targetSizes || getSizesText(product) || "No target sizes")}</div>
        </td>
        <td>
          <div class="margin-main ${margin < 0 ? "negative" : ""}">${purchaseCost > 0 ? formatMoney(margin) : "No cost"}</div>
          <div class="margin-sub">${purchaseCost > 0 ? `${formatMoney(purchaseCost)} cost / ${formatMoney(targetPrice)} target` : "Add purchase cost"}</div>
        </td>
        <td><span class="status-pill ${escapeHtml(status)}">${escapeHtml(getStatusLabel(status))}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" class="row-action primary" data-action="select" data-id="${escapeHtml(product.id)}">Edit</button>
            <button type="button" class="row-action" data-action="purchase" data-id="${escapeHtml(product.id)}" ${purchase ? "" : "disabled"}>Buy</button>
            <button type="button" class="row-action" data-action="retail" data-id="${escapeHtml(product.id)}" ${retail ? "" : "disabled"}>Retail</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function matchesCurrentFilter(product) {
  const record = getRecord(product);
  const purchase = normalizeUrl(record.purchaseUrl);
  const retail = normalizeUrl(record.retailUrl);
  const stock = getStock(product);

  if (state.filter === "missing") return !purchase || !retail;
  if (state.filter === "ready") return record.restockStatus === "ready";
  if (state.filter === "low") return stock <= 5;
  if (state.filter === "watching") return (record.restockStatus || "watching") === "watching";
  return true;
}

function getRecord(product) {
  if (!product) return {};
  const localRecord = state.records[product.id] || {};
  return {
    purchaseUrl: product.purchaseUrl || product.reorderUrl || product.orderUrl || product.supplierUrl || "",
    retailUrl: product.retailUrl || product.referenceUrl || "",
    purchaseCost: product.purchaseCost ?? product.reorderCost ?? product.orderCost ?? product.supplierPrice ?? "",
    targetPrice: product.targetPrice ?? product.price ?? "",
    restockStatus: product.restockStatus || "watching",
    targetSizes: product.targetSizes || "",
    restockNote: product.restockNote || product.reorderNote || "",
    ...localRecord,
  };
}

function saveCurrentRecord() {
  const product = getActiveProduct();
  if (!product) return;

  state.records[product.id] = {
    purchaseUrl: normalizeUrl(purchaseUrlInput.value),
    retailUrl: normalizeUrl(retailUrlInput.value),
    purchaseCost: parseFloat(purchaseCostInput.value) || 0,
    targetPrice: parseFloat(targetPriceInput.value) || Number(product.price) || 0,
    restockStatus: restockStatusInput.value || "watching",
    targetSizes: targetSizesInput.value.trim(),
    restockNote: restockNoteInput.value.trim(),
    privateLocal: true,
    updatedAt: new Date().toISOString(),
  };

  saveRecords();
  showToast("Restock links saved locally.");
  renderAll();
}

function updateOpenButtons(record, product) {
  const purchase = normalizeUrl(record.purchaseUrl);
  const retail = normalizeUrl(record.retailUrl);
  openPurchaseBtn.disabled = !purchase;
  openRetailBtn.disabled = !retail;
  openLiveBtn.disabled = !product;
  openPurchaseBtn.classList.toggle("has-link", Boolean(purchase));
  openRetailBtn.classList.toggle("has-link", Boolean(retail));
  openLiveBtn.classList.toggle("has-link", Boolean(product));
}

function openProductUrl(type, product = getActiveProduct()) {
  const record = getRecord(product);
  let url = "";
  if (type === "purchase") url = normalizeUrl(record.purchaseUrl);
  if (type === "retail") url = normalizeUrl(record.retailUrl);
  if (type === "live" && product) url = `../${buildProductHref(product)}`;

  if (!url) {
    showToast("Add the link first.", true);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function getActiveProduct() {
  return state.products.find((product) => product.id === state.productId) || state.products[0] || null;
}

function getStock(product) {
  const sizes = getProductSizes(product);
  if (sizes.length) return sizes.reduce((sum, entry) => sum + (Number(entry.stock) || 0), 0);
  return Number(product?.stock) || 0;
}

function getSizesText(product) {
  const sizes = getProductSizes(product).map((entry) => entry.size).filter(Boolean);
  if (!sizes.length) return "";
  if (sizes.length <= 8) return `Sizes ${sizes.join(", ")}`;
  return `Sizes ${sizes[0]} - ${sizes[sizes.length - 1]}`;
}

function getStatusLabel(status) {
  const labels = {
    watching: "Watching",
    ready: "Ready",
    ordered: "Ordered",
    received: "Received",
    paused: "Paused",
  };
  return labels[status] || "Watching";
}

function resolveAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `../${raw.replace(/^\.?\//, "")}`;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function numberOrBlank(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `restock-toast${isError ? " error" : ""}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

productSearch.addEventListener("input", () => {
  populateProducts();
  renderAll();
});

productSelect.addEventListener("change", () => {
  state.productId = productSelect.value;
  renderAll();
});

saveLinksBtn.addEventListener("click", saveCurrentRecord);
openPurchaseBtn.addEventListener("click", () => openProductUrl("purchase"));
openRetailBtn.addEventListener("click", () => openProductUrl("retail"));
openLiveBtn.addEventListener("click", () => openProductUrl("live"));

document.getElementById("restockTabs").addEventListener("click", (event) => {
  const button = event.target.closest(".restock-tab");
  if (!button) return;
  state.filter = button.dataset.filter || "all";
  document.querySelectorAll(".restock-tab").forEach((entry) => {
    entry.classList.toggle("active", entry === button);
  });
  renderTable();
});

restockBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const product = state.products.find((entry) => entry.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === "select") {
    state.productId = product.id;
    productSelect.value = product.id;
    renderAll();
  } else if (button.dataset.action === "purchase") {
    openProductUrl("purchase", product);
  } else if (button.dataset.action === "retail") {
    openProductUrl("retail", product);
  }
});
// =============================================================
//  BACKDOOR_PORTAL_ADDITIONS_V1 (July 2026): wires lookupUrlBtn + publishToPortalBtn
// =============================================================

const lookupUrlBtnRestock       = document.getElementById('lookupUrlBtn');
const publishToPortalBtnRestock = document.getElementById('publishToPortalBtn');
const portalStatusRestock       = document.getElementById('portalStatusLine');

function setBusyRestock(btn, busy, label) { if (!btn) return; btn.disabled = !!busy; btn.textContent = label; }
function numOrNullRestock(v) { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }

async function lookupRetailPriceRestock(btn) {
  const urlInput = document.getElementById('retailUrlInput');
  const url = (urlInput && urlInput.value || '').trim();
  if (!url) { if (typeof showToast === 'function') showToast('Enter a retail URL first.'); return; }
  setBusyRestock(btn, true, 'Looking up...');
  if (typeof showToast === 'function') showToast('Fetching retail price...');
  try {
    const res = await fetch('/.netlify/functions/price-monitor-retail?url=' + encodeURIComponent(url));
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.ok) {
      // Distinguish a NOT-DEPLOYED function from a real function failure.
      // A missing function makes Netlify return its HTML "Page not found"
      // (HTTP 404, body is NOT JSON, so data is {}), while a deployed
      // function always answers JSON - even its errors carry data.error.
      const deployedFunction = data && (typeof data.ok === 'boolean' || data.error);
      if (!deployedFunction && res.status === 404) {
        if (typeof showToast === 'function') showToast('Price monitor not deployed yet - Netlify builds paused.', true);
      } else {
        const msg = (data && data.error) || ('HTTP ' + res.status);
        if (typeof showToast === 'function') showToast('Lookup failed: ' + msg, true);
      }
      setBusyRestock(btn, false, 'Lookup price'); return;
    }
    const priceField = document.getElementById('targetPriceInput');
    if (priceField && data.retailPrice != null) priceField.value = Number(data.retailPrice).toFixed(2);
    const noteField = document.getElementById('restockNoteInput');
    if (noteField && data.title) {
      const srcTag = '[' + (data.source || 'web') + ']';
      const line = srcTag + ' ' + data.title + ' -- ' + (data.currency || 'USD') + ' ' + Number(data.retailPrice).toFixed(2);
      const current = noteField.value.trim();
      noteField.value = current ? (current + '  |  ' + line) : line;
    }
    if (typeof showToast === 'function') showToast('Found: ' + (data.title || 'item') + ' @ ' + (data.currency || '$') + ' ' + Number(data.retailPrice).toFixed(2));
  } catch (err) { if (typeof showToast === 'function') showToast('Lookup error: ' + (err.message || err)); }
  finally { setBusyRestock(btn, false, 'Lookup price'); }
}

function collectRestockFormDataForPublish() {
  const v = function (id) { const el = document.getElementById(id); return el ? (el.value || '').trim() : ''; };
  const selectedProduct = getActiveProduct();
  return {
    title:       selectedProduct ? (selectedProduct.name || '') : (v('productSearch') || ''),
    brand:       selectedProduct ? (selectedProduct.brand || '') : '',
    image:       selectedProduct ? getProductCardImage(selectedProduct) : '',
    retailUrl:           v('retailUrlInput'),
    targetRetailPrice:   v('targetPriceInput'),
    purchaseUrl:         v('purchaseUrlInput'),
    purchaseCost:        v('purchaseCostInput'),
    targetSizes:         v('targetSizesInput').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    status:              v('restockStatusInput') || 'Watching',
  };
}

async function publishToPortalRestock(btn) {
  const data = collectRestockFormDataForPublish();
  if (!data.title || !data.retailUrl) { if (typeof showToast === 'function') showToast('Need a title + retail URL.'); return; }
  const currentUser = auth.currentUser;
  if (!currentUser) { if (typeof showToast === 'function') showToast('Sign in to publish.'); return; }
  setBusyRestock(btn, true, 'Publishing...');
  try {
    const docId = (data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80))
                  || ('idea-' + Date.now());
    const docRef = doc(db, 'restock_ideas', docId);
    // Firestore transaction: serialise concurrent publishes of the same
    // docId so only the FIRST writer of a brand-new document stamps
    // createdAt; subsequent updates never re-write it (merge:true skips
    // existing keys). All other fields are refreshed on every publish.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const payload = {
        title:           data.title,
        brand:           data.brand || '',
        retailUrl:       data.retailUrl,
        retailPrice:     numOrNullRestock(data.targetRetailPrice),
        image:           data.image || '',
        purchaseUrl:     data.purchaseUrl || '',
        purchaseCost:    numOrNullRestock(data.purchaseCost),
        targetSizes:     data.targetSizes || [],
        status:          data.status || 'Watching',
        updatedAt:       serverTimestamp(),
        publishedBy:     currentUser.uid,
      };
      if (!snap.exists) {
        payload.createdAt = serverTimestamp();
      }
      tx.set(docRef, payload, { merge: true });
    });
    if (portalStatusRestock) portalStatusRestock.textContent = 'Published as ' + docId + ' -- view at /portal/';
    if (typeof showToast === 'function') showToast('Published to /portal/ as ' + docId + (data.purchaseUrl ? ' (with source link)' : ''));
    setBusyRestock(btn, false, 'Published');
    setTimeout(function () { setBusyRestock(btn, false, 'Publish to Portal'); }, 3000);
  } catch (err) {
    if (typeof showToast === 'function') showToast('Publish failed: ' + (err.message || err));
    setBusyRestock(btn, false, 'Publish to Portal');
  }
}

if (lookupUrlBtnRestock)       lookupUrlBtnRestock.addEventListener('click',       function () { lookupRetailPriceRestock(lookupUrlBtnRestock); });
if (publishToPortalBtnRestock) publishToPortalBtnRestock.addEventListener('click', function () { publishToPortalRestock(publishToPortalBtnRestock); });
