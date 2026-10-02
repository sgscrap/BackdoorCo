import { db, auth } from "./firebase-config.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { uploadCatalogImage as uploadImage } from "./catalog-upload.mjs";
import { uploadFileFor, applyUploadedImage, buildProductImageFields } from "./product-image-upload.mjs";

const SITE_ORIGIN = window.location.origin || "https://backdoorco.vercel.app";

// ================================
// AUTH GUARD
// ================================
onAuthStateChanged(auth, (user) => {
  document.getElementById("userName").textContent = user?.email?.split("@")[0] || "Admin";
  document.getElementById("userAvatar").textContent =
    user?.email?.[0]?.toUpperCase() || "A";

  initProducts();
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

// ================================
// STATE
// ================================
let allProducts = [];
let currentFilter = "all";
let currentSort = "name";
let editingId = null;
let deleteId = null;
let currentPreviewDataUrl = null;
let pendingCroppedBlob = null;
// Object URL backing the pending-crop preview; revoked whenever it is replaced.
let pendingCropPreviewUrl = null;
// The shared drag-to-position cropper (admin/crop-studio.js). Reached through
// window because that file is a classic script, not an importable module.
let cropStudio = null;
// Set when "Frame subject" found nothing to frame; consumed by the next crop
// status so the fall-back to a centred box is explained rather than silent.
let cropFrameMissed = false;

function setCropStatus(message, kind = '') {
  const el = document.getElementById('cropStatus');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('is-ok', kind === 'ok');
  el.classList.toggle('is-error', kind === 'error');
  el.classList.toggle('is-busy', kind === 'busy');
}

function releaseCropPreviewUrl() {
  if (pendingCropPreviewUrl) URL.revokeObjectURL(pendingCropPreviewUrl);
  pendingCropPreviewUrl = null;
}

function currentCropRatio() {
  const engine = window.CropStudio;
  if (!engine) return null;
  return engine.parseAspectValue(document.getElementById('imageAspectSelect')?.value);
}

function getCropStudio() {
  if (cropStudio) return cropStudio;
  const engine = window.CropStudio;
  if (!engine) {
    console.warn('CropStudio failed to load — image cropping is unavailable.');
    return null;
  }
  cropStudio = engine.create({
    stage: document.getElementById('imageCropStage'),
    viewport: document.getElementById('imageCropViewport'),
    image: document.getElementById('imageCropImage'),
    marquee: document.getElementById('imageCropMarquee'),
    readout: document.getElementById('imageCropDimensions'),
    ratio: currentCropRatio(),
    maxSide: engine.DEFAULT_MAX_SIDE,
    onRendering: () => setCropStatus('Rendering crop...', 'busy'),
    onError: (message) => setCropStatus(`Crop failed: ${message}`, 'error'),
    onCropChange: handleCropChange,
  });
  return cropStudio;
}

function renderUploadPreview(src) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  preview.innerHTML = `<img src="${src}" alt="Preview" onerror="catalogImageFallback(this)" style="width:100%;height:200px;object-fit:cover;">`;
  preview.style.padding = '0';
  updateImageDisplayPreview(src);
}

// Fired by the shared engine whenever the crop settles. Everything product-page
// specific lives here: the pending upload blob and the upload-tab preview.
function handleCropChange({ region, width, height, isFull, blob, autoFramed }) {
  if (!currentPreviewDataUrl) return;

  // Say where the box came from: subject detection, a manual drag, or a
  // "Frame subject" click that found nothing to latch onto.
  const framingNote = autoFramed
    ? 'Auto-framed on the subject · '
    : cropFrameMissed
      ? 'No clear subject found · '
      : '';
  cropFrameMissed = false;

  // Untouched marquee: upload the original file rather than a re-encode.
  if (isFull) {
    pendingCroppedBlob = null;
    releaseCropPreviewUrl();
    renderUploadPreview(currentPreviewDataUrl);
    setCropStatus(`${framingNote}Full image — the original uploads untouched (${width}×${height}px).`, 'ok');
    return;
  }
  if (!blob) return;

  pendingCroppedBlob = blob;
  releaseCropPreviewUrl();
  pendingCropPreviewUrl = URL.createObjectURL(blob);
  renderUploadPreview(pendingCropPreviewUrl);
  setCropStatus(`${framingNote}Crop ${region.sw}×${region.sh}px (${(blob.size / 1024).toFixed(0)}KB PNG) — Save to upload.`, 'ok');
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function buildLiveProductUrl(product) {
  const id = encodeURIComponent(product.id || "");
  const slug = encodeURIComponent(slugify(product.name || ""));
  return `${SITE_ORIGIN}/product.html?id=${id}&slug=${slug}`;
}

function resolveProductImageUrl(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  if (image.startsWith("/")) return `${SITE_ORIGIN}${image}`;
  return `${SITE_ORIGIN}/${image.replace(/^\.?\//, "")}`;
}

function getReorderUrl(product) {
  return String(product.purchaseUrl || product.reorderUrl || product.orderUrl || product.supplierUrl || "").trim();
}

function getReorderCost(product) {
  return Number(product.purchaseCost ?? product.reorderCost ?? product.orderCost ?? product.supplierPrice ?? 0) || 0;
}

function getStock(product) {
  if (Array.isArray(product.sizes) && product.sizes.length) {
    return product.sizes.reduce((sum, entry) => sum + (Number(entry?.stock) || 0), 0);
  }
  return Number(product.stock) || 0;
}

function getProductTimestamp(product) {
  const value = product.updatedAt || product.createdAt || 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function renderProductImage(product) {
  const image = resolveProductImageUrl(product.image || product.cardImage);
  const fallback = `
    <div class="product-thumb product-thumb-fallback" ${image ? 'style="display:none"' : ""}>
      ${escapeHtml(String(product.name || "?").trim().charAt(0).toUpperCase() || "?")}
    </div>`;

  if (!image) return fallback;

  return `
    <div class="product-img-cell">
      <img
        src="${escapeHtml(image)}"
        alt="${escapeHtml(product.name)}"
        referrerpolicy="no-referrer"
        class="product-thumb"
        loading="lazy"
        onerror="catalogImageFallback(this)"
      />
      ${fallback}
    </div>`;
}

function renderReorderCell(product) {
  const sitePrice = Number(product.price) || 0;
  const reorderUrl = getReorderUrl(product);
  const reorderCost = getReorderCost(product);
  const difference = reorderCost > 0 ? sitePrice - reorderCost : 0;
  const margin = sitePrice > 0 && reorderCost > 0 ? (difference / sitePrice) * 100 : 0;
  const differenceColor = difference >= 0 ? "var(--accent)" : "var(--accent-red)";

  return `
    <div class="product-name-cell" style="gap:4px">
      <span class="product-name" style="font-size:0.78rem">${reorderCost > 0 ? formatMoney(reorderCost) : "No cost set"}</span>
      <span class="product-sku" style="color:${differenceColor}">
        ${reorderCost > 0 ? `${difference >= 0 ? "+" : ""}${formatMoney(difference)} / ${margin.toFixed(1)}%` : "Add supplier price"}
      </span>
      <div class="action-btns" style="margin-top:4px">
        <button class="btn-icon" onclick="openLiveProduct('${product.id}')" title="Open live product">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
        ${reorderUrl
          ? `<button class="btn-icon" onclick="openReorderLink('${product.id}')" title="Open reorder link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </button>`
          : `<button class="btn-icon" onclick="editProduct('${product.id}')" title="Add reorder link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>`}
      </div>
    </div>`;
}

// ================================
// REALTIME PRODUCTS LISTENER
// ================================
function initProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    allProducts = [];
    snapshot.forEach((doc) => {
      allProducts.push({ id: doc.id, ...doc.data() });
    });

    document.getElementById("productsBadge").textContent = allProducts.length;
    populateBrandFilter();

    renderProducts();
  });
}

function populateBrandFilter() {
  const select = document.getElementById("brandFilter");
  if (!select) return;

  const currentValue = select.value;
  const brands = [...new Set(allProducts.map((product) => product.brand).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));

  select.innerHTML = '<option value="">All Brands</option>' + brands
    .map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`)
    .join("");
  select.value = brands.includes(currentValue) ? currentValue : "";
}

// ================================
// RENDER PRODUCTS TABLE
// ================================
function renderProducts() {
  let filtered = [...allProducts];

  if (currentFilter === "active") {
    filtered = filtered.filter((p) => p.status === "active");
  } else if (currentFilter === "inactive") {
    filtered = filtered.filter((p) => p.status === "inactive");
  } else if (currentFilter === "needs-reorder") {
    filtered = filtered.filter((p) => !getReorderUrl(p));
  } else if (currentFilter === "low-stock") {
    filtered = filtered.filter((p) => getStock(p) < 6);
  } else if (currentFilter !== "all") {
    filtered = filtered.filter((p) => p.category === currentFilter);
  }

  const brandFilter = document.getElementById("brandFilter")?.value || "";
  if (brandFilter) {
    filtered = filtered.filter((p) => p.brand === brandFilter);
  }

  const searchVal =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  if (searchVal) {
    filtered = filtered.filter(
      (p) =>
        String(p.name || "").toLowerCase().includes(searchVal) ||
        String(p.sku || "").toLowerCase().includes(searchVal) ||
        String(p.brand || "").toLowerCase().includes(searchVal) ||
        String(p.category || "").toLowerCase().includes(searchVal) ||
        String(p.colorway || "").toLowerCase().includes(searchVal),
    );
  }

  filtered.sort((a, b) => {
    if (currentSort === "price") return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (currentSort === "stock") return getStock(b) - getStock(a);
    if (currentSort === "margin") return ((Number(b.price) || 0) - getReorderCost(b)) - ((Number(a.price) || 0) - getReorderCost(a));
    if (currentSort === "newest") return getProductTimestamp(b) - getProductTimestamp(a);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  updateProductSummary(filtered);

  const tbody = document.getElementById("productsBody");
  const emptyState = document.getElementById("emptyState");

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  tbody.innerHTML = filtered
    .map(
      (product) => `
        <tr data-id="${product.id}">
            <td>
                ${renderProductImage(product)}
            </td>
            <td>
                <div class="product-name-cell">
                    <span class="product-name">${escapeHtml(product.name)}</span>
                    <span class="product-sku">${escapeHtml(product.brand || "No brand")}${product.colorway ? ` · ${escapeHtml(product.colorway)}` : ""}</span>
                </div>
            </td>
            <td><span class="product-sku">${escapeHtml(product.sku)}</span></td>
            <td><strong>${formatMoney(product.price)}</strong></td>
            <td>${renderReorderCell(product)}</td>
            <td>
                <span style="color:${getStock(product) < 5 ? "var(--accent-red)" : "var(--text-primary)"}">
                    ${getStock(product)} units
                </span>
            </td>
            <td><span class="pill ${product.category === "Sneakers" ? "new" : "hot"}">${escapeHtml(product.category)}</span></td>
            <td>
                <button class="pill ${product.status}" style="cursor:pointer;border:none"
                    onclick="toggleStatus('${product.id}', '${product.status}')">
                    ${product.status === "active" ? "ACTIVE" : "INACTIVE"}
                </button>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="editProduct('${product.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteProduct('${product.id}', '${escapeHtml(product.name).replace(/'/g, "\\'")}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("");
}

function updateProductSummary(filtered) {
  const total = allProducts.length;
  const missingReorder = allProducts.filter((product) => !getReorderUrl(product)).length;
  const lowStock = allProducts.filter((product) => getStock(product) < 6).length;

  document.getElementById("summaryCount").textContent =
    `${filtered.length} shown / ${total} total`;
  document.getElementById("summaryMissingReorder").textContent =
    `${missingReorder} need reorder links`;
  document.getElementById("summaryLowStock").textContent =
    `${lowStock} low stock`;
}

// ================================
// TOGGLE STATUS
// ================================
window.toggleStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === "active" ? "inactive" : "active";
  try {
    await updateDoc(doc(db, "products", id), { status: newStatus });
    showToast(`Product set to ${newStatus}`);
  } catch (err) {
    showToast("Error updating status", true);
  }
};

window.openReorderLink = (id) => {
  const product = allProducts.find((entry) => entry.id === id);
  const reorderUrl = product ? getReorderUrl(product) : "";
  if (!reorderUrl) {
    showToast("Add a reorder link first", true);
    return;
  }
  window.open(reorderUrl, "_blank", "noopener,noreferrer");
};

window.openLiveProduct = (id) => {
  const product = allProducts.find((entry) => entry.id === id);
  if (!product) {
    showToast("Product not found", true);
    return;
  }
  window.open(buildLiveProductUrl(product), "_blank", "noopener,noreferrer");
};

// ================================
// EDIT PRODUCT
// ================================
window.editProduct = async (id) => {
  editingId = id;
  const docRef = doc(db, "products", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const p = docSnap.data();
    document.getElementById("modalTitle").textContent = "Edit Product";
    document.getElementById("productId").value = id;
    document.getElementById("productName").value = p.name || "";
    document.getElementById("productSku").value = p.sku || "";
    document.getElementById("productPrice").value = p.price || "";
    document.getElementById("productStock").value = p.stock || "";
    document.getElementById("productCategory").value = p.category || "";
    document.getElementById("productStatus").value = p.status || "active";
    document.getElementById("productDesc").value = p.desc || "";
    document.getElementById("productSizes").value = p.sizes || "";
    document.getElementById("productColor").value = p.colorway || "";
    document.getElementById("productBrand").value = p.brand || "";
    document.getElementById("productFeatured").checked = !!p.featured || !!p.isFeatured;
    document.getElementById("productReorderUrl").value = getReorderUrl(p);
    document.getElementById("productReorderCost").value = getReorderCost(p) || "";
    document.getElementById("productReorderNote").value = p.reorderNote || "";
    // Primary image: prefer image/cardImage; gallery falls back to images[]
    const primaryImage = p.image || p.cardImage || "";
    document.getElementById("imageUrl").value = primaryImage;
    const galleryFromDoc = Array.isArray(p.images) && p.images.length ? p.images : [];
    document.getElementById("imageGallery").value = galleryFromDoc.join("\n");
    currentPreviewDataUrl = null;
    pendingCroppedBlob = null;
    releaseCropPreviewUrl();
    getCropStudio()?.clear();
    setCropStatus('');

    // Load image display settings
    const fitToggle = document.getElementById('imageFitToggle');
    const fitLabel = document.getElementById('imageFitLabel');
    fitToggle.checked = (p.imageFit === 'cover');
    fitLabel.textContent = fitToggle.checked ? 'Cover' : 'Contain';
    document.getElementById('imagePosX').value = Number.isFinite(p.imageOffsetX) ? p.imageOffsetX : 50;
    document.getElementById('imagePosY').value = Number.isFinite(p.imageOffsetY) ? p.imageOffsetY : 50;
    document.getElementById('posXVal').textContent = (Number.isFinite(p.imageOffsetX) ? p.imageOffsetX : 50) + '%';
    document.getElementById('posYVal').textContent = (Number.isFinite(p.imageOffsetY) ? p.imageOffsetY : 50) + '%';
    const scale = Number.isFinite(p.imageScale) ? p.imageScale : 1;
    document.getElementById('imageScaleSlider').value = Math.round(scale * 100);
    document.getElementById('scaleVal').textContent = scale.toFixed(2);
    document.getElementById('imagePaddingInput').value = parseInt(p.imagePadding) || 4;
    document.getElementById('imageAspectRatio').value = typeof p.imageAspect === 'string' ? p.imageAspect : '';

    // Drive the upload-tab preview + live framing card from the real primary
    const editPrimary = primaryImage || '';
    updateImageDisplayPreview(editPrimary);
    if (editPrimary) {
      document.getElementById("imagePreview").innerHTML =
        `<img src="${editPrimary}" alt="Preview" onerror="catalogImageFallback(this)" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
    }

    openModal();
  }
};

// ================================
// DELETE PRODUCT
// ================================
window.deleteProduct = (id, name) => {
  deleteId = id;
  document.getElementById("deleteProductName").textContent = name;
  document.getElementById("deleteModal").classList.add("open");
};

document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (!deleteId) return;
  try {
    await deleteDoc(doc(db, "products", deleteId));
    showToast("Product deleted");
    closeDeleteModal();
  } catch (err) {
    showToast("Error deleting product", true);
  }
});

// ================================
// SAVE PRODUCT
// ================================
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("saveProduct");
  const progressBar = document.getElementById("uploadProgress");

  btn.innerHTML = "<span>Saving...</span>";
  btn.disabled = true;

  let imageUrl = document.getElementById("imageUrl").value.trim();
  let galleryUrls = normalizeGalleryInput(document.getElementById("imageGallery")?.value || "");
  const imageFile = document.getElementById("imageInput").files[0];

  // If a file is selected (optionally cropped), upload it and use that URL
  if (imageFile) {
    // A pending crop (a PNG/WebP/JPEG blob) wins over the raw input file; the
    // helper names it after its real type so Cloudinary keeps it lossless.
    const fileToUpload = uploadFileFor(imageFile, pendingCroppedBlob);
    try {
      if (progressBar) {
        progressBar.classList.remove("hidden");
        progressBar.innerHTML = `<div class="progress-inner"><div class="progress-bar-fill uploading"></div><span>Uploading image...</span></div>`;
      }
      const uploaded = await uploadImage(fileToUpload);
      ({ imageUrl, gallery: galleryUrls } = applyUploadedImage(uploaded, { currentUrl: imageUrl, gallery: galleryUrls }));
      if (progressBar) {
        progressBar.innerHTML = `<div class="progress-inner success"><span>✓ Image uploaded</span></div>`;
      }
    } catch (err) {
      if (progressBar) {
        progressBar.innerHTML = `<div class="progress-inner error"><span>✗ Upload failed — using URL instead</span></div>`;
      }
      console.error("Upload error:", err);
    }
  } else if (pendingCroppedBlob) {
    // Cropped but no file input (edge case: user picked file then cleared input)
    try {
      if (progressBar) {
        progressBar.classList.remove("hidden");
        progressBar.innerHTML = `<div class="progress-inner"><div class="progress-bar-fill uploading"></div><span>Uploading cropped image...</span></div>`;
      }
      const file = uploadFileFor(null, pendingCroppedBlob);
      const uploaded = await uploadImage(file);
      ({ imageUrl, gallery: galleryUrls } = applyUploadedImage(uploaded, { currentUrl: imageUrl, gallery: galleryUrls }));
      if (progressBar) progressBar.innerHTML = `<div class="progress-inner success"><span>✓ Cropped image uploaded</span></div>`;
    } catch (err) {
      console.error('Cropped upload error', err);
      if (progressBar) progressBar.innerHTML = `<div class="progress-inner error"><span>✗ Cropped upload failed</span></div>`;
    }
  }

  // If still no primary image, fall back to first gallery URL
  if (!imageUrl && galleryUrls.length) imageUrl = galleryUrls[0];

  // Validate: need at least one image
  if (!imageUrl) {
    showToast('Add an image (upload or URL) before saving.', true);
    btn.innerHTML = `<span>Save Product</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    btn.disabled = false;
    return;
  }

  const imageFields = buildProductImageFields(imageUrl, galleryUrls);

  const rawImageFit = document.getElementById('imageFitToggle')?.checked ? 'cover' : 'contain';
  const rawOffsetX = clampFallback(parseInt(document.getElementById('imagePosX')?.value), 50, 0, 100);
  const rawOffsetY = clampFallback(parseInt(document.getElementById('imagePosY')?.value), 50, 0, 100);
  const rawScale = clampFallback((parseInt(document.getElementById('imageScaleSlider')?.value) || 100) / 100, 1, 0.8, 1.5);
  const rawPaddingInt = parseInt(document.getElementById('imagePaddingInput')?.value);
  const rawAspect = String(document.getElementById('imageAspectRatio')?.value || '').trim().toLowerCase();
  const VALID_ASPECTS = new Set(['square','portrait','landscape','wide']);

  const productData = {
    name: document.getElementById("productName").value.trim() || "",
    sku: document.getElementById("productSku").value.trim() || "",
    price: parseFloat(document.getElementById("productPrice").value) || 0,
    stock: parseInt(document.getElementById("productStock").value) || 0,
    category: document.getElementById("productCategory").value || "Uncategorized",
    status: document.getElementById("productStatus").value || "active",
    desc: document.getElementById("productDesc").value || "",
    sizes: document.getElementById("productSizes").value || "",
    colorway: document.getElementById("productColor").value || "",
    brand: document.getElementById("productBrand").value || "",
    featured: document.getElementById("productFeatured").checked,
    isFeatured: document.getElementById("productFeatured").checked,
    reorderUrl: document.getElementById("productReorderUrl").value.trim() || "",
    reorderCost: parseFloat(document.getElementById("productReorderCost").value) || 0,
    reorderNote: document.getElementById("productReorderNote").value || "",
    image: imageFields.image,
    cardImage: imageFields.cardImage,
    images: imageFields.images,
    imageFit: rawImageFit,
    imagePosition: `${rawOffsetX}% ${rawOffsetY}%`,
    imageOffsetX: rawOffsetX,
    imageOffsetY: rawOffsetY,
    imageScale: rawScale,
    imagePadding: Number.isFinite(rawPaddingInt) ? clampFallback(rawPaddingInt, 4, 0, 40) : 4,
    imageAspect: VALID_ASPECTS.has(rawAspect) ? rawAspect : '',
    updatedAt: new Date(),
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), productData);
      showToast("Product updated successfully!");
    } else {
      productData.createdAt = new Date();
      await addDoc(collection(db, "products"), productData);
      showToast("Product added successfully!");
    }
    closeModal();
  } catch (err) {
    showToast("Error saving product", true);
    console.error(err);
  }

  btn.innerHTML = `
        <span>Save Product</span>
        <svg width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>`;
  btn.disabled = false;

  // Hide progress after delay
  setTimeout(() => {
    if (progressBar) progressBar.classList.add("hidden");
  }, 3000);
});

// ================================
// FILTER TABS
// ================================
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    renderProducts();
  });
});

// ================================
// SORT
// ================================
document.getElementById("sortSelect").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderProducts();
});

document.getElementById("brandFilter")?.addEventListener("change", renderProducts);

// ================================
// SEARCH
// ================================
document.getElementById("searchToggle").addEventListener("click", () => {
  const bar = document.getElementById("searchBar");
  bar?.classList.remove("d-none");
  document.getElementById("searchInput")?.focus();
});

document
  .getElementById("searchInput")
  ?.addEventListener("input", renderProducts);

// ================================
// IMAGE UI INIT
// ================================
function initImageUI() {
  const dropZone = document.getElementById("imageDropZone");
  const fileInput = document.getElementById("imageInput");
  const urlInput = document.getElementById("imageUrl");
  const urlPreview = document.getElementById("urlPreviewWrap");
  const urlPreviewImg = document.getElementById("urlPreviewImg");
  const clearUrl = document.getElementById("clearUrl");
  const aspectSelect = document.getElementById('imageAspectSelect');
  const frameSubjectBtn = document.getElementById('frameSubjectBtn');
  const resetCropBtn = document.getElementById('resetCropBtn');
  const galleryInput = document.getElementById('imageGallery');

  // Tab switcher
  document.querySelectorAll(".img-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".img-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".img-tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tab.dataset.tab}Tab`).classList.add("active");
    });
  });

  // Click to open file picker
  dropZone?.addEventListener("click", () => fileInput.click());

  // Drag and drop
  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFilePreview(file);
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
    }
  });

  // File input change
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFilePreview(file);
  });

  // The shared studio crops live as you drag — there is no apply step, exactly
  // like the main Admin Center. These controls only re-lock the aspect, re-frame
  // on the detected subject, or re-centre the box.
  getCropStudio();
  aspectSelect?.addEventListener('change', () => {
    getCropStudio()?.setRatio(currentCropRatio());
  });
  frameSubjectBtn?.addEventListener('click', () => {
    const studio = getCropStudio();
    if (!studio) return;
    cropFrameMissed = !studio.frameSubject();
  });
  resetCropBtn?.addEventListener('click', () => {
    getCropStudio()?.resetRegion();
  });

  // URL input preview (debounced)
  let urlDebounce;
  urlInput?.addEventListener("input", (e) => {
    clearTimeout(urlDebounce);
    urlDebounce = setTimeout(() => {
      const url = e.target.value.trim();
      if (url) {
        urlPreviewImg.src = url;
        urlPreviewImg.onload = () => { urlPreview.classList.remove("hidden"); updateImageDisplayPreview(url); };
        urlPreviewImg.onerror = () => { urlPreview.classList.add("hidden"); };
      } else {
        urlPreview.classList.add("hidden");
        updateImageDisplayPreview('');
      }
    }, 500);
  });

  // Clear URL
  clearUrl?.addEventListener("click", () => {
    urlInput.value = "";
    urlPreview.classList.add("hidden");
    urlPreviewImg.src = "";
    updateImageDisplayPreview(galleryInput?.value?.trim()?.split(/\r?\n/)[0] || '');
  });

  // Gallery live-sync: first line drives the framing preview when no upload/file preview is active
  galleryInput?.addEventListener('input', () => {
    if (fileInput?.files?.length || urlInput?.value?.trim()) return;
    const first = String(galleryInput.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || '';
    if (first) updateImageDisplayPreview(first);
  });
}

// File preview helper — hands the pick to the shared crop studio, which frames
// the marquee on the detected subject (or centres it when there is none) and
// reports the first crop back through handleCropChange.
function handleFilePreview(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentPreviewDataUrl = ev.target.result;
    pendingCroppedBlob = null;
    cropFrameMissed = false;
    releaseCropPreviewUrl();
    setCropStatus('');
    renderUploadPreview(currentPreviewDataUrl);
    const studio = getCropStudio();
    studio?.setRatio(currentCropRatio());
    studio?.setImage(currentPreviewDataUrl);
  };
  reader.readAsDataURL(file);
}

// ── Image Display Preview (live crop/position/scale) ──
function updateImageDisplayPreview(src) {
  const section = document.getElementById('imageDisplaySection');
  const preview = document.getElementById('imgDisplayPreview');
  const hint = document.getElementById('imgDisplayHint');
  const card = document.getElementById('imgDisplayCard');
  const fitToggle = document.getElementById('imageFitToggle');
  const posX = document.getElementById('imagePosX');
  const posY = document.getElementById('imagePosY');
  const scaleSlider = document.getElementById('imageScaleSlider');
  const padInput = document.getElementById('imagePaddingInput');
  const aspectRatio = document.getElementById('imageAspectRatio');

  if (!src) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  hint.style.display = 'none';
  preview.src = src;

  // Aspect ratio map (constant)
  const aspectMap = { square: '1/1', portrait: '3/4', landscape: '4/3', wide: '16/9' };

  function apply() {
    const fit = fitToggle.checked ? 'cover' : 'contain';
    card.classList.toggle('cover-fit', fitToggle.checked);
    preview.style.objectFit = fit;
    preview.style.objectPosition = posX.value + '% ' + posY.value + '%';
    preview.style.transform = 'scale(' + ((parseInt(scaleSlider.value) || 100) / 100) + ')';
    preview.style.padding = (parseInt(padInput.value) || 0) + 'px';
    document.getElementById('posXVal').textContent = posX.value + '%';
    document.getElementById('posYVal').textContent = posY.value + '%';
    document.getElementById('scaleVal').textContent = ((parseInt(scaleSlider.value) || 100) / 100).toFixed(2);
    document.getElementById('imageFitLabel').textContent = fitToggle.checked ? 'Cover' : 'Contain';

    // Apply aspect ratio to preview card
    const aspect = aspectRatio?.value || '';
    card.style.aspectRatio = aspectMap[aspect] || 'auto';
  }

  fitToggle.onchange = apply;
  posX.oninput = apply;
  posY.oninput = apply;
  scaleSlider.oninput = apply;
  padInput.oninput = apply;
  if (aspectRatio) aspectRatio.onchange = apply;
  apply();
}

function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0];
  const base64 = parts[1];
  const mime = meta.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Init on load
initImageUI();

// ================================
// MODAL HELPERS
// ================================
function openModal() {
  document.getElementById("productModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function normalizeGalleryInput(raw) {
  return String(raw || '').split(/\r?\n|[\n,]+/).map(s => s.trim()).filter(Boolean).filter(v => /^https?:\/\//i.test(v));
}

function clampFallback(value, fallback, min, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function closeModal() {
  document.getElementById("productModal").classList.remove("open");
  document.body.style.overflow = "";
  document.getElementById("productForm").reset();
  currentPreviewDataUrl = null;
  pendingCroppedBlob = null;
  releaseCropPreviewUrl();
  getCropStudio()?.clear();
  setCropStatus('');
  const galleryEl = document.getElementById('imageGallery');
  if (galleryEl) galleryEl.value = '';
  document.getElementById("imagePreview").innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span class="drop-text">Drop image here or click to upload</span>
        <span class="drop-subtext">PNG, JPG up to 10MB</span>`;
  document.getElementById("imagePreview").style.padding = "32px";

  document.getElementById("urlPreviewWrap").style.display = "none";
  document.getElementById("urlPreviewImg").src = "";

  document
    .querySelectorAll(".img-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".img-tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.querySelector('[data-tab="upload"]').classList.add("active");
  document.getElementById("uploadTab").classList.add("active");

  // Reset image display section
  document.getElementById('imageDisplaySection').style.display = 'none';
  document.getElementById('imgDisplayPreview').src = '';
  document.getElementById('imgDisplayHint').style.display = '';
  document.getElementById('imageFitToggle').checked = false;
  document.getElementById('imagePosX').value = 50;
  document.getElementById('imagePosY').value = 50;
  document.getElementById('imageScaleSlider').value = 100;
  document.getElementById('imagePaddingInput').value = 4;
  document.getElementById('posXVal').textContent = '50%';
  document.getElementById('posYVal').textContent = '50%';
  document.getElementById('scaleVal').textContent = '1.00';
  document.getElementById('imageFitLabel').textContent = 'Contain';
  const aspectSelect = document.getElementById('imageAspectRatio');
  if (aspectSelect) aspectSelect.value = '';

  editingId = null;
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  deleteId = null;
}

document.getElementById("addProductBtn").addEventListener("click", () => {
  editingId = null;
  currentPreviewDataUrl = null;
  pendingCroppedBlob = null;
  releaseCropPreviewUrl();
  getCropStudio()?.clear();
  document.getElementById("modalTitle").textContent = "Add Product";
  document.getElementById("productForm").reset();
  setCropStatus('');
  const g0 = document.getElementById('imageGallery');
  if (g0) g0.value = '';
  document.getElementById('imageDisplaySection').style.display = 'none';
  openModal();
});

document.getElementById("emptyAddBtn")?.addEventListener("click", () => {
  editingId = null;
  openModal();
});

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
document
  .getElementById("closeDeleteModal")
  .addEventListener("click", closeDeleteModal);
document
  .getElementById("cancelDelete")
  .addEventListener("click", closeDeleteModal);

document.getElementById("productModal").addEventListener("click", (e) => {
  if (e.target.id === "productModal") closeModal();
});
document.getElementById("deleteModal").addEventListener("click", (e) => {
  if (e.target.id === "deleteModal") closeDeleteModal();
});

// ================================
// TOAST
// ================================
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  toastMsg.textContent = msg;
  toast.className = isError ? "toast error show" : "toast show";
  setTimeout(() => toast.classList.remove("show"), 3000);
}
