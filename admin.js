firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const DEFAULT_SIZE_OPTIONS = ['US 7', 'US 7.5', 'US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 11', 'US 12', 'US 13'];
const IMPORTER_SIZES = [...DEFAULT_SIZE_OPTIONS];
const ADMIN_AUTH_DISABLED = true;
const pageData = {
    dashboard: { title: 'DASHBOARD', subtitle: "Welcome back - here's what's happening today." },
    orders: { title: 'ORDERS', subtitle: 'Manage and track all customer orders.' },
    products: { title: 'PRODUCTS', subtitle: 'Browse and manage your sneaker inventory.' },
    customers: { title: 'CUSTOMERS', subtitle: 'View and manage your customer base.' },
    import: { title: 'IMPORT PRODUCTS', subtitle: 'Import products via SKU from Kickwho.' },
    analytics: { title: 'ANALYTICS', subtitle: 'Deep dive into your store performance.' },
    settings: { title: 'SETTINGS', subtitle: 'Configure your admin preferences.' }
};
const chartData = [
    { label: 'MON', val: 20 },
    { label: 'TUE', val: 55 },
    { label: 'WED', val: 35 },
    { label: 'THU', val: 75 },
    { label: 'FRI', val: 60 },
    { label: 'SAT', val: 90 },
    { label: 'SUN', val: 45, active: true }
];

let orders = [];
let customers = [];
let products = [];
let currentProduct = null;
let selectedProductIds = new Set();
let importerUrlRows = [];
let importerPreviewItems = [];
let importerSelectedImages = [];
let importerRowCounter = 0;
let importerSelectedSizes = [];

document.addEventListener('DOMContentLoaded', () => {
    initFirebaseListeners();
    initImporter();
    setupEventListeners();
    checkAuth();
});

function debounce(fn, delay) {
    let timeoutId = null;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getProductSizes(product) {
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
        return product.sizes.map((entry) => ({
            size: String(entry.size || '').trim(),
            stock: Math.max(0, Number(entry.stock) || 0),
            price: Number(entry.price) || Number(product.price) || 0
        })).filter((entry) => entry.size);
    }

    if (typeof product?.sizes === 'string' && product.sizes.trim()) {
        return product.sizes.split(',').map((size) => ({
            size: size.trim(),
            stock: Math.max(0, Number(product.stock) || 0),
            price: Number(product.price) || 0
        })).filter((entry) => entry.size);
    }

    return DEFAULT_SIZE_OPTIONS.map((size) => ({
        size,
        stock: 0,
        price: Number(product?.price) || 0
    }));
}

function getTotalStock(product) {
    return getProductSizes(product).reduce((sum, entry) => sum + Math.max(0, Number(entry.stock) || 0), 0);
}

function isProductHidden(product) {
    return Boolean(product?.isHidden);
}

function isProductFeatured(product) {
    return Boolean(product?.isFeatured);
}

function isProductOutOfStock(product) {
    return Boolean(product?.isOutOfStock) || getTotalStock(product) <= 0;
}

function normalizeProduct(product) {
    const sizes = getProductSizes(product);
    return {
        ...product,
        price: Number(product?.price) || 0,
        image: product?.image || '',
        sizes,
        isHidden: isProductHidden(product),
        isOutOfStock: Boolean(product?.isOutOfStock) || sizes.every((entry) => entry.stock <= 0),
        isFeatured: isProductFeatured(product)
    };
}

function getProductStatusMeta(product) {
    if (isProductHidden(product)) {
        return { label: 'Hidden', className: 'inactive' };
    }
    if (isProductOutOfStock(product)) {
        return { label: 'Out of Stock', className: 'cancelled' };
    }
    return { label: 'Live', className: 'active' };
}

function getFilteredProducts() {
    const searchTerm = document.getElementById('productSearch')?.value.trim().toLowerCase() || '';
    const categoryFilter = document.getElementById('productCategoryFilter')?.value || 'all';
    const statusFilter = document.getElementById('productStatusFilter')?.value || 'all';

    let filtered = [...products];

    if (searchTerm) {
        filtered = filtered.filter((product) => (
            product.name?.toLowerCase().includes(searchTerm) ||
            product.sku?.toLowerCase().includes(searchTerm) ||
            product.brand?.toLowerCase().includes(searchTerm) ||
            (product.colorway || '').toLowerCase().includes(searchTerm)
        ));
    }

    if (categoryFilter !== 'all') {
        filtered = filtered.filter((product) => product.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter((product) => {
            if (statusFilter === 'featured') return isProductFeatured(product);
            if (statusFilter === 'hidden') return isProductHidden(product);
            if (statusFilter === 'out-of-stock') return isProductOutOfStock(product);
            return !isProductHidden(product) && !isProductOutOfStock(product);
        });
    }

    filtered.sort((left, right) => (
        Number(isProductFeatured(right)) - Number(isProductFeatured(left)) ||
        (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0) ||
        right.price - left.price
    ));

    return filtered;
}

function syncSelectedProductIds() {
    const validIds = new Set(products.map((product) => product.id));
    selectedProductIds = new Set([...selectedProductIds].filter((id) => validIds.has(id)));
}

function renderBulkToolbar(filteredProducts = getFilteredProducts()) {
    const selectionCount = document.getElementById('productSelectionCount');
    const bulkAction = document.getElementById('productBulkAction');
    const applyBulkActionBtn = document.getElementById('applyBulkActionBtn');
    const selectAll = document.getElementById('selectAllProducts');
    const visibleIds = filteredProducts.map((product) => product.id);
    const selectedVisibleCount = visibleIds.filter((id) => selectedProductIds.has(id)).length;

    if (selectionCount) selectionCount.textContent = `${selectedProductIds.size} selected`;
    if (applyBulkActionBtn) applyBulkActionBtn.disabled = selectedProductIds.size === 0 || !bulkAction?.value;
    if (selectAll) {
        selectAll.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
        selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
    }
}

function restoreInventorySizes(product) {
    const sizes = getProductSizes(product).map((entry) => ({ ...entry }));
    if (sizes.some((entry) => entry.stock > 0)) return sizes;
    if (sizes.length === 0) return [{ size: 'US 9', stock: 1, price: Number(product?.price) || 0 }];
    sizes[0].stock = 1;
    if (!sizes[0].price) sizes[0].price = Number(product?.price) || 0;
    return sizes;
}

function getVisibleProductCount() {
    return products.filter((product) => !isProductHidden(product)).length;
}

function initFirebaseListeners() {
    db.collection('products').onSnapshot((snapshot) => {
        products = snapshot.docs.map((doc) => normalizeProduct({ id: doc.id, ...doc.data() }));
        syncSelectedProductIds();
        renderProducts();
        renderDashboard();
    });

    db.collection('orders').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderOrders();
        renderDashboard();
    });

    db.collection('customers').onSnapshot((snapshot) => {
        customers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderCustomers();
        renderDashboard();
    });
}

function checkAuth() {
    if (ADMIN_AUTH_DISABLED) {
        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('adminDashboard')?.classList.remove('hidden');
        renderDashboard();
        return;
    }

    auth.onAuthStateChanged((user) => {
        document.getElementById('loginScreen')?.classList.toggle('hidden', Boolean(user));
        document.getElementById('adminDashboard')?.classList.toggle('hidden', !user);
        if (user) renderDashboard();
    });
}

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (ADMIN_AUTH_DISABLED) {
                checkAuth();
                return;
            }

            const button = event.target.querySelector('button');
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;

            button.disabled = true;
            button.textContent = 'Verifying...';

            try {
                await auth.signInWithEmailAndPassword(email, password);
                showToast('Welcome back, Admin');
            } catch (error) {
                console.error('Login Error:', error);
                let message = error.message;
                if (error.code === 'auth/unauthorized-domain') {
                    message = 'Unauthorized domain. Add backdoordmv.netlify.app to Firebase authorized domains.';
                }
                showToast(`Login failed: ${message}`, 'error');
            } finally {
                button.disabled = false;
                button.textContent = 'Unlock Dashboard';
            }
        });
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (ADMIN_AUTH_DISABLED) {
            showToast('Admin login is temporarily disabled.');
            return;
        }

        if (confirm('Logout?')) auth.signOut();
    });

    document.getElementById('productModalClose')?.addEventListener('click', closeModal);
    document.getElementById('cancelProductBtn')?.addEventListener('click', closeModal);
    document.getElementById('orderModalClose')?.addEventListener('click', closeOrderModal);
    document.getElementById('addProductBtnTop')?.addEventListener('click', () => openProductModal());
    document.getElementById('quickAddProduct')?.addEventListener('click', () => openProductModal());
    document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);

    const debouncedFilterProducts = debounce(filterProducts, 180);
    document.getElementById('productSearch')?.addEventListener('input', debouncedFilterProducts);
    document.getElementById('productCategoryFilter')?.addEventListener('change', filterProducts);
    document.getElementById('productStatusFilter')?.addEventListener('change', filterProducts);
    document.getElementById('productBulkAction')?.addEventListener('change', () => renderBulkToolbar());
    document.getElementById('applyBulkActionBtn')?.addEventListener('click', applyBulkAction);
    document.getElementById('selectAllProducts')?.addEventListener('change', handleSelectAllProducts);
    document.getElementById('productsTableBody')?.addEventListener('change', handleProductTableSelection);
}

function switchTab(tab, el) {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    if (el) el.classList.add('active');
    else document.querySelector(`[data-page="${tab}"]`)?.classList.add('active');

    const page = pageData[tab];
    if (page) {
        document.getElementById('sectionTitle').textContent = page.title;
        document.getElementById('sectionSubtitle').textContent = page.subtitle;
    }

    document.querySelectorAll('.content-section').forEach((section) => section.classList.remove('active'));
    document.getElementById(`${tab}Section`)?.classList.add('active');

    if (tab === 'dashboard') renderDashboard();
    if (tab === 'orders') renderOrders();
    if (tab === 'products') renderProducts();
    if (tab === 'customers') renderCustomers();
}

function renderDashboard() {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const pendingCount = orders.filter((order) => order.status === 'pending').length;

    animateCounter(document.getElementById('revenueVal'), totalRevenue, '$');
    animateCounter(document.getElementById('ordersVal'), orders.length);
    animateCounter(document.getElementById('pendingVal'), pendingCount);
    animateCounter(document.getElementById('customersVal'), customers.length);

    const orderBadge = document.getElementById('orderBadge');
    const productBadge = document.getElementById('productBadge');
    if (orderBadge) orderBadge.textContent = String(pendingCount);
    if (productBadge) productBadge.textContent = String(getVisibleProductCount());

    renderChart();
    renderRecentOrders();
    renderLowStock();
}

function renderRecentOrders() {
    const list = document.getElementById('recentOrdersList');
    if (!list) return;

    list.innerHTML = orders.slice(0, 5).map((order) => `
        <tr onclick="viewOrder('${escapeHtml(order.id)}')" style="cursor:pointer">
            <td><span class="order-id">${escapeHtml(order.id)}</span></td>
            <td>${escapeHtml(order.customer?.name || 'Unknown')}</td>
            <td style="color:var(--text-primary);font-weight:600">$${(order.total || 0).toFixed(2)}</td>
            <td><span class="status-pill ${escapeHtml(order.status || 'pending')}">${escapeHtml(order.status || 'pending')}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted)">No orders yet.</td></tr>';
}

function renderLowStock() {
    const list = document.getElementById('lowStockList');
    if (!list) return;

    const lowStock = [];
    products.forEach((product) => {
        if (isProductHidden(product) || isProductOutOfStock(product)) return;
        getProductSizes(product).forEach((size) => {
            if (size.stock > 0 && size.stock < 5) {
                lowStock.push({
                    id: product.id,
                    name: product.name,
                    size: size.size,
                    stock: size.stock,
                    img: product.image,
                    brand: product.brand,
                    price: size.price || product.price
                });
            }
        });
    });

    lowStock.sort((left, right) => left.stock - right.stock);

    list.innerHTML = lowStock.slice(0, 4).map((entry) => `
        <div class="inventory-item" onclick="openProductModal('${escapeHtml(entry.id)}')">
            <div class="shoe-thumb"><img src="${escapeHtml(entry.img)}" alt=""></div>
            <div class="shoe-info">
                <div class="shoe-name">${escapeHtml(entry.name)} (${escapeHtml(entry.size)})</div>
                <div class="shoe-brand">${escapeHtml(entry.brand)}</div>
                <div class="stock-indicator">
                    <div class="stock-dot low"></div>
                    <span style="color:var(--text-muted);font-size:11px">${entry.stock} in stock</span>
                </div>
            </div>
            <div class="shoe-price">$${Number(entry.price || 0).toFixed(0)}</div>
        </div>
    `).join('') || '<p style="text-align:center; padding:20px; color:var(--text-muted)">Stock levels are healthy.</p>';
}

function renderProducts(filteredProducts = getFilteredProducts()) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state-row">No products match the current filters.</td></tr>';
        renderBulkToolbar(filteredProducts);
        return;
    }

    tbody.innerHTML = filteredProducts.map((product) => {
        const totalStock = getTotalStock(product);
        const status = getProductStatusMeta(product);
        return `
            <tr class="${isProductOutOfStock(product) ? 'product-row-muted' : ''}">
                <td class="checkbox-col">
                    <input class="product-select-checkbox" type="checkbox" value="${escapeHtml(product.id)}" ${selectedProductIds.has(product.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(product.name)}">
                </td>
                <td><div class="shoe-thumb"><img src="${escapeHtml(product.image)}" alt=""></div></td>
                <td>
                    <strong>${escapeHtml(product.name)}</strong>
                    <div class="table-subtext">${escapeHtml(product.brand || '')}</div>
                </td>
                <td><code>${escapeHtml(product.sku || 'N/A')}</code></td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${totalStock} items</td>
                <td>${escapeHtml(product.category || 'Uncategorized')}</td>
                <td>
                    <div class="status-stack">
                        <span class="status-pill ${status.className}">${status.label}</span>
                        ${isProductFeatured(product) ? '<span class="status-pill shipped">Featured</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="row-action-group">
                        <button class="topbar-btn icon-btn-small" type="button" onclick="toggleProductFeatured('${escapeHtml(product.id)}')" title="${isProductFeatured(product) ? 'Remove featured' : 'Feature product'}">
                            <i class="fa-solid ${isProductFeatured(product) ? 'fa-star' : 'fa-star-half-stroke'}"></i>
                        </button>
                        <button class="topbar-btn icon-btn-small" type="button" onclick="toggleProductVisibility('${escapeHtml(product.id)}')" title="${isProductHidden(product) ? 'Show on storefront' : 'Hide from storefront'}">
                            <i class="fa-solid ${isProductHidden(product) ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                        <button class="topbar-btn icon-btn-small" type="button" onclick="toggleOutOfStock('${escapeHtml(product.id)}')" title="${isProductOutOfStock(product) ? 'Mark in stock' : 'Mark out of stock'}">
                            <i class="fa-solid ${isProductOutOfStock(product) ? 'fa-box-open' : 'fa-ban'}"></i>
                        </button>
                        <button class="topbar-btn icon-btn-small" type="button" onclick="openProductModal('${escapeHtml(product.id)}')" title="Edit product">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderBulkToolbar(filteredProducts);
}

function filterProducts() {
    renderProducts(getFilteredProducts());
}

function handleProductTableSelection(event) {
    const checkbox = event.target.closest('.product-select-checkbox');
    if (!checkbox) return;

    if (checkbox.checked) selectedProductIds.add(checkbox.value);
    else selectedProductIds.delete(checkbox.value);

    renderBulkToolbar();
}

function handleSelectAllProducts(event) {
    const filteredProducts = getFilteredProducts();
    filteredProducts.forEach((product) => {
        if (event.target.checked) selectedProductIds.add(product.id);
        else selectedProductIds.delete(product.id);
    });
    renderProducts(filteredProducts);
}

async function applyBulkAction() {
    const action = document.getElementById('productBulkAction')?.value;
    if (!action || selectedProductIds.size === 0) {
        renderBulkToolbar();
        return;
    }

    try {
        await Promise.all(products.filter((product) => selectedProductIds.has(product.id)).map((product) => {
            const patch = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            if (action === 'show') patch.isHidden = false;
            if (action === 'hide') patch.isHidden = true;
            if (action === 'mark-in-stock') {
                patch.isOutOfStock = false;
                patch.sizes = restoreInventorySizes(product);
            }
            if (action === 'mark-out-of-stock') patch.isOutOfStock = true;
            if (action === 'feature') patch.isFeatured = true;
            if (action === 'unfeature') patch.isFeatured = false;
            return db.collection('products').doc(product.id).set(patch, { merge: true });
        }));

        selectedProductIds.clear();
        document.getElementById('productBulkAction').value = '';
        renderBulkToolbar();
        showToast('Bulk action applied.');
    } catch (error) {
        console.error(error);
        showToast(`Bulk update failed: ${error.message}`, 'error');
    }
}

function openProductModal(id = null) {
    currentProduct = id ? products.find((product) => product.id === id) : null;

    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    if (!modal || !title || !form) return;

    title.textContent = currentProduct ? 'EDIT PRODUCT' : 'ADD PRODUCT';
    form.reset();

    document.getElementById('productHidden').checked = currentProduct ? isProductHidden(currentProduct) : false;
    document.getElementById('productOutOfStock').checked = currentProduct ? Boolean(currentProduct.isOutOfStock) : false;
    document.getElementById('productFeatured').checked = currentProduct ? isProductFeatured(currentProduct) : false;

    if (currentProduct) {
        document.getElementById('productName').value = currentProduct.name || '';
        document.getElementById('productBrand').value = currentProduct.brand || 'Nike';
        document.getElementById('productSKU').value = currentProduct.sku || '';
        document.getElementById('productCategory').value = currentProduct.category || 'Sneakers';
        document.getElementById('productPrice').value = currentProduct.price || '';
        document.getElementById('productDescription').value = currentProduct.description || '';
        document.getElementById('productImage').value = currentProduct.image || '';
        renderSizeGrid(currentProduct.sizes);
    } else {
        renderSizeGrid();
    }

    modal.classList.add('open');
}

function renderSizeGrid(existingSizes = []) {
    const grid = document.getElementById('sizeInventoryGrid');
    if (!grid) return;

    const sizeMap = new Map(getProductSizes({ sizes: existingSizes }).map((entry) => [entry.size, entry]));
    grid.innerHTML = DEFAULT_SIZE_OPTIONS.map((size) => {
        const entry = sizeMap.get(size);
        return `
            <div class="size-item">
                <span>${size}</span>
                <input type="number" placeholder="Stock" class="size-stock" data-size="${size}" min="0" value="${entry ? entry.stock : 0}">
                <input type="number" placeholder="Price" class="size-price" data-size="${size}" min="0" step="0.01" value="${entry ? entry.price : ''}">
            </div>
        `;
    }).join('');
}

async function handleProductSubmit(event) {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';

    const basePrice = parseFloat(document.getElementById('productPrice').value) || 0;
    const sizeEntries = [...document.querySelectorAll('.size-item')].map((item) => ({
        size: item.querySelector('span').textContent.trim(),
        stock: Math.max(0, parseInt(item.querySelector('.size-stock').value, 10) || 0),
        price: parseFloat(item.querySelector('.size-price').value) || basePrice
    }));

    const productId = currentProduct ? currentProduct.id : Date.now().toString();
    const productData = {
        name: document.getElementById('productName').value.trim(),
        brand: document.getElementById('productBrand').value,
        sku: document.getElementById('productSKU').value.trim(),
        category: document.getElementById('productCategory').value,
        price: basePrice,
        description: document.getElementById('productDescription').value.trim(),
        image: document.getElementById('productImage').value.trim(),
        sizes: sizeEntries,
        isHidden: document.getElementById('productHidden').checked,
        isOutOfStock: document.getElementById('productOutOfStock').checked,
        isFeatured: document.getElementById('productFeatured').checked,
        status: 'active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!currentProduct) productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
        await db.collection('products').doc(productId).set(productData, { merge: true });
        showToast(currentProduct ? 'Product updated.' : 'Product added.');
        closeModal();
    } catch (error) {
        console.error(error);
        showToast(`Error saving product: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function toggleProductVisibility(productId) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;

    try {
        await db.collection('products').doc(productId).set({
            isHidden: !isProductHidden(product),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        showToast(isProductHidden(product) ? 'Product is visible again.' : 'Product hidden from storefront.');
    } catch (error) {
        console.error(error);
        showToast(`Visibility update failed: ${error.message}`, 'error');
    }
}

async function toggleProductFeatured(productId) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;

    try {
        await db.collection('products').doc(productId).set({
            isFeatured: !isProductFeatured(product),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        showToast(isProductFeatured(product) ? 'Featured flag removed.' : 'Product featured.');
    } catch (error) {
        console.error(error);
        showToast(`Featured update failed: ${error.message}`, 'error');
    }
}

async function toggleOutOfStock(productId) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;

    const nextOutOfStock = !isProductOutOfStock(product);
    const patch = {
        isOutOfStock: nextOutOfStock,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!nextOutOfStock) patch.sizes = restoreInventorySizes(product);

    try {
        await db.collection('products').doc(productId).set(patch, { merge: true });
        showToast(nextOutOfStock ? 'Product marked out of stock.' : 'Product returned to stock.');
    } catch (error) {
        console.error(error);
        showToast(`Stock update failed: ${error.message}`, 'error');
    }
}

function closeModal() {
    document.getElementById('productModal')?.classList.remove('open');
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = orders.map((order) => `
        <tr>
            <td><strong>${escapeHtml(order.id)}</strong></td>
            <td>${escapeHtml(order.customer?.name || 'Unknown')}</td>
            <td>${(order.items || []).length} items</td>
            <td><strong>$${(order.total || 0).toFixed(2)}</strong></td>
            <td><span class="status-pill ${escapeHtml(order.status || 'pending')}">${escapeHtml(order.status || 'pending')}</span></td>
            <td>${new Date(order.createdAt || Date.now()).toLocaleDateString()}</td>
            <td>
                <button class="topbar-btn icon-btn-small" type="button" onclick="viewOrder('${escapeHtml(order.id)}')"><i class="fa-solid fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function viewOrder(id) {
    const order = orders.find((entry) => entry.id === id);
    if (!order) return;

    const body = document.getElementById('orderModalBody');
    if (!body) return;

    body.innerHTML = `
        <div style="display:grid; gap:20px; color:var(--text-secondary)">
            <div>
                <p style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Customer</p>
                <p style="color:var(--text-primary); font-weight:600">${escapeHtml(order.customer?.name || 'Unknown')} (${escapeHtml(order.customer?.email || 'No email')})</p>
            </div>
            <div>
                <p style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Shipping</p>
                <p>${escapeHtml(order.shippingAddress?.street || '')}, ${escapeHtml(order.shippingAddress?.city || '')}, ${escapeHtml(order.shippingAddress?.state || '')}</p>
            </div>
            <div>
                <p style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Items</p>
                ${(order.items || []).map((item) => `<p style="color:var(--text-primary)">- ${escapeHtml(item.name)} (Sz: ${escapeHtml(item.size)}) x${item.quantity} - $${item.price}</p>`).join('')}
            </div>
            <div style="padding-top:15px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
                <span style="font-weight:700; color:var(--text-primary)">TOTAL</span>
                <span style="font-family:'Bebas Neue'; font-size:24px; color:var(--accent)">$${(order.total || 0).toFixed(2)}</span>
            </div>
        </div>
    `;

    document.getElementById('orderModal')?.classList.add('open');
}

function closeOrderModal() {
    document.getElementById('orderModal')?.classList.remove('open');
}

function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    tbody.innerHTML = customers.map((customer) => `
        <tr>
            <td><strong>${escapeHtml(customer.name)}</strong></td>
            <td>${escapeHtml(customer.email)}</td>
            <td>${customer.totalOrders || 0}</td>
            <td>$${parseFloat(customer.totalSpent || 0).toFixed(2)}</td>
            <td>${new Date(customer.lastOrder || Date.now()).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function resolveImgurUrl(raw) {
    let url = raw.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        if (host === 'i.imgur.com') {
            if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(parsed.pathname)) return `${url}.jpg`;
            return url;
        }
        if (host === 'imgur.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if ((parts[0] === 'a' || parts[0] === 'gallery') && parts[1]) return `https://i.imgur.com/${parts[1]}.jpg`;
            if (parts[0] && parts[0].length >= 5) return `https://i.imgur.com/${parts[0]}.jpg`;
        }
        return url;
    } catch {
        return null;
    }
}

function initImporter() {
    buildImporterSizeChips();
    addImporterUrlRow();
}

function handleImporterTabSwitch(tab) {
    document.getElementById('individualTabImporter').style.display = tab === 'individual' ? 'block' : 'none';
    document.getElementById('bulkTabImporter').classList.toggle('hidden', tab !== 'bulk');
    document.getElementById('tabIndividual').classList.toggle('active', tab === 'individual');
    document.getElementById('tabBulk').classList.toggle('active', tab === 'bulk');
}

function addImporterUrlRow() {
    if (importerUrlRows.length >= 12) {
        showToast('Max 12 images', 'error');
        return;
    }

    importerRowCounter += 1;
    importerUrlRows.push({ id: importerRowCounter, value: '', status: 'empty' });
    renderImporterUrlRows();
}

function renderImporterUrlRows() {
    const list = document.getElementById('urlInputList');
    if (!list) return;

    list.innerHTML = importerUrlRows.map((row, index) => `
        <div class="url-row">
            <div class="url-num">${index + 1}</div>
            <input class="url-input ${row.status}" type="url" placeholder="Imgur URL" value="${escapeHtml(row.value)}" oninput="handleImporterUrlInput(${row.id}, this.value)">
            <button class="url-remove" onclick="removeImporterUrlRow(${row.id})"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

function handleImporterUrlInput(id, value) {
    const row = importerUrlRows.find((entry) => entry.id === id);
    if (!row) return;
    row.value = value.trim();
    row.status = row.value ? (/imgur\.com/i.test(row.value) ? 'valid' : 'invalid') : 'empty';
    renderImporterUrlRows();
}

function removeImporterUrlRow(id) {
    importerUrlRows = importerUrlRows.filter((row) => row.id !== id);
    if (importerUrlRows.length === 0) {
        importerRowCounter = 0;
        addImporterUrlRow();
        return;
    }
    renderImporterUrlRows();
}

function clearImporterUrls() {
    importerUrlRows = [];
    importerRowCounter = 0;
    importerSelectedImages = [];
    importerPreviewItems = [];
    document.getElementById('previewCard')?.classList.add('hidden');
    addImporterUrlRow();
}

function processBulkImporterPaste() {
    const text = document.getElementById('bulkPasteArea')?.value || '';
    const validCount = text.split(/\n|\r/).map((line) => line.trim()).filter((line) => /imgur\.com/i.test(line)).length;
    showToast(`${validCount} Imgur links detected`, 'info');
}

function confirmBulkImporterPaste() {
    const text = document.getElementById('bulkPasteArea')?.value || '';
    const imgurLines = text.split(/\n|\r/).map((line) => line.trim()).filter((line) => /imgur\.com/i.test(line)).slice(0, 12);
    if (imgurLines.length === 0) {
        showToast('No Imgur URLs found', 'error');
        return;
    }

    importerUrlRows = imgurLines.map((line) => ({ id: ++importerRowCounter, value: line, status: 'valid' }));
    handleImporterTabSwitch('individual');
    renderImporterUrlRows();
}

async function loadImporterPreviews() {
    const validRows = importerUrlRows.filter((row) => row.status === 'valid' && row.value);
    if (validRows.length === 0) {
        showToast('Add valid Imgur URLs', 'error');
        return;
    }

    document.getElementById('importProgress')?.classList.add('show');
    importerPreviewItems = validRows.map((row) => ({
        original: row.value,
        resolved: resolveImgurUrl(row.value),
        status: 'loading'
    }));
    document.getElementById('previewCard')?.classList.remove('hidden');
    renderImporterPreviewGrid();

    for (let index = 0; index < importerPreviewItems.length; index += 1) {
        const percent = Math.round(((index + 1) / importerPreviewItems.length) * 100);
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressPct').textContent = `${percent}%`;
        document.getElementById('progressLabel').textContent = `Resolving image ${index + 1}...`;
        await verifyImporterImage(importerPreviewItems[index]);
        renderImporterPreviewItem(index);
    }

    setImporterStep(2);
    window.setTimeout(() => document.getElementById('importProgress')?.classList.remove('show'), 2000);
}

function verifyImporterImage(item) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            item.status = 'loaded';
            resolve();
        };
        img.onerror = () => {
            item.status = 'error';
            resolve();
        };
        img.src = item.resolved;
    });
}

function renderImporterPreviewGrid() {
    const grid = document.getElementById('previewGrid');
    if (!grid) return;
    grid.innerHTML = importerPreviewItems.map((_, index) => `<div class="preview-item-advanced" id="prevItem_${index}"></div>`).join('');
}

function renderImporterPreviewItem(index) {
    const item = importerPreviewItems[index];
    const element = document.getElementById(`prevItem_${index}`);
    if (!element) return;

    if (item.status === 'loaded') {
        element.innerHTML = `<img src="${escapeHtml(item.resolved)}"><div class="preview-badge-advanced">${index + 1}</div>`;
    } else {
        element.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent-red)"><i class="fa-solid fa-circle-exclamation"></i></div>';
    }
}

function resetImporterPreviews() {
    importerPreviewItems = [];
    importerSelectedImages = [];
    document.getElementById('previewCard')?.classList.add('hidden');
    setImporterStep(1);
}

function confirmImporterImages() {
    importerSelectedImages = importerPreviewItems.filter((item) => item.status === 'loaded').map((item) => item.resolved);
    if (importerSelectedImages.length === 0) {
        showToast('No images confirmed', 'error');
        return;
    }

    showToast(`${importerSelectedImages.length} images ready`);
    document.getElementById('importerFormCard')?.scrollIntoView({ behavior: 'smooth' });
}

function buildImporterSizeChips() {
    const container = document.getElementById('impSizeChips');
    if (!container) return;
    container.innerHTML = IMPORTER_SIZES.map((size) => `
        <div class="size-chip ${importerSelectedSizes.includes(size) ? 'selected' : ''}" onclick="toggleImporterSize('${size}', this)">${size}</div>
    `).join('');
}

function toggleImporterSize(size, el) {
    if (importerSelectedSizes.includes(size)) {
        importerSelectedSizes = importerSelectedSizes.filter((entry) => entry !== size);
        el.classList.remove('selected');
    } else {
        importerSelectedSizes.push(size);
        el.classList.add('selected');
    }
}

async function publishImporterProduct() {
    const name = document.getElementById('impName').value.trim();
    const resell = parseFloat(document.getElementById('impResell').value);
    if (!name || !resell || importerSelectedImages.length === 0 || importerSelectedSizes.length === 0) {
        showToast('Please complete all required fields', 'error');
        return;
    }

    const productData = {
        name,
        brand: document.getElementById('impBrand').value,
        sku: document.getElementById('impSku').value.trim(),
        price: resell,
        image: importerSelectedImages[0],
        images: importerSelectedImages,
        sizes: importerSelectedSizes.map((size) => ({ size, stock: 10, price: resell })),
        category: 'Sneakers',
        description: document.getElementById('impDesc').value.trim(),
        status: 'active',
        isHidden: document.getElementById('impHidden').checked,
        isOutOfStock: document.getElementById('impOutOfStock').checked,
        isFeatured: document.getElementById('impFeatured').checked,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('products').doc(Date.now().toString()).set(productData, { merge: true });
        showToast(`Published: ${name}`);
        setImporterStep(3);
        document.getElementById('impName').value = '';
        document.getElementById('impSku').value = '';
        document.getElementById('impRetail').value = '';
        document.getElementById('impResell').value = '';
        document.getElementById('impDesc').value = '';
        document.getElementById('impHidden').checked = false;
        document.getElementById('impOutOfStock').checked = false;
        document.getElementById('impFeatured').checked = false;
        importerSelectedSizes = [];
        buildImporterSizeChips();
        clearImporterUrls();
        resetImporterPreviews();
    } catch (error) {
        console.error(error);
        showToast('Failed to publish to cloud', 'error');
    }
}

function setImporterStep(step) {
    for (let index = 1; index <= 3; index += 1) {
        const number = document.getElementById(`step${index}num`);
        const label = document.getElementById(`step${index}label`);
        if (!number || !label) continue;
        number.className = `step-num${index < step ? ' done' : index === step ? ' active' : ''}`;
        label.className = index === step ? 'active' : '';
        number.textContent = index;
        if (index < step) number.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '+', error: '!', info: 'i' };
    toast.innerHTML = `<span>${icons[type] || '+'}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3000);
}

function animateCounter(el, target, prefix = '') {
    if (!el) return;
    const duration = 1000;
    const start = performance.now();

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = `${prefix}${Math.floor(progress * target).toLocaleString()}`;
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

function renderChart() {
    const container = document.getElementById('chartBars');
    if (!container) return;
    const max = Math.max(...chartData.map((entry) => entry.val));
    container.innerHTML = chartData.map((entry) => `
        <div class="chart-bar-wrap">
            <div class="chart-bar ${entry.active ? 'active' : ''}" style="height:${(entry.val / max) * 100}%" title="${entry.label}: $${entry.val * 100}"></div>
            <span class="chart-label">${entry.label}</span>
        </div>
    `).join('');
}

function toggleNotifPanel() {
    document.getElementById('notifPanel')?.classList.toggle('open');
}

window.switchTab = switchTab;
window.viewOrder = viewOrder;
window.openProductModal = openProductModal;
window.closeModal = closeModal;
window.closeOrderModal = closeOrderModal;
window.toggleProductVisibility = toggleProductVisibility;
window.toggleProductFeatured = toggleProductFeatured;
window.toggleOutOfStock = toggleOutOfStock;
window.handleImporterTabSwitch = handleImporterTabSwitch;
window.addImporterUrlRow = addImporterUrlRow;
window.handleImporterUrlInput = handleImporterUrlInput;
window.removeImporterUrlRow = removeImporterUrlRow;
window.clearImporterUrls = clearImporterUrls;
window.processBulkImporterPaste = processBulkImporterPaste;
window.confirmBulkImporterPaste = confirmBulkImporterPaste;
window.loadImporterPreviews = loadImporterPreviews;
window.resetImporterPreviews = resetImporterPreviews;
window.confirmImporterImages = confirmImporterImages;
window.toggleImporterSize = toggleImporterSize;
window.publishImporterProduct = publishImporterProduct;
window.toggleNotifPanel = toggleNotifPanel;
