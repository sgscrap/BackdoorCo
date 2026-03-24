/* ══════════════════════════════════════════
   BACKDOOR — CUSTOMER ACCOUNTS JS
   Firebase Auth + Firestore integration
══════════════════════════════════════════ */

/* ── STATE ── */
let currentUser = null;     // Firebase Auth user object
let userProfile = null;     // Firestore profile data
let wishlist = [];          // array of product IDs

/* ── FIREBASE REFS ── */
// Use accessor functions so we always get a fresh reference
// regardless of when Firebase was initialized.
function getAuth() { return firebase.auth(); }
function getDb()   { return firebase.firestore(); }

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

function fmt(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ══════════════════════════════════════════
   FIREBASE INIT
══════════════════════════════════════════ */
function initFirebase() {
    if (!window.firebaseConfig) return;
    
    // Listen for the master auth event from auth.js
    window.addEventListener('backdoor-auth-changed', async (event) => {
        const { user, profile } = event.detail;
        
        if (user) {
            currentUser = user;
            userProfile = profile;
            wishlist = profile?.wishlist || [];
            
            updateNavUI();
            renderProductsGrid();
            
            // If already on account page, refresh
            const accountPage = document.getElementById('accountPage');
            if (accountPage && !accountPage.classList.contains('hidden')) {
                populateAccountPage();
            }
        } else {
            currentUser = null;
            userProfile = null;
            wishlist = [];
            updateNavUI();
            renderProductsGrid();
            showPage('home');
        }
    });

    // Initial check if auth.js already finished
    if (window.globalUser || window.globalProfile) {
        currentUser = window.globalUser;
        userProfile = window.globalProfile;
        wishlist = window.globalWishlist || [];
        updateNavUI();
        renderProductsGrid();
    }
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
    const tabReg   = document.getElementById('tabRegister');
    const formLogin = document.getElementById('loginForm');
    const formReg   = document.getElementById('registerForm');

    if (tab === 'login') {
        tabLogin.classList.add('active'); tabReg.classList.remove('active');
        formLogin.classList.remove('hidden'); formReg.classList.add('hidden');
    } else {
        tabReg.classList.add('active'); tabLogin.classList.remove('active');
        formReg.classList.remove('hidden'); formLogin.classList.add('hidden');
    }
}

function togglePass(inputId, btn) {
    const inp = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text'; icon.className = 'fa-regular fa-eye-slash';
    } else {
        inp.type = 'password'; icon.className = 'fa-regular fa-eye';
    }
}

function clearError(id) { document.getElementById(id).classList.remove('show'); }

function validateRegEmail() {
    const email = document.getElementById('regEmail').value;
    const err   = document.getElementById('regEmailErr');
    if (email && !/\S+@\S+\.\S+/.test(email)) err.classList.add('show');
    else err.classList.remove('show');
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
    label.textContent = pw.length > 0 ? (labels[score - 1] || 'Too short') : '';
    label.style.color  = score > 0 ? colors[score - 1] : 'var(--text3)';
}

/* ── GOOGLE LOGIN ── */
async function socialLogin(provider) {
    if (provider !== 'Google') { showToast(`${provider} login coming soon`, 'info'); return; }
    try {
        const prov = new firebase.auth.GoogleAuthProvider();
        const result = await getAuth().signInWithPopup(prov);
        const user   = result.user;
        // Create profile if new user
        const ref = getDb().collection('users').doc(user.uid);
        const snap = await ref.get();
        if (!snap.exists) {
            const names = (user.displayName || '').split(' ');
            await ref.set({
                first:  names[0] || '',
                last:   names.slice(1).join(' ') || '',
                email:  user.email,
                photoURL: user.photoURL || '',
                size:   '',
                phone:  '',
                bday:   '',
                joined: firebase.firestore.FieldValue.serverTimestamp(),
                loyaltyPoints: 0,
                wishlist: [],
            });
        }
        closeAuth();
        showToast(`Welcome, ${user.displayName || 'back'}! 👋`);
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Google sign-in failed', 'error');
    }
}

/* ── EMAIL LOGIN ── */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pw    = document.getElementById('loginPassword').value;
    const btn   = document.getElementById('loginSubmitBtn');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        document.getElementById('loginEmailErr').classList.add('show'); return;
    }
    if (!pw || pw.length < 4) {
        document.getElementById('loginPassErr').classList.add('show'); return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        await getAuth().signInWithEmailAndPassword(email, pw);
        closeAuth();
        showToast('Welcome back! 👟');
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
            document.getElementById('loginPassErr').classList.add('show');
        } else {
            showToast(err.message || 'Login failed', 'error');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'LOG IN';
    }
}

/* ── REGISTER ── */
async function handleRegister() {
    const first = document.getElementById('regFirst').value.trim();
    const last  = document.getElementById('regLast').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pw    = document.getElementById('regPassword').value;
    const size  = document.getElementById('regSize').value;
    const terms = document.getElementById('regTerms').checked;
    const btn   = document.getElementById('regSubmitBtn');

    if (!first || !last) { showToast('Please enter your name', 'error'); return; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { showToast('Please enter a valid email', 'error'); return; }
    if (!pw || pw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (!terms) { showToast('Please accept the Terms of Service', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        const cred = await getAuth().createUserWithEmailAndPassword(email, pw);
        await getDb().collection('users').doc(cred.user.uid).set({
            first, last, email, size,
            phone: '', bday: '',
            joined: firebase.firestore.FieldValue.serverTimestamp(),
            loyaltyPoints: 0,
            wishlist: [],
        });
        closeAuth();
        showToast(`Welcome to Backdoor, ${first}! 🎉`);
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Registration failed', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'CREATE ACCOUNT';
    }
}

/* ── LOGOUT ── */
async function logout() {
    await getAuth().signOut();
    showToast('Logged out successfully', 'info');
}

/* ══════════════════════════════════════════
   USER PROFILE (Firestore)
══════════════════════════════════════════ */
async function loadUserProfile(uid) {
    try {
        const snap = await getDb().collection('users').doc(uid).get();
        userProfile = snap.exists ? snap.data() : {};
    } catch (e) {
        userProfile = {};
    }
}

/* ══════════════════════════════════════════
   NAV UI
══════════════════════════════════════════ */
function updateNavUI() {
    const authBtns = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (currentUser && userProfile) {
        const first = userProfile.first || currentUser.displayName?.split(' ')[0] || 'User';
        const last  = userProfile.last  || currentUser.displayName?.split(' ').slice(1).join(' ') || '';

        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');

        const initials = getInitials(first, last);
        document.getElementById('navAvatar').textContent  = initials;
        document.getElementById('navName').textContent    = first;
        document.getElementById('dropName').textContent   = `${first} ${last}`.trim();
        document.getElementById('dropEmail').textContent  = currentUser.email || '';
    } else {
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }

    updateWishlistBadge();
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('open');
}

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
    document.getElementById('homePage').style.display     = page === 'home' ? 'block' : 'none';
    document.getElementById('accountPage').classList.toggle('hidden', page !== 'account');
}

function showAccountPage(tab) {
    if (!currentUser) { openAuth('login'); return; }
    document.getElementById('userDropdown').classList.remove('open');
    showPage('account');
    populateAccountPage();
    switchAccTab(tab);
}

function populateAccountPage() {
    if (!currentUser || !userProfile) return;

    const first  = userProfile.first || '';
    const last   = userProfile.last  || '';
    const initials = getInitials(first, last);

    document.getElementById('heroAvatar').textContent  = initials || '?';
    document.getElementById('heroName').textContent    = `${first} ${last}`.trim() || currentUser.email;
    document.getElementById('heroEmail').textContent   = currentUser.email || '';

    const joined = userProfile.joined;
    const joinedDate = joined?.toDate ? joined.toDate() : new Date();
    document.getElementById('heroMember').textContent  = `Member since ${joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    // Profile form
    document.getElementById('profileFirst').value  = first;
    document.getElementById('profileLast').value   = last;
    document.getElementById('profileEmail').value  = currentUser.email || '';
    document.getElementById('profilePhone').value  = userProfile.phone || '';
    document.getElementById('profileSize').value   = userProfile.size  || '';
    document.getElementById('profileBday').value   = userProfile.bday  || '';

    // Loyalty
    const pts = userProfile.loyaltyPoints || 0;
    const loyaltyBar = document.getElementById('loyaltyBar');
    if (loyaltyBar) loyaltyBar.style.width = Math.min((pts / 5000) * 100, 100) + '%';
    const loyaltyPoints = document.getElementById('loyaltyPoints');
    if (loyaltyPoints) loyaltyPoints.textContent = pts;

    renderWishlistGrid();
    loadAndRenderOrders();
}

function switchAccTab(tab, navEl) {
    document.querySelectorAll('.acc-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.acc-nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById('tab-' + tab);
    if (target) target.classList.add('active');
    if (navEl) navEl.classList.add('active');
    else {
        document.querySelectorAll('.acc-nav-item').forEach(n => {
            if (n.textContent.toLowerCase().includes(tab.substring(0, 4))) n.classList.add('active');
        });
    }
}

async function saveProfile() {
    if (!currentUser) return;

    const updates = {
        first: document.getElementById('profileFirst').value.trim(),
        last:  document.getElementById('profileLast').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        size:  document.getElementById('profileSize').value.trim(),
        bday:  document.getElementById('profileBday').value,
    };

    try {
        await getDb().collection('users').doc(currentUser.uid).update(updates);
        Object.assign(userProfile, updates);
        updateNavUI();
        showToast('Profile saved! ✓');
    } catch (e) {
        showToast('Failed to save profile', 'error');
    }
}

/* ══════════════════════════════════════════
   ORDERS (Firestore)
══════════════════════════════════════════ */
async function loadAndRenderOrders() {
    if (!currentUser) return;

    try {
        const snap = await getDb().collection('orders')
            .where('customerEmail', '==', currentUser.email)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (orders.length === 0) {
            // Fallback: try userId field
            const snap2 = await getDb().collection('orders')
                .where('userId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            const orders2 = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
            renderOrders('overviewOrders', orders2.slice(0, 2));
            renderOrders('ordersTab', orders2);
            const badge = document.getElementById('orderCountBadge');
            if (badge) badge.textContent = orders2.length;
            const ovCard = document.getElementById('ovOrders');
            if (ovCard) ovCard.textContent = orders2.length;
        } else {
            renderOrders('overviewOrders', orders.slice(0, 2));
            renderOrders('ordersTab', orders);
            const badge = document.getElementById('orderCountBadge');
            if (badge) badge.textContent = orders.length;
        }
    } catch (e) {
        console.error('loadOrders error', e);
        // Gracefully show empty state
        renderOrders('overviewOrders', []);
        renderOrders('ordersTab', []);
    }
}

function renderOrders(containerId, orders) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: var(--text3);">
          <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 12px; opacity: 0.4;"></i>
          <p>No orders yet.</p>
        </div>`;
        return;
    }

    container.innerHTML = orders.map(o => {
        const status      = o.status || 'processing';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
        const orderNumber = o.orderNumber || o.id;
        const dateStr     = o.createdAt ? fmt(o.createdAt) : '—';
        const total       = o.pricing?.total || o.total || 0;
        const items       = o.items || [];
        const firstItem   = items[0] || {};
        const tracking    = o.trackingNumber || o.tracking || null;
        const carrier     = o.carrier || 'ups';

        return `
    <div class="order-card">
      <div class="order-top">
        <div>
          <span class="order-id">#${orderNumber}</span>
          <span class="order-date"> · ${dateStr}</span>
        </div>
        <span class="status-pill status-${status}">${statusLabel}</span>
      </div>
      <div class="order-items">
        <div class="order-shoe-thumb">👟</div>
        <div class="order-shoe-info">
          <h4>${firstItem.name || firstItem.title || 'Order'}</h4>
          <p>${firstItem.size ? 'Size ' + firstItem.size : ''} ${items.length > 1 ? '+ ' + (items.length - 1) + ' more' : ''}</p>
        </div>
        <div class="order-total">$${Number(total).toFixed(2)}</div>
      </div>
      ${tracking ? `
        <a class="order-track-btn" href="tracking.html?order=${encodeURIComponent(orderNumber)}">
          <i class="fa-solid fa-truck"></i> Track Order
        </a>
      ` : `
        <button class="order-track-btn" onclick="showToast('Tracking not yet available', 'info')">
          <i class="fa-solid fa-clock"></i> Processing
        </button>
      `}
    </div>`;
    }).join('');
}

/* ══════════════════════════════════════════
   WISHLIST (Firestore)
══════════════════════════════════════════ */
async function loadWishlist(uid) {
    try {
        const snap = await getDb().collection('users').doc(uid).get();
        wishlist = snap.exists ? (snap.data().wishlist || []) : [];
    } catch { wishlist = []; }
    updateWishlistBadge();
}

async function toggleWishlist(productId) {
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

    try {
        await getDb().collection('users').doc(currentUser.uid).update({
            wishlist: firebase.firestore.FieldValue.arrayUnion
                ? (idx >= 0
                    ? firebase.firestore.FieldValue.arrayRemove(productId)
                    : firebase.firestore.FieldValue.arrayUnion(productId))
                : wishlist
        });
    } catch (e) {
        console.error('wishlist update error', e);
    }

    updateWishlistBadge();
    renderProductsGrid();
    renderWishlistGrid();
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    const count = wishlist.length;
    if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
    const ov = document.getElementById('ovWishlist');
    if (ov) ov.textContent = count;
    const tabCount = document.getElementById('wishlistTabCount');
    if (tabCount) tabCount.textContent = count + ' item' + (count !== 1 ? 's' : '');
    const countBadge = document.getElementById('wishlistCountBadge');
    if (countBadge) countBadge.textContent = count;
}

function openWishlistPanel() {
    if (!currentUser) { openAuth('login'); return; }
    showAccountPage('wishlist');
}

async function renderWishlistGrid() {
    const grid  = document.getElementById('wishlistGrid');
    const empty = document.getElementById('wishlistEmpty');
    if (!grid) return;

    if (wishlist.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    // Fetch product data from Firestore
    let items = [];
    try {
        const chunks = [];
        for (let i = 0; i < wishlist.length; i += 10) chunks.push(wishlist.slice(i, i + 10));
        for (const chunk of chunks) {
            const snap = await getDb().collection('products').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
            snap.docs.forEach(d => items.push({ id: d.id, ...d.data() }));
        }
    } catch (e) {
        console.error('wishlist fetch error', e);
    }

    if (items.length === 0) {
        // Fallback: just show IDs
        grid.innerHTML = wishlist.map(id => `
      <div class="wishlist-card">
        <div class="wishlist-img">👟
          <button class="wishlist-remove" onclick="toggleWishlist('${id}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wishlist-info">
          <div class="wishlist-name">Product #${id}</div>
          <div class="wishlist-actions">
            <a class="w-btn w-btn-buy" href="product.html?id=${id}">View</a>
          </div>
        </div>
      </div>`).join('');
        updateWishlistBadge();
        return;
    }

    grid.innerHTML = items.map(p => {
        const img   = p.images?.[0] || p.imageUrl || '';
        const price = p.price || 0;
        const name  = p.name || p.title || 'Unknown';
        const brand = p.brand || '';

        return `
      <div class="wishlist-card">
        <div class="wishlist-img" style="${img ? `background-image:url('${img}');background-size:cover;background-position:center;` : ''}">
          ${!img ? '👟' : ''}
          <button class="wishlist-remove" onclick="toggleWishlist('${p.id}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wishlist-info">
          <div class="wishlist-name">${name}</div>
          <div class="wishlist-brand">${brand}</div>
          <div class="wishlist-price-row">
            <div class="wishlist-price">$${price}</div>
          </div>
        </div>
        <div class="wishlist-actions">
          <a class="w-btn w-btn-buy" href="product.html?id=${p.id}">View</a>
          <button class="w-btn w-btn-alert" onclick="this.classList.toggle('active'); showToast(this.classList.contains('active') ? 'Alert set! 🔔' : 'Alert removed', 'info')">
            <i class="fa-solid fa-bell"></i> Alert
          </button>
        </div>
      </div>`;
    }).join('');

    updateWishlistBadge();
}

/* ══════════════════════════════════════════
   PRODUCT GRID (accounts.html demo products)
══════════════════════════════════════════ */
const DEMO_PRODUCTS = [
    { id: 'black-cat-4',   name: 'Jordan 4 "Black Cat"',       brand: 'Jordan', price: 310,  emoji: '👟' },
    { id: 'acne-tee',      name: 'Acne Studios 1996 Tee',      brand: 'Acne',   price: 250,  emoji: '👕' },
    { id: 'kids-phantom',  name: 'Kids Black Phantom',          brand: 'Nike',   price: 180,  emoji: '👟' },
    { id: 'off-white-belt',name: 'Off-White Belt',              brand: 'Off-White', price: 220, emoji: '👜' },
];

function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = DEMO_PRODUCTS.map(p => {
        const isWished = wishlist.includes(p.id);
        return `
      <div class="product-card">
        <div class="product-img">
          ${p.emoji}
          <button class="heart-btn ${isWished ? 'wishlisted' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')" title="Add to Wishlist">
            <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-brand">${p.brand}</div>
          <div class="product-price">$${p.price}</div>
        </div>
      </div>`;
    }).join('');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();

    renderProductsGrid();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAuth();
    });

    const hash = window.location.hash.replace('#', '');
    if (hash === 'register' || hash === 'login') openAuth(hash);
});
