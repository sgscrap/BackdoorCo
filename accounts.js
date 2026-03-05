/* ══════════════════════════════════════════
   BACKDOOR — CUSTOMER ACCOUNTS JS
══════════════════════════════════════════ */

/* ── STATE ── */
const STORAGE_KEY = 'bd_user';
let currentUser = null;
let wishlist = [];

/* ── PRODUCT DATA ── */
const PRODUCTS = [
    { id: 9, name: 'Acne Studios 1996 Logo T-Shirt', brand: 'Acne Studios', price: 250, emoji: '👕', sku: 'FN-UX-TSHI000013' },
    { id: 1, name: 'Air Jordan 1 Retro High OG "Chicago"', brand: 'Jordan', price: 760, emoji: '👟', sku: '555088-101' },
    { id: 2, name: 'Adidas Yeezy 350 V2 "Zebra"', brand: 'Adidas', price: 320, emoji: '🦓', sku: 'CP9654' },
    { id: 3, name: 'Nike Dunk Low Retro "Panda"', brand: 'Nike', price: 168, emoji: '🐼', sku: 'DD1391-100' },
    { id: 4, name: 'Travis Scott x Nike Dunk Low', brand: 'Nike x TS', price: 1380, emoji: '🤠', sku: 'DR0188-300' },
    { id: 5, name: 'New Balance 550 "White Green"', brand: 'New Balance', price: 150, emoji: '💚', sku: 'BB550WT1' },
    { id: 6, name: 'Jordan 4 Retro "Military Blue"', brand: 'Jordan', price: 310, emoji: '👟', sku: '408452-105' },
    { id: 7, name: 'Nike Air Max 1 "86 OG Big Bubble"', brand: 'Nike', price: 185, emoji: '💨', sku: 'DO9844-101' },
    { id: 8, name: 'Adidas Samba OG "White"', brand: 'Adidas', price: 120, emoji: '⚽', sku: 'B75806' },
];

/* ── ORDER DATA ── */
const ORDERS = [
    {
        id: 'BD-20260215-001', date: 'Feb 15, 2026', status: 'delivered', statusLabel: 'Delivered',
        item: { name: 'Air Jordan 1 Chicago', emoji: '👟', size: 'US 10', qty: 1 }, total: 760,
        tracking: '1Z999AA10123456784'
    },
    {
        id: 'BD-20260228-002', date: 'Feb 28, 2026', status: 'shipped', statusLabel: 'Shipped',
        item: { name: 'Nike Dunk Low Panda', emoji: '🐼', size: 'US 9.5', qty: 1 }, total: 168,
        tracking: '1Z999AA10123456785'
    },
    {
        id: 'BD-20260302-003', date: 'Mar 2, 2026', status: 'processing', statusLabel: 'Processing',
        item: { name: 'Yeezy 350 V2 Zebra', emoji: '🦓', size: 'US 11', qty: 1 }, total: 320,
        tracking: null
    },
];

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
    t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(110%)'; setTimeout(() => t.remove(), 300); }, 3000);
}

function getInitials(first, last) {
    return ((first || '')[0] || '').toUpperCase() + ((last || '')[0] || '').toUpperCase();
}

/* ══════════════════════════════════════════
   AUTH MODAL
══════════════════════════════════════════ */
function openAuth(tab) {
    document.getElementById('authModal').classList.add('open');
    switchAuthTab(tab || 'login');
}

function closeAuth() {
    document.getElementById('authModal').classList.remove('open');
}

function closeAuthOnOverlay(e) {
    if (e.target === e.currentTarget) closeAuth();
}

function switchAuthTab(tab) {
    const tabLogin = document.getElementById('tabLogin');
    const tabReg = document.getElementById('tabRegister');
    const formLogin = document.getElementById('loginForm');
    const formReg = document.getElementById('registerForm');

    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        formLogin.classList.remove('hidden');
        formReg.classList.add('hidden');
    } else {
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
        formReg.classList.remove('hidden');
        formLogin.classList.add('hidden');
    }
}

function togglePass(inputId, btn) {
    const inp = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        inp.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }
}

function clearError(id) {
    document.getElementById(id).classList.remove('show');
}

function validateRegEmail() {
    const email = document.getElementById('regEmail').value;
    const err = document.getElementById('regEmailErr');
    if (email && !/\S+@\S+\.\S+/.test(email)) {
        err.classList.add('show');
    } else {
        err.classList.remove('show');
    }
}

function checkPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const colors = ['var(--red)', 'var(--orange)', 'var(--accent)', 'var(--green)'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];

    for (let i = 1; i <= 4; i++) {
        const seg = document.getElementById('seg' + i);
        seg.style.background = i <= score ? colors[score - 1] : 'var(--border)';
    }

    const label = document.getElementById('strengthLabel');
    label.textContent = pw.length > 0 ? labels[score - 1] || 'Too short' : '';
    label.style.color = score > 0 ? colors[score - 1] : 'var(--text3)';
}

function socialLogin(provider) {
    showToast(`${provider} login coming soon`, 'info');
}

/* ── LOGIN ── */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginSubmitBtn');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        document.getElementById('loginEmailErr').classList.add('show');
        return;
    }

    if (!pw || pw.length < 4) {
        document.getElementById('loginPassErr').classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
    await delay(1200);

    // Simulated login — accept any valid email/pass
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const user = saved || {
        first: 'Marcus',
        last: 'Johnson',
        email: email,
        size: '10',
        phone: '',
        bday: '',
        joined: new Date().toISOString(),
    };

    user.email = email;
    loginUser(user);
    closeAuth();

    btn.disabled = false;
    btn.textContent = 'LOG IN';
    showToast('Welcome back! 👟');
}

/* ── REGISTER ── */
async function handleRegister() {
    const first = document.getElementById('regFirst').value.trim();
    const last = document.getElementById('regLast').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pw = document.getElementById('regPassword').value;
    const size = document.getElementById('regSize').value;
    const terms = document.getElementById('regTerms').checked;
    const btn = document.getElementById('regSubmitBtn');

    if (!first || !last) { showToast('Please enter your name', 'error'); return; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { showToast('Please enter a valid email', 'error'); return; }
    if (!pw || pw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (!terms) { showToast('Please accept the Terms of Service', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
    await delay(1500);

    const user = {
        first, last, email, size,
        phone: '', bday: '',
        joined: new Date().toISOString(),
    };

    loginUser(user);
    closeAuth();

    btn.disabled = false;
    btn.textContent = 'CREATE ACCOUNT';
    showToast(`Welcome to Backdoor, ${first}! 🎉`);
}

/* ── SESSION ── */
function loginUser(user) {
    currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    loadWishlist();
    updateNavUI();
    renderProductsGrid();
}

function logout() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
    wishlist = [];
    updateNavUI();
    showPage('home');
    renderProductsGrid();
    showToast('Logged out successfully', 'info');
}

function updateNavUI() {
    const authBtns = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (currentUser) {
        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');

        const initials = getInitials(currentUser.first, currentUser.last);
        document.getElementById('navAvatar').textContent = initials;
        document.getElementById('navName').textContent = currentUser.first;
        document.getElementById('dropName').textContent = `${currentUser.first} ${currentUser.last}`;
        document.getElementById('dropEmail').textContent = currentUser.email;
    } else {
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }

    updateWishlistBadge();
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.user-menu-wrap');
    if (wrap && !wrap.contains(e.target)) {
        document.getElementById('userDropdown').classList.remove('open');
    }
});

/* ══════════════════════════════════════════
   PAGES
══════════════════════════════════════════ */
function showPage(page) {
    document.getElementById('homePage').style.display = page === 'home' ? 'block' : 'none';
    document.getElementById('accountPage').classList.toggle('hidden', page !== 'account');
}

function showAccountPage(tab) {
    document.getElementById('userDropdown').classList.remove('open');
    showPage('account');
    populateAccountPage();

    // Find and activate the nav item
    const navItems = document.querySelectorAll('.acc-nav-item');
    navItems.forEach(n => {
        n.classList.remove('active');
        if (n.textContent.toLowerCase().includes(tab.substring(0, 4))) {
            n.classList.add('active');
        }
    });

    switchAccTab(tab);
}

function populateAccountPage() {
    if (!currentUser) return;

    const initials = getInitials(currentUser.first, currentUser.last);
    document.getElementById('heroAvatar').textContent = initials;
    document.getElementById('heroName').textContent = `${currentUser.first} ${currentUser.last}`;
    document.getElementById('heroEmail').textContent = currentUser.email;

    const joined = currentUser.joined ? new Date(currentUser.joined) : new Date();
    document.getElementById('heroMember').textContent = `Member since ${joined.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    // Profile form
    document.getElementById('profileFirst').value = currentUser.first || '';
    document.getElementById('profileLast').value = currentUser.last || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileSize').value = currentUser.size || '';
    document.getElementById('profileBday').value = currentUser.bday || '';

    // Loyalty bar
    const loyaltyBar = document.getElementById('loyaltyBar');
    if (loyaltyBar) loyaltyBar.style.width = '10%';

    renderOrders('overviewOrders', ORDERS.slice(0, 2));
    renderOrders('ordersTab', ORDERS);
    renderWishlistGrid();
}

function switchAccTab(tab, navEl) {
    // Hide all tabs
    document.querySelectorAll('.acc-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.acc-nav-item').forEach(n => n.classList.remove('active'));

    // Show target
    const target = document.getElementById('tab-' + tab);
    if (target) target.classList.add('active');

    if (navEl) navEl.classList.add('active');
}

function saveProfile() {
    if (!currentUser) return;
    currentUser.first = document.getElementById('profileFirst').value;
    currentUser.last = document.getElementById('profileLast').value;
    currentUser.email = document.getElementById('profileEmail').value;
    currentUser.phone = document.getElementById('profilePhone').value;
    currentUser.size = document.getElementById('profileSize').value;
    currentUser.bday = document.getElementById('profileBday').value;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    updateNavUI();
    showToast('Profile saved! ✓');
}

/* ══════════════════════════════════════════
   ORDERS
══════════════════════════════════════════ */
function renderOrders(containerId, orders) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-top">
        <div>
          <span class="order-id">${o.id}</span>
          <span class="order-date"> · ${o.date}</span>
        </div>
        <span class="status-pill status-${o.status}">${o.statusLabel}</span>
      </div>
      <div class="order-items">
        <div class="order-shoe-thumb">${o.item.emoji}</div>
        <div class="order-shoe-info">
          <h4>${o.item.name}</h4>
          <p>Size ${o.item.size} · Qty ${o.item.qty}</p>
        </div>
        <div class="order-total">$${o.total}</div>
      </div>
      ${o.tracking ? `
        <button class="order-track-btn" onclick="showToast('Tracking: ${o.tracking}', 'info')">
          <i class="fa-solid fa-truck"></i> Track Order
        </button>
      ` : ''}
    </div>
  `).join('');
}

/* ══════════════════════════════════════════
   WISHLIST
══════════════════════════════════════════ */
function loadWishlist() {
    try {
        wishlist = JSON.parse(localStorage.getItem('bd_wishlist') || '[]');
    } catch { wishlist = []; }
}

function saveWishlist() {
    localStorage.setItem('bd_wishlist', JSON.stringify(wishlist));
}

function toggleWishlist(productId) {
    if (!currentUser) {
        openAuth('login');
        showToast('Sign in to save items to your wishlist', 'info');
        return;
    }

    const idx = wishlist.indexOf(productId);
    if (idx >= 0) {
        wishlist.splice(idx, 1);
        showToast('Removed from wishlist');
    } else {
        wishlist.push(productId);
        showToast('Added to wishlist! ❤️');
    }

    saveWishlist();
    updateWishlistBadge();
    renderProductsGrid();
    renderWishlistGrid();
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    const count = wishlist.length;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);

    const ovWishlist = document.getElementById('ovWishlist');
    if (ovWishlist) ovWishlist.textContent = count;

    const tabCount = document.getElementById('wishlistTabCount');
    if (tabCount) tabCount.textContent = count + ' item' + (count !== 1 ? 's' : '');

    const countBadge = document.getElementById('wishlistCountBadge');
    if (countBadge) countBadge.textContent = count;
}

function openWishlistPanel() {
    if (!currentUser) {
        openAuth('login');
        return;
    }
    showAccountPage('wishlist');
}

function renderWishlistGrid() {
    const grid = document.getElementById('wishlistGrid');
    const empty = document.getElementById('wishlistEmpty');
    if (!grid) return;

    const items = PRODUCTS.filter(p => wishlist.includes(p.id));

    if (items.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    grid.innerHTML = items.map(p => {
        const hasDrop = Math.random() > 0.6;
        const dropAmt = Math.round(Math.random() * 40 + 10);

        return `
      <div class="wishlist-card">
        <div class="wishlist-img">
          ${p.emoji}
          <button class="wishlist-remove" onclick="toggleWishlist(${p.id})"><i class="fa-solid fa-xmark"></i></button>
          ${hasDrop ? `<span class="alert-badge drop">↓ $${dropAmt} drop</span>` : ''}
        </div>
        <div class="wishlist-info">
          <div class="wishlist-name">${p.name}</div>
          <div class="wishlist-brand">${p.brand}</div>
          <div class="wishlist-price-row">
            <div class="wishlist-price">$${p.price}</div>
            ${hasDrop ? `<div class="price-drop-info"><i class="fa-solid fa-arrow-down"></i> -$${dropAmt}</div>` : ''}
          </div>
        </div>
        <div class="wishlist-actions">
          <button class="w-btn w-btn-buy" onclick="showToast('Added to cart! 🛒')">Buy Now</button>
          <button class="w-btn w-btn-alert" onclick="this.classList.toggle('active'); showToast(this.classList.contains('active') ? 'Alert set! 🔔' : 'Alert removed', 'info')">
            <i class="fa-solid fa-bell"></i> Alert
          </button>
        </div>
      </div>
    `;
    }).join('');

    updateWishlistBadge();
}

/* ══════════════════════════════════════════
   PRODUCT GRID
══════════════════════════════════════════ */
function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = PRODUCTS.map(p => {
        const isWished = wishlist.includes(p.id);
        return `
      <div class="product-card">
        <div class="product-img">
          ${p.emoji}
          <button class="heart-btn ${isWished ? 'wishlisted' : ''}" onclick="event.stopPropagation(); toggleWishlist(${p.id})" title="Add to Wishlist">
            <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-brand">${p.brand}</div>
          <div class="product-price">$${p.price}</div>
        </div>
      </div>
    `;
    }).join('');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    // Restore session
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) {
        currentUser = saved;
        loadWishlist();
    }

    updateNavUI();
    renderProductsGrid();

    // Close modal on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAuth();
    });

    // Auto-open auth modal from URL hash (e.g. #register, #login)
    const hash = window.location.hash.replace('#', '');
    if (hash === 'register' || hash === 'login') {
        openAuth(hash);
    }
});
