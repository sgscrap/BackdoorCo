// Initialize Firebase (using config defined in index.html)
console.log('Backdoor Admin Engine: Initializing Firebase...', typeof firebaseConfig !== 'undefined' ? 'Config Found' : 'Config MISSING');
if (typeof firebaseConfig !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
} else {
    console.error('CRITICAL: firebaseConfig is not defined. Login will fail.');
}
const auth = firebase.auth();
const db = firebase.firestore();

const STORAGE_KEYS = {
    AUTH: 'backdoor_admin_auth'
};

// ============================================
// STATE
// ============================================
let orders = [];
let customers = [];
let products = [];

let currentProduct = null;

const chartData = [
    { label: 'MON', val: 20 },
    { label: 'TUE', val: 55 },
    { label: 'WED', val: 35 },
    { label: 'THU', val: 75 },
    { label: 'FRI', val: 60 },
    { label: 'SAT', val: 90 },
    { label: 'SUN', val: 45, active: true },
];

const pageData = {
    dashboard: { title: 'DASHBOARD', subtitle: "Welcome back — here's what's happening today." },
    orders: { title: 'ORDERS', subtitle: 'Manage and track all customer orders.' },
    products: { title: 'PRODUCTS', subtitle: 'Browse and manage your sneaker inventory.' },
    customers: { title: 'CUSTOMERS', subtitle: 'View and manage your customer base.' },
    import: { title: 'IMPORT PRODUCTS', subtitle: 'Import products via SKU from Kickwho.' },
    analytics: { title: 'ANALYTICS', subtitle: 'Deep dive into your store performance.' },
    settings: { title: 'SETTINGS', subtitle: 'Configure your admin preferences.' },
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing Dashboard...');
    initFirebaseListeners();
    initImporter();
    setupEventListeners();
});

function initFirebaseListeners() {
    // Products Listener
    db.collection('products').onSnapshot(snap => {
        products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
        renderDashboard();
    });

    // Orders Listener
    db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snap => {
        orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders();
        renderDashboard();
    });

    // Customers Listener
    db.collection('customers').onSnapshot(snap => {
        customers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCustomers();
        renderDashboard();
    });
}

function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            renderDashboard();
        } else {
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('adminDashboard').classList.add('hidden');
        }
    });
}

function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const email = document.getElementById('adminEmail').value;
            const pass = document.getElementById('adminPassword').value;

            btn.disabled = true;
            btn.textContent = 'Verifying...';

            try {
                await auth.signInWithEmailAndPassword(email, pass);
                showToast('Welcome back, Admin');
            } catch (err) {
                console.error('Login Error:', err);
                let message = err.message;
                if (err.code === 'auth/unauthorized-domain') {
                    message = 'UNAUTHORIZED DOMAIN: Please add backdoordmv.netlify.app to authorized domains in Firebase Console > Authentication > Settings.';
                }
                showToast('Login Failed: ' + message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Unlock Dashboard';
            }
        });
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Logout?')) {
            auth.signOut();
        }
    });

    // Global Modal Listeners
    document.getElementById('productModalClose').addEventListener('click', closeModal);
    document.getElementById('cancelProductBtn').addEventListener('click', closeModal);
    document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);

    // Buttons
    document.getElementById('addProductBtnTop').addEventListener('click', () => openProductModal());
    document.getElementById('quickAddProduct').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Initial auth check
    checkAuth();
}

// ============================================
// NAVIGATION
// ============================================
function switchTab(tab, el) {
    // Update Nav Items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');
    else {
        const target = document.querySelector(`[data-page="${tab}"]`);
        if (target) target.classList.add('active');
    }

    // Update Visuals
    const data = pageData[tab];
    document.getElementById('sectionTitle').textContent = data.title;
    document.getElementById('sectionSubtitle').textContent = data.subtitle;

    // Show Section
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(`${tab}Section`);
    if (section) section.classList.add('active');

    // Load Data
    if (tab === 'dashboard') renderDashboard();
    if (tab === 'orders') renderOrders();
    if (tab === 'products') renderProducts();
    if (tab === 'customers') renderCustomers();
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
    const totalRev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    // Stat Counters
    animateCounter(document.getElementById('revenueVal'), totalRev, '$');
    animateCounter(document.getElementById('ordersVal'), orders.length);
    animateCounter(document.getElementById('pendingVal'), pendingCount);
    animateCounter(document.getElementById('customersVal'), customers.length);

    // Badges
    document.getElementById('orderBadge').textContent = pendingCount;
    document.getElementById('productBadge').textContent = products.length;

    renderChart();
    renderRecentOrders();
    renderLowStock();
}

function renderRecentOrders() {
    const list = document.getElementById('recentOrdersList');
    const recent = orders.slice(0, 5);
        list.innerHTML = recent.map(o => `
        <tr tabindex="0" role="button" onclick="viewOrder('${o.id}')" onkeydown="if(event.key==='Enter' || event.key===' ') { event.preventDefault(); viewOrder('${o.id}'); }" style="cursor:pointer">
            <td><span class="order-id">${o.id}</span></td>
            <td>${o.customer.name}</td>
            <td style="color:var(--text-primary);font-weight:600">$${(o.total || 0).toFixed(2)}</td>
            <td><span class="status-pill ${o.status}">${o.status}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted)">No orders yet.</td></tr>';
}

function renderLowStock() {
    const list = document.getElementById('lowStockList');
    const lowStock = [];
    products.forEach(p => {
        p.sizes.forEach(s => {
            if (s.stock < 5) lowStock.push({ name: p.name, size: s.size, stock: s.stock, img: p.image, brand: p.brand, price: s.price });
        });
    });

        list.innerHTML = lowStock.slice(0, 4).map(s => `
        <button type="button" class="inventory-item" onclick="openProductModal(${products.find(p => p.name === s.name).id})">
            <div class="shoe-thumb"><img src="../${s.img}" alt=""></div>
            <div class="shoe-info">
                <div class="shoe-name">${s.name} (${s.size})</div>
                <div class="shoe-brand">${s.brand}</div>
                <div class="stock-indicator">
                    <div class="stock-dot ${s.stock === 0 ? 'out' : 'low'}"></div>
                    <span style="color:var(--text-muted);font-size:11px">${s.stock} in stock</span>
                </div>
            </div>
            <div class="shoe-price">$${s.price.toFixed(0)}</div>
        </button>
    `).join('') || '<p style="text-align:center; padding:20px; color:var(--text-muted)">Stock levels are healthy.</p>';
}

// ============================================
// PRODUCTS
// ============================================
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.map(p => {
        const totalStock = p.sizes.reduce((sum, s) => sum + s.stock, 0);
        return `
      <tr>
        <td><div class="shoe-thumb"><img src="../${p.image}" alt=""></div></td>
        <td><strong>${p.name}</strong></td>
        <td><code>${p.sku}</code></td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${totalStock} items</td>
        <td>${p.category}</td>
        <td><span class="status-pill active">${p.status || 'Active'}</span></td>
        <td>
           <button class="topbar-btn" style="width:32px; height:32px" onclick="openProductModal(${p.id})"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>
    `;
    }).join('');
}

function openProductModal(id = null) {
    currentProduct = id ? products.find(p => p.id === id) : null;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');

    title.textContent = id ? 'EDIT PRODUCT' : 'ADD PRODUCT';

    if (currentProduct) {
        document.getElementById('productName').value = currentProduct.name;
        document.getElementById('productBrand').value = currentProduct.brand;
        document.getElementById('productSKU').value = currentProduct.sku;
        document.getElementById('productCategory').value = currentProduct.category;
        document.getElementById('productPrice').value = currentProduct.price;
        document.getElementById('productDescription').value = currentProduct.description || '';
        document.getElementById('productImage').value = currentProduct.image || '';
        renderSizeGrid(currentProduct.sizes);
    } else {
        document.getElementById('productForm').reset();
        renderSizeGrid();
    }

    modal.classList.add('open');
}

function renderSizeGrid(existingSizes = []) {
    const grid = document.getElementById('sizeInventoryGrid');
    const defaultSizes = ["US 7", "US 8", "US 9", "US 10", "US 11", "US 12"];

    grid.innerHTML = defaultSizes.map(size => {
        const match = existingSizes.find(s => s.size === size);
        return `
      <div class="size-item">
        <span>${size}</span>
        <input type="number" placeholder="Stock" class="size-stock" data-size="${size}" value="${match ? match.stock : 0}">
        <input type="number" placeholder="Price" class="size-price" data-size="${size}" value="${match ? match.price : ''}">
      </div>
    `;
    }).join('');
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving & Syncing...';
    btn.disabled = true;

    const sizeEntries = [];
    document.querySelectorAll('.size-item').forEach(item => {
        const size = item.querySelector('span').textContent;
        const stock = parseInt(item.querySelector('.size-stock').value) || 0;
        const price = parseFloat(item.querySelector('.size-price').value) || parseFloat(document.getElementById('productPrice').value) || 0;
        sizeEntries.push({ size, stock, price });
    });

    const productId = currentProduct ? currentProduct.id : Date.now().toString();
    const productData = {
        name: document.getElementById('productName').value,
        brand: document.getElementById('productBrand').value,
        sku: document.getElementById('productSKU').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        description: document.getElementById('productDescription').value,
        sizes: sizeEntries,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // 1. Sync to Firestore
        await db.collection('products').doc(productId).set(productData, { merge: true });

        // 2. Also call local API if available (for Git push functionality)
        const formData = new FormData();
        formData.append('id', productId);
        Object.keys(productData).forEach(key => {
            if (key === 'sizes') formData.append(key, JSON.stringify(productData[key]));
            else formData.append(key, productData[key]);
        });

        const fileInput = document.getElementById('productImage');
        if (fileInput.files.length > 0) {
            formData.append('imageFile', fileInput.files[0]);
        }

        const apiRes = await fetch('http://localhost:5001/api/products', {
            method: 'POST',
            body: formData
        });
        const apiData = await apiRes.json();

        if (apiData.success) {
            showToast('✓ Product saved and pushed to Git!', 'success');
        } else {
            showToast('Firestore synced, but Git push failed.', 'warning');
        }
        closeModal();
    } catch (err) {
        console.error(err);
        showToast('Error syncing product: ' + err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function closeModal() {
    document.getElementById('productModal').classList.remove('open');
}

// ============================================
// ORDERS
// ============================================
function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customer.name}</td>
      <td>${(o.items || []).length} items</td>
      <td><strong>$${(o.total || 0).toFixed(2)}</strong></td>
      <td><span class="status-pill ${o.status}">${o.status}</span></td>
      <td>${new Date(o.createdAt || Date.now()).toLocaleDateString()}</td>
      <td>
        <button class="topbar-btn" style="width:32px; height:32px" onclick="viewOrder('${o.id}')"><i class="fa-solid fa-eye"></i></button>
      </td>
    </tr>
  `).join('');
}

function viewOrder(id) {
    const o = orders.find(ord => ord.id === id);
    if (!o) return;

    const body = document.getElementById('orderModalBody');
    body.innerHTML = `
    <div style="display:grid; gap:20px; color:var(--text-secondary)">
      <div>
        <p style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Customer</p>
        <p style="color:var(--text-primary); font-weight:600">${o.customer.name} (${o.customer.email})</p>
      </div>
      <div>
        <p style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Shipping</p>
        <p>${o.shippingAddress.street}, ${o.shippingAddress.city}, ${o.shippingAddress.state}</p>
      </div>
      <div>
        <p style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Items</p>
        ${o.items.map(i => `<p style="color:var(--text-primary)">• ${i.name} (Sz: ${i.size}) x${i.quantity} - $${i.price}</p>`).join('')}
      </div>
      <div style="padding-top:15px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
         <span style="font-weight:700; color:var(--text-primary)">TOTAL</span>
         <span style="font-family:'Bebas Neue'; font-size:24px; color:var(--accent)">$${o.total.toFixed(2)}</span>
      </div>
    </div>
  `;

    document.getElementById('orderModal').classList.add('open');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
}

// ============================================
// CUSTOMERS
// ============================================
function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.email}</td>
      <td>${c.totalOrders}</td>
      <td>$${parseFloat(c.totalSpent).toFixed(2)}</td>
      <td>${new Date(c.lastOrder).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

// ============================================
// ADVANCED IMGUR IMPORTER
// ============================================

let importerUrlRows = [];
let importerPreviewItems = [];
let importerSelectedImages = [];
let importerActiveTab = 'individual';
let importerRowCounter = 0;
let importerSelectedSizes = [];

const IMPORTER_SIZES = ['US 7', 'US 7.5', 'US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 11', 'US 12', 'US 13'];

function resolveImgurUrl(raw) {
    let url = raw.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        if (host === 'i.imgur.com') {
            if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(u.pathname)) return url + '.jpg';
            return url;
        }
        if (host === 'imgur.com') {
            const parts = u.pathname.split('/').filter(Boolean);
            if ((parts[0] === 'a' || parts[0] === 'gallery') && parts[1]) return `https://i.imgur.com/${parts[1]}.jpg`;
            if (parts[0] && parts[0].length >= 5) return `https://i.imgur.com/${parts[0]}.jpg`;
        }
        return url;
    } catch { return null; }
}

function initImporter() {
    buildImporterSizeChips();
    addImporterUrlRow();
}

function handleImporterTabSwitch(tab) {
    importerActiveTab = tab;
    document.getElementById('individualTabImporter').style.display = tab === 'individual' ? 'block' : 'none';
    const bulkTab = document.getElementById('bulkTabImporter');
    if (tab === 'bulk') bulkTab.classList.remove('hidden');
    else bulkTab.classList.add('hidden');
    document.getElementById('tabIndividual').classList.toggle('active', tab === 'individual');
    document.getElementById('tabBulk').classList.toggle('active', tab === 'bulk');
}

function addImporterUrlRow() {
    if (importerUrlRows.length >= 12) return showToast('Max 12 images', 'error');
    const id = ++importerRowCounter;
    importerUrlRows.push({ id, value: '', status: 'empty' });
    renderImporterUrlRows();
}

function renderImporterUrlRows() {
    const list = document.getElementById('urlInputList');
    if (!list) return;
    list.innerHTML = importerUrlRows.map((row, i) => `
        <div class="url-row">
            <div class="url-num">${i + 1}</div>
            <input class="url-input ${row.status}" type="url" placeholder="Imgur URL" 
                value="${row.value}" oninput="handleImporterUrlInput(${row.id}, this.value)">
            <button class="url-remove" onclick="removeImporterUrlRow(${row.id})"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

function handleImporterUrlInput(id, val) {
    const row = importerUrlRows.find(r => r.id === id);
    if (row) {
        row.value = val.trim();
        row.status = row.value ? (/imgur\.com/i.test(row.value) ? 'valid' : 'invalid') : 'empty';
        const input = document.querySelector(`.url-row:nth-child(${importerUrlRows.indexOf(row) + 1}) .url-input`);
        if (input) input.className = `url-input ${row.status}`;
    }
}

function removeImporterUrlRow(id) {
    importerUrlRows = importerUrlRows.filter(r => r.id !== id);
    if (importerUrlRows.length === 0) addImporterUrlRow();
    renderImporterUrlRows();
}

function clearImporterUrls() {
    importerUrlRows = [];
    importerRowCounter = 0;
    addImporterUrlRow();
    document.getElementById('previewCard').classList.add('hidden');
    importerSelectedImages = [];
}

function processBulkImporterPaste() {
    const text = document.getElementById('bulkPasteArea').value;
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    const valid = lines.filter(l => /imgur\.com/i.test(l)).length;
    showToast(`${valid} Imgur links detected`, 'info');
}

function confirmBulkImporterPaste() {
    const text = document.getElementById('bulkPasteArea').value;
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    const imgurLines = lines.filter(l => /imgur\.com/i.test(l)).slice(0, 12);

    if (!imgurLines.length) return showToast('No Imgur URLs found', 'error');

    importerUrlRows = imgurLines.map(line => ({ id: ++importerRowCounter, value: line, status: 'valid' }));
    handleImporterTabSwitch('individual');
    renderImporterUrlRows();
}

async function loadImporterPreviews() {
    const valid = importerUrlRows.filter(r => r.status === 'valid' && r.value);
    if (!valid.length) return showToast('Add valid Imgur URLs', 'error');

    const progress = document.getElementById('importProgress');
    progress.classList.add('show');

    importerPreviewItems = valid.map(r => ({ original: r.value, resolved: resolveImgurUrl(r.value), status: 'loading' }));
    document.getElementById('previewCard').classList.remove('hidden');
    renderImporterPreviewGrid();

    for (let i = 0; i < importerPreviewItems.length; i++) {
        const pct = Math.round(((i + 1) / importerPreviewItems.length) * 100);
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('progressPct').textContent = pct + '%';
        document.getElementById('progressLabel').textContent = `Resolving image ${i + 1}...`;

        await verifyImporterImage(importerPreviewItems[i]);
        renderImporterPreviewItem(i);
    }

    setImporterStep(2);
    setTimeout(() => progress.classList.remove('show'), 2000);
}

function verifyImporterImage(item) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => { item.status = 'loaded'; resolve(); };
        img.onerror = () => { item.status = 'error'; resolve(); };
        img.src = item.resolved;
    });
}

function renderImporterPreviewGrid() {
    const grid = document.getElementById('previewGrid');
    if (!grid) return;
    grid.innerHTML = importerPreviewItems.map((_, i) => `<div class="preview-item-advanced" id="prevItem_${i}"></div>`).join('');
}

function renderImporterPreviewItem(i) {
    const item = importerPreviewItems[i];
    const el = document.getElementById(`prevItem_${i}`);
    if (!el) return;
    if (item.status === 'loaded') {
        el.innerHTML = `<img src="${item.resolved}"><div class="preview-badge-advanced">${i + 1}</div>`;
    } else {
        el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent-red)"><i class="fa-solid fa-circle-exclamation"></i></div>`;
    }
}

function resetImporterPreviews() {
    document.getElementById('previewCard').classList.add('hidden');
    importerPreviewItems = [];
    importerSelectedImages = [];
    setImporterStep(1);
}

function confirmImporterImages() {
    importerSelectedImages = importerPreviewItems.filter(p => p.status === 'loaded').map(p => p.resolved);
    if (!importerSelectedImages.length) return showToast('No images confirmed', 'error');
    showToast(`${importerSelectedImages.length} images ready`);
    document.getElementById('importerFormCard').scrollIntoView({ behavior: 'smooth' });
}

function buildImporterSizeChips() {
    const container = document.getElementById('impSizeChips');
    if (!container) return;
    container.innerHTML = IMPORTER_SIZES.map(s => `<button type="button" class="size-chip" onclick="toggleImporterSize('${s}', this)">${s}</button>`).join('');
}

function toggleImporterSize(s, el) {
    if (importerSelectedSizes.includes(s)) {
        importerSelectedSizes = importerSelectedSizes.filter(sz => sz !== s);
        el.classList.remove('selected');
    } else {
        importerSelectedSizes.push(s);
        el.classList.add('selected');
    }
}

async function publishImporterProduct() {
    const name = document.getElementById('impName').value;
    const resell = parseFloat(document.getElementById('impResell').value);

    if (!name || !resell || !importerSelectedImages.length || !importerSelectedSizes.length) {
        return showToast('Please complete all required fields', 'error');
    }

    const productId = Date.now().toString();
    const p = {
        name,
        brand: document.getElementById('impBrand').value,
        sku: document.getElementById('impSku').value,
        price: resell,
        image: importerSelectedImages[0],
        images: importerSelectedImages,
        sizes: importerSelectedSizes.map(sz => ({ size: sz, stock: 10, price: resell })),
        category: 'Sneakers',
        description: document.getElementById('impDesc').value,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('products').doc(productId).set(p);
        showToast(`Published to Cloud: ${name}`);
        setImporterStep(3);

        // Clear Form
        document.getElementById('impName').value = '';
        document.getElementById('impResell').value = '';
        importerSelectedSizes = [];
        buildImporterSizeChips();
        clearImporterUrls();
    } catch (err) {
        console.error(err);
        showToast('Failed to publish to Cloud', 'error');
    }
}

function setImporterStep(step) {
    for (let i = 1; i <= 3; i++) {
        const num = document.getElementById(`step${i}num`);
        const label = document.getElementById(`step${i}label`);
        if (!num || !label) continue;
        num.className = 'step-num' + (i < step ? ' done' : (i === step ? ' active' : ''));
        label.className = i === step ? 'active' : '';
        if (i < step) num.innerHTML = '<i class="fa-solid fa-check"></i>';
        else num.textContent = i;
    }
}

// Hook into the main init
// initImporter() is already called in the top-level DOMContentLoaded


// Data is now handled via initFirebaseListeners

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function animateCounter(el, target, prefix = '') {
    if (!el) return;
    let current = 0;
    const duration = 1000;
    const start = performance.now();

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        current = progress * target;
        el.textContent = prefix + Math.floor(current).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function renderChart() {
    const container = document.getElementById('chartBars');
    if (!container) return;
    const max = Math.max(...chartData.map(d => d.val));
    container.innerHTML = chartData.map(d => `
    <div class="chart-bar-wrap">
      <div class="chart-bar ${d.active ? 'active' : ''}" 
           style="height:${(d.val / max) * 100}%" 
           title="${d.label}: $${d.val * 100}"></div>
      <span class="chart-label">${d.label}</span>
    </div>
  `).join('');
}

function toggleNotifPanel() {
    document.getElementById('notifPanel').classList.toggle('open');
}
