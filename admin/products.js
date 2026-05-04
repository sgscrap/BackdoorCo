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
import { cloudifyUpload as uploadImage } from "./cloudify.js";

// ================================
// AUTH GUARD
// ================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("userName").textContent = user.email.split("@")[0];
  document.getElementById("userAvatar").textContent =
    user.email[0].toUpperCase();

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

    renderProducts();
  });
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
  } else if (currentFilter !== "all") {
    filtered = filtered.filter((p) => p.category === currentFilter);
  }

  const searchVal =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  if (searchVal) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchVal) ||
        p.sku.toLowerCase().includes(searchVal),
    );
  }

  filtered.sort((a, b) => {
    if (currentSort === "price") return a.price - b.price;
    if (currentSort === "stock") return b.stock - a.stock;
    if (currentSort === "newest") return 0;
    return a.name.localeCompare(b.name);
  });

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
                <div class="product-img-cell">
                    ${product.image
          ? `<img src="${product.image}" alt="${product.name}" class="product-thumb">`
          : `<div class="product-thumb" style="display:flex;align-items:center;justify-content:center">
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                                   <circle cx="8.5" cy="8.5" r="1.5"/>
                                   <polyline points="21 15 16 10 5 21"/>
                               </svg>
                           </div>`
        }
                </div>
            </td>
            <td>
                <div class="product-name-cell">
                    <span class="product-name">${product.name}</span>
                    ${product.colorway ? `<span class="product-sku">${product.colorway}</span>` : ""}
                </div>
            </td>
            <td><span class="product-sku">${product.sku}</span></td>
            <td><strong>$${parseFloat(product.price).toFixed(2)}</strong></td>
            <td>
                <span style="color:${product.stock < 5 ? "var(--red)" : "var(--text-primary)"}">
                    ${product.stock} units
                </span>
            </td>
            <td><span class="pill ${product.category === "Sneakers" ? "new" : "hot"}">${product.category}</span></td>
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
                    <button class="btn-icon danger" onclick="deleteProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')" title="Delete">
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
    document.getElementById("productFeatured").checked = !!p.featured;
    document.getElementById("imageUrl").value = p.image || "";

    if (p.image) {
      document.getElementById("imagePreview").innerHTML =
        `<img src="${p.image}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
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

  let imageUrl = document.getElementById("imageUrl").value;
  const imageFile = document.getElementById("imageInput").files[0];

  // Upload image if file selected
  if (imageFile) {
    try {
      // Show progress
      if (progressBar) {
        progressBar.classList.remove("hidden");
        progressBar.innerHTML = `
          <div class="progress-inner">
            <div class="progress-bar-fill uploading"></div>
            <span>Uploading image...</span>
          </div>`;
      }

      imageUrl = await uploadImage(imageFile);

      // Success state
      if (progressBar) {
        progressBar.innerHTML = `
                    <div class="progress-inner success">
                        <span>✓ Image uploaded</span>
                    </div>`;
      }
    } catch (err) {
      if (progressBar) {
        progressBar.innerHTML = `
                    <div class="progress-inner error">
                        <span>
                            ✗ Upload failed — 
                            using URL instead
                        </span>
                    </div>`;
      }
      console.error("Upload error:", err);
    }
  }

  const productData = {
    name: document.getElementById("productName").value || "",
    sku: document.getElementById("productSku").value || "",
    price: parseFloat(document.getElementById("productPrice").value) || 0,
    stock: parseInt(document.getElementById("productStock").value) || 0,
    category:
      document.getElementById("productCategory").value || "Uncategorized",
    status: document.getElementById("productStatus").value || "active",
    desc: document.getElementById("productDesc").value || "",
    sizes: document.getElementById("productSizes").value || "",
    colorway: document.getElementById("productColor").value || "",
    brand: document.getElementById("productBrand").value || "",
    featured: document.getElementById("productFeatured").checked,
    image: imageUrl || "",
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

// ================================
// SEARCH
// ================================
document.getElementById("searchToggle").addEventListener("click", () => {
  const bar = document.getElementById("searchBar");
  bar.style.display = bar.style.display === "none" ? "flex" : "none";
  if (bar.style.display === "flex") {
    document.getElementById("searchInput").focus();
  }
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
  const applyCropBtn = document.getElementById('applyCropBtn');
  const cropStatus = document.getElementById('cropStatus');

  // internal state for cropping
  let currentPreviewDataUrl = null;
  let croppedBlob = null;

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

  // Apply crop button
  applyCropBtn?.addEventListener('click', async () => {
    const sel = aspectSelect?.value || 'original';
    if (!currentPreviewDataUrl) return;
    if (sel === 'original') {
      cropStatus.textContent = 'No crop applied';
      croppedBlob = null;
      return;
    }
    cropStatus.textContent = 'Cropping...';
    try {
      const ratio = parseAspect(sel);
      const blob = await cropDataUrlToRatio(currentPreviewDataUrl, ratio, 1200);
      croppedBlob = blob;
      // update preview to show cropped result
      const url = URL.createObjectURL(blob);
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = `<img src="${url}" style="width:100%;height:200px;object-fit:cover;" alt="Preview">`;
      cropStatus.textContent = 'Cropped';
    } catch (err) {
      console.error('Crop error', err);
      cropStatus.textContent = 'Crop failed';
    }
  });

  // URL input preview (debounced)
  let urlDebounce;
  urlInput?.addEventListener("input", (e) => {
    clearTimeout(urlDebounce);
    urlDebounce = setTimeout(() => {
      const url = e.target.value.trim();
      if (url) {
        urlPreviewImg.src = url;
        urlPreviewImg.onload = () => { urlPreview.classList.remove("hidden"); };
        urlPreviewImg.onerror = () => { urlPreview.classList.add("hidden"); };
      } else {
        urlPreview.classList.add("hidden");
      }
    }, 500);
  });

  // Clear URL
  clearUrl?.addEventListener("click", () => {
    urlInput.value = "";
    urlPreview.classList.add("hidden");
    urlPreviewImg.src = "";
  });
}

// File preview helper
function handleFilePreview(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById("imagePreview");
    preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:200px;object-fit:cover;" alt="Preview">`;
    preview.style.padding = "0";
    currentPreviewDataUrl = ev.target.result;
    croppedBlob = null;
    cropStatus.textContent = '';
  };
  reader.readAsDataURL(file);
}

function parseAspect(value) {
  if (typeof value === 'number') return Number(value);
  if (value === '1') return 1;
  const parts = String(value).split('/').map(Number).filter(Boolean);
  if (parts.length === 2 && parts[1] !== 0) return parts[0] / parts[1];
  return null;
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

function cropDataUrlToRatio(dataUrl, ratio, maxSide = 1200) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // determine crop area centered
        const srcRatio = iw / ih;
        let sx = 0, sy = 0, sw = iw, sh = ih;
        if (srcRatio > ratio) {
          // image is wider -> crop width
          sh = ih;
          sw = Math.round(ih * ratio);
          sx = Math.round((iw - sw) / 2);
        } else {
          // image is taller -> crop height
          sw = iw;
          sh = Math.round(iw / ratio);
          sy = Math.round((ih - sh) / 2);
        }

        // scale output to max side
        let outW = sw;
        let outH = sh;
        if (Math.max(sw, sh) > maxSide) {
          const scale = maxSide / Math.max(sw, sh);
          outW = Math.round(sw * scale);
          outH = Math.round(sh * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.92);
      };
      img.onerror = reject;
      img.src = dataUrl;
    } catch (e) {
      reject(e);
    }
  });
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

function closeModal() {
  document.getElementById("productModal").classList.remove("open");
  document.body.style.overflow = "";
  document.getElementById("productForm").reset();
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
  editingId = null;
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  deleteId = null;
}

document.getElementById("addProductBtn").addEventListener("click", () => {
  editingId = null;
  document.getElementById("modalTitle").textContent = "Add Product";
  document.getElementById("productForm").reset();
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
