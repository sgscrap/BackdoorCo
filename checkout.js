/* ══════════════════════════════════════════
   BACKDOOR — CHECKOUT JS (UPGRADED v2)
   - Reads cart from localStorage (backdoor-cart)
   - Step-gated 3-step wizard (Contact → Shipping → Payment)
   - Saves orders to Firebase Firestore
   - Clears localStorage cart on success
══════════════════════════════════════════ */

/* ── FIREBASE ── */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw",
    authDomain: "coalition-aec44.firebaseapp.com",
    projectId: "coalition-aec44",
    storageBucket: "coalition-aec44.firebasestorage.app",
    messagingSenderId: "312196142925",
    appId: "1:312196142925:web:ba090f602c8b5a31b20904"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ── PROMO CODES ── */
const PROMO_CODES = {
    'BACKDOOR10': { type: 'percent', value: 10, label: '10% off' },
    'WELCOME15':  { type: 'percent', value: 15, label: '15% off' },
    'FLAT20':     { type: 'flat',    value: 20, label: '$20 off' },
    'FREESHIP':   { type: 'freeship',value: 0,  label: 'Free Shipping' },
};

/* ── SHIPPING OPTIONS ── */
const SHIPPING_OPTIONS = [
    { id: 'standard',  name: 'Standard Shipping', time: '5–7 business days',  price: 9.99  },
    { id: 'express',   name: 'Express Shipping',   time: '2–3 business days',  price: 19.99 },
    { id: 'overnight', name: 'Overnight Shipping', time: 'Next business day',  price: 34.99 },
];

const FREE_SHIP_THRESHOLD = 150;

/* ── STATE ── */
let cart          = [];
let currentStep   = 1;       // 1 = Contact/Address, 2 = Shipping, 3 = Payment
let selectedShipping = 'standard';
let appliedPromo  = null;

function normalizeCartItem(item) {
    return {
        id: item?.id || item?.productId || '',
        productId: item?.productId || item?.id || '',
        name: String(item?.name || '').trim(),
        brand: String(item?.brand || '').trim(),
        size: String(item?.size || 'One Size').trim() || 'One Size',
        price: Number(item?.price) || 0,
        image: String(item?.image || '').trim(),
        qty: Math.max(1, Number(item?.qty) || Number(item?.quantity) || 1)
    };
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const delay = ms => new Promise(r => setTimeout(r, ms));

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(110%)';
        setTimeout(() => t.remove(), 300);
    }, 3200);
}

function fmt(n) {
    return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
}

function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getDiscountAmount(subtotal) {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === 'percent') return subtotal * (appliedPromo.value / 100);
    if (appliedPromo.type === 'flat')    return Math.min(appliedPromo.value, subtotal);
    return 0;
}

function getShippingCost() {
    const subtotal = getCartSubtotal();
    if (appliedPromo?.type === 'freeship' || subtotal >= FREE_SHIP_THRESHOLD) return 0;
    return SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.price || 9.99;
}

/* ══════════════════════════════════════════
   CART — LOAD FROM LOCALSTORAGE
══════════════════════════════════════════ */
function loadCart() {
    try {
        const stored = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
        cart = Array.isArray(stored) ? stored.map(normalizeCartItem).filter(item => item.name) : [];
    } catch (e) {
        cart = [];
    }

    const count = getCartItemCount();
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = count;

    updateFreeShippingBar(getCartSubtotal());
    updateCheckoutSummary();

    if (cart.length === 0) {
        // Redirect to store if cart is empty
        const grid = document.getElementById('cartItems');
        if (grid) {
            grid.innerHTML = `
              <div class="cart-empty">
                <i class="fa-solid fa-bag-shopping"></i>
                <h3>YOUR CART IS EMPTY</h3>
                <p>Add some heat to your collection!</p>
              </div>`;
        }
        const footer = document.getElementById('cartFooter');
        if (footer) footer.style.display = 'none';
    } else {
        renderCartDrawer();
    }
}

function saveCart() {
    cart = cart.map(normalizeCartItem).filter(item => item.name);
    localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    updateFreeShippingBar(getCartSubtotal());
    updateCheckoutSummary();
}

function clearCart() {
    cart = [];
    localStorage.removeItem('backdoor-cart');
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = '0';
}

/* ══════════════════════════════════════════
   CART DRAWER
══════════════════════════════════════════ */
function renderCartDrawer() {
    const itemsContainer = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    const headerCount = document.getElementById('cartHeaderCount');

    const count = getCartItemCount();
    if (headerCount) headerCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;

    if (cart.length === 0) {
        if (itemsContainer) itemsContainer.innerHTML = `
          <div class="cart-empty">
            <i class="fa-solid fa-bag-shopping"></i>
            <h3>YOUR CART IS EMPTY</h3>
            <p>Add some heat to your collection!</p>
          </div>`;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';
    if (!itemsContainer) return;

    itemsContainer.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <div class="cart-item-img">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none;font-size:2rem">👟</span>` : '<span style="font-size:2rem">👟</span>'}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">
            <span>Size ${item.size}</span>
            <span>${item.brand || ''}</span>
          </div>
          <div class="cart-item-bottom">
            <div class="qty-control">
              <button class="qty-btn" onclick="updateQty(${i}, -1)" title="Decrease">−</button>
              <div class="qty-val">${item.qty}</div>
              <button class="qty-btn" onclick="updateQty(${i}, 1)" title="Increase">+</button>
            </div>
            <div class="cart-item-price">${fmt(item.price * item.qty)}</div>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart(${i})" title="Remove">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        </div>
      </div>
    `).join('');

    const subtotalEl = document.getElementById('cartSubtotal');
    if (subtotalEl) subtotalEl.textContent = fmt(getCartSubtotal());
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCartDrawer();
    showToast('Item removed', 'info');
}

function updateQty(index, delta) {
    const item = cart[index];
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    renderCartDrawer();
}

function openCart() {
    document.getElementById('cartOverlay')?.classList.add('open');
    document.getElementById('cartDrawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartOverlay')?.classList.remove('open');
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   FREE SHIPPING BAR
══════════════════════════════════════════ */
function updateFreeShippingBar(subtotal) {
    const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
    const pct = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);
    const msg = remaining > 0
        ? `Add <span>${fmt(remaining)}</span> more for FREE shipping 🚚`
        : `🎉 You qualify for <span>FREE</span> shipping!`;

    ['navShipText', 'drawerShipText'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = msg;
    });
    ['navShipFill', 'drawerShipFill'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = pct + '%';
    });
}

/* ══════════════════════════════════════════
   STEP WIZARD
══════════════════════════════════════════ */
function setStep(step) {
    currentStep = step;

    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const num = document.getElementById('step' + i);
        const lbl = document.getElementById('step' + i + 'l');
        if (!num) continue;
        num.className = 'c-step-num';
        lbl.className = 'c-step-label';
        if (i < step) {
            num.classList.add('done');
            num.innerHTML = '<i class="fa-solid fa-check" style="font-size:12px"></i>';
            lbl.classList.add('active');
        } else if (i === step) {
            num.classList.add('active');
            lbl.classList.add('active');
        }
    }

    // Show/hide sections
    const sectionMap = {
        1: ['sectionContact', 'sectionAddress'],
        2: ['sectionShipping'],
        3: ['sectionPayment'],
    };

    ['sectionContact', 'sectionAddress', 'sectionShipping', 'sectionPayment'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    (sectionMap[step] || []).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });

    // Show/hide nav buttons
    const continueBtn = document.getElementById('continueBtn');
    const backBtn     = document.getElementById('backBtn');
    const placeBtn    = document.getElementById('placeOrderBtn');

    if (continueBtn) continueBtn.style.display = step < 3 ? 'block' : 'none';
    if (backBtn)     backBtn.style.display     = step > 1 ? 'inline-flex' : 'none';
    if (placeBtn)    placeBtn.style.display    = step === 3 ? 'flex' : 'none';

    // Render shipping options on step 2
    if (step === 2) renderShippingOptions();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep1() {
    const required = [
        { id: 'firstName', label: 'First Name' },
        { id: 'lastName',  label: 'Last Name'  },
        { id: 'email',     label: 'Email'       },
        { id: 'address1',  label: 'Address'     },
        { id: 'city',      label: 'City'        },
        { id: 'zip',       label: 'ZIP Code'    },
    ];

    let ok = true;
    required.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        const val = el.value.trim();
        if (!val) {
            el.classList.add('error');
            if (ok) { showToast(`Please enter your ${f.label}`, 'error'); el.focus(); }
            ok = false;
        } else {
            el.classList.remove('error');
        }
    });

    // Email format check
    if (ok) {
        const email = document.getElementById('email');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            email.classList.add('error');
            showToast('Please enter a valid email address', 'error');
            email.focus();
            return false;
        }
    }

    const state = document.getElementById('state');
    if (ok && state && !state.value) {
        showToast('Please select a state', 'error');
        return false;
    }

    return ok;
}

function validateStep2() {
    if (!selectedShipping) {
        showToast('Please select a shipping method', 'error');
        return false;
    }
    return true;
}

function validateStep3() {
    const cardPayment = document.getElementById('cardPayment');
    if (!cardPayment || cardPayment.classList.contains('hidden')) return true;

    const cardNum = document.getElementById('cardNum')?.value.replace(/\s/g, '') || '';
    const cardExp = document.getElementById('cardExp')?.value || '';
    const cardCvc = document.getElementById('cardCvc')?.value || '';
    const cardName = document.getElementById('cardName')?.value.trim() || '';

    if (cardNum.length < 13) { showToast('Please enter a valid card number', 'error'); return false; }
    if (cardExp.length < 7)  { showToast('Please enter your expiry date (MM / YY)', 'error'); return false; }
    if (cardCvc.length < 3)  { showToast('Please enter your CVC', 'error'); return false; }
    if (!cardName)           { showToast('Please enter the name on your card', 'error'); return false; }

    // Expiry not in past
    const [mm, yy] = cardExp.split(' / ');
    const expDate = new Date(2000 + parseInt(yy), parseInt(mm) - 1, 1);
    if (expDate < new Date()) { showToast('Your card appears to be expired', 'error'); return false; }

    return true;
}

function continueStep() {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setStep(currentStep + 1);
}

function prevStep() {
    if (currentStep > 1) setStep(currentStep - 1);
}

/* ══════════════════════════════════════════
   SHIPPING OPTIONS
══════════════════════════════════════════ */
function renderShippingOptions() {
    const container = document.getElementById('shippingOptions');
    if (!container) return;
    const subtotal = getCartSubtotal();

    container.innerHTML = SHIPPING_OPTIONS.map(opt => {
        const isFree = subtotal >= FREE_SHIP_THRESHOLD && opt.id === 'standard';
        const priceLabel = isFree ? '<span class="free-badge">FREE</span>' : fmt(opt.price);
        const isSelected = selectedShipping === opt.id;

        return `
      <div class="shipping-option ${isSelected ? 'selected' : ''}" onclick="selectShipping('${opt.id}')">
        <div class="shipping-radio${isSelected ? ' checked' : ''}"></div>
        <div class="shipping-info">
          <div class="shipping-name">${opt.name}</div>
          <div class="shipping-time">${opt.time}</div>
        </div>
        <div class="shipping-price">${priceLabel}</div>
      </div>`;
    }).join('');
}

function selectShipping(id) {
    selectedShipping = id;
    renderShippingOptions();
    updateCheckoutSummary();
}

/* ══════════════════════════════════════════
   ORDER SUMMARY
══════════════════════════════════════════ */
function updateCheckoutSummary() {
    const summaryItems = document.getElementById('summaryItems');
    if (!summaryItems) return;

    summaryItems.innerHTML = cart.map(item => `
      <div class="summary-item">
        <div class="summary-img">
          ${item.image
            ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.parentElement.innerHTML='<span style=font-size:1.8rem>👟</span>'">`
            : '<span style="font-size:1.8rem">👟</span>'}
          ${item.qty > 1 ? `<span class="summary-qty-badge">${item.qty}</span>` : ''}
        </div>
        <div class="summary-item-info">
          <div class="summary-item-name">${item.name}</div>
          <div class="summary-item-meta">Size ${item.size} · ${item.brand || 'Backdoor'}</div>
        </div>
        <div class="summary-item-price">${fmt(parseFloat(item.price) * item.qty)}</div>
      </div>
    `).join('');

    const subtotal  = getCartSubtotal();
    const discount  = getDiscountAmount(subtotal);
    const shipping  = getShippingCost();
    const taxable   = subtotal - discount;
    const tax       = taxable * 0.08;
    const total     = taxable + shipping + tax;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('summarySubtotal', fmt(subtotal));
    set('summaryShipping', shipping === 0 ? 'FREE' : fmt(shipping));
    set('summaryTax',      fmt(tax));
    set('summaryTotal',    fmt(total));

    const discountLine = document.getElementById('discountLine');
    if (discountLine) {
        if (discount > 0) {
            discountLine.classList.remove('hidden');
            set('discountAmt', '-' + fmt(discount));
        } else {
            discountLine.classList.add('hidden');
        }
    }
}

/* ══════════════════════════════════════════
   PROMO CODES
══════════════════════════════════════════ */
function applyPromo() {
    const cartInput     = document.getElementById('promoCode');
    const checkoutInput = document.getElementById('checkoutPromo');
    const code = (cartInput?.value || checkoutInput?.value || '').trim().toUpperCase();

    if (!code) { showToast('Enter a promo code', 'warn'); return; }

    const promo = PROMO_CODES[code];
    if (!promo) { showToast('Invalid promo code', 'error'); return; }

    appliedPromo = { ...promo, code };
    showToast(`Promo applied: ${promo.label}! 🎉`);
    updateCheckoutSummary();

    if (cartInput)     cartInput.value = '';
    if (checkoutInput) checkoutInput.value = '';
}

/* ══════════════════════════════════════════
   PAYMENT METHOD TABS
══════════════════════════════════════════ */
function setPayMethod(method, btn) {
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    ['cardPayment', 'applePayment', 'googlePayment', 'paypalPayment'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !id.startsWith(method));
    });
}

/* ══════════════════════════════════════════
   CARD FORMATTING
══════════════════════════════════════════ */
function formatCard(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 16);
    let out = '';
    for (let i = 0; i < val.length; i++) {
        if (i > 0 && i % 4 === 0) out += ' ';
        out += val[i];
    }
    input.value = out;
}

function formatExpiry(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) val = val.substring(0, 2) + ' / ' + val.substring(2);
    input.value = val;
}

function formatPhone(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 10);
    if (val.length >= 6) val = `(${val.substring(0,3)}) ${val.substring(3,6)}-${val.substring(6)}`;
    else if (val.length >= 3) val = `(${val.substring(0,3)}) ${val.substring(3)}`;
    input.value = val;
}

/* ══════════════════════════════════════════
   PLACE ORDER → FIREBASE
══════════════════════════════════════════ */
async function placeOrder() {
    if (!validateStep3()) return;
    if (cart.length === 0) { showToast('Your cart is empty!', 'error'); return; }

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> PROCESSING...';

    try {
        const subtotal  = getCartSubtotal();
        const discount  = getDiscountAmount(subtotal);
        const shipping  = getShippingCost();
        const taxable   = subtotal - discount;
        const tax       = taxable * 0.08;
        const total     = taxable + shipping + tax;

        const firstName = document.getElementById('firstName').value.trim();
        const lastName  = document.getElementById('lastName').value.trim();
        const email     = document.getElementById('email').value.trim().toLowerCase();
        const phone     = document.getElementById('phone').value.trim();

        const orderNum = 'BD-' + Date.now().toString().slice(-6);

        const orderData = {
            orderNumber: orderNum,
            total: +total.toFixed(2),
            subtotal: +subtotal.toFixed(2),
            tax: +tax.toFixed(2),
            status: 'pending',
            createdAt: serverTimestamp(),
            customer: {
                firstName, lastName,
                email, phone,
                name: `${firstName} ${lastName}`,
            },
            shippingAddress: {
                street: document.getElementById('address1').value.trim(),
                address1: document.getElementById('address1').value.trim(),
                address2: document.getElementById('address2').value.trim(),
                city:     document.getElementById('city').value.trim(),
                state:    document.getElementById('state').value,
                zip:      document.getElementById('zip').value.trim(),
                country:  document.getElementById('country').value,
            },
            items: cart.map(item => ({
                productId: item.id || item.productId || '',
                name:      item.name,
                brand:     item.brand || '',
                size:      item.size,
                qty:       item.qty,
                quantity:  item.qty,
                price:     parseFloat(item.price),
                image:     item.image || '',
            })),
            pricing: {
                subtotal:  +subtotal.toFixed(2),
                discount:  +discount.toFixed(2),
                shipping:  +shipping.toFixed(2),
                tax:       +tax.toFixed(2),
                total:     +total.toFixed(2),
            },
            shippingMethod: selectedShipping,
            promoCode: appliedPromo ? appliedPromo.code : null,
        };

        // Save to Firestore
        await addDoc(collection(db, 'orders'), orderData);

        // Calculate delivery date
        const deliveryDays = selectedShipping === 'overnight' ? 1 : selectedShipping === 'express' ? 3 : 7;
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

        // Populate success page
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('successEmail',    email);
        set('successOrderNum', '#' + orderNum);
        set('successDate',     new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        set('successTotal',    fmt(total));
        set('successDelivery', deliveryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

        const cardNum = document.getElementById('cardNum')?.value || '';
        const last4   = cardNum.replace(/\s/g, '').slice(-4) || '****';
        set('successPayment', `•••• ${last4}`);

        // Clear cart
        clearCart();
        appliedPromo = null;

        // Show success
        showPage('success');
        showToast('Order placed successfully! 🎉');

    } catch (err) {
        console.error('Order failed:', err);
        showToast('Order failed. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> PLACE ORDER';
    }
}

/* ══════════════════════════════════════════
   PAGES
══════════════════════════════════════════ */
function showPage(page) {
    const storePage    = document.getElementById('storePage');
    const checkoutPage = document.getElementById('checkoutPage');
    const successPage  = document.getElementById('successPage');

    if (storePage)    storePage.style.display    = page === 'store'    ? 'block' : 'none';
    if (checkoutPage) checkoutPage.classList.toggle('show', page === 'checkout');
    if (successPage)  successPage.classList.toggle('show', page === 'success');

    window.scrollTo(0, 0);
}

function goToCheckout() {
    if (cart.length === 0) { showToast('Your cart is empty!', 'error'); return; }
    closeCart();
    showPage('checkout');
    setStep(1);
    updateCheckoutSummary();
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCheckoutSummary();

    // Clear error state on input
    document.querySelectorAll('.form-input, .form-select').forEach(el => {
        el.addEventListener('input', () => el.classList.remove('error'));
        el.addEventListener('change', () => el.classList.remove('error'));
    });

    // ESC closes cart
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

    // Start at step 1
    setStep(1);
});

// Expose functions globally for HTML onclick handlers
window.openCart      = openCart;
window.closeCart     = closeCart;
window.goToCheckout  = goToCheckout;
window.showPage      = showPage;
window.applyPromo    = applyPromo;
window.removeFromCart = removeFromCart;
window.updateQty     = updateQty;
window.setPayMethod  = setPayMethod;
window.formatCard    = formatCard;
window.formatExpiry  = formatExpiry;
window.formatPhone   = formatPhone;
window.selectShipping = selectShipping;
window.placeOrder    = placeOrder;
window.continueStep  = continueStep;
window.prevStep      = prevStep;
