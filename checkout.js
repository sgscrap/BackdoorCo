/* ══════════════════════════════════════════
   BACKDOOR — CHECKOUT JS
══════════════════════════════════════════ */

/* ── PRODUCT DATA ── */
const PRODUCTS = [
    {
        id: 1, emoji: '👟',
        brand: 'Jordan', name: 'Air Jordan 1 Retro High OG "Chicago"',
        price: 750, retail: 170, badge: 'hot',
        sizes: [
            { s: '8', stock: 2 }, { s: '8.5', stock: 1 }, { s: '9', stock: 3 },
            { s: '9.5', stock: 0 }, { s: '10', stock: 2 }, { s: '10.5', stock: 1 },
            { s: '11', stock: 0 }
        ]
    },
    {
        id: 2, emoji: '🦓',
        brand: 'Adidas', name: 'Yeezy Boost 350 V2 "Zebra"',
        price: 320, retail: 220, badge: 'new',
        sizes: [
            { s: '7', stock: 1 }, { s: '8', stock: 2 }, { s: '9', stock: 1 },
            { s: '10', stock: 3 }, { s: '11', stock: 0 }, { s: '12', stock: 2 }
        ]
    },
    {
        id: 3, emoji: '🐼',
        brand: 'Nike', name: 'Nike Dunk Low Retro "Panda"',
        price: 165, retail: 110, badge: 'low',
        sizes: [
            { s: '7', stock: 1 }, { s: '8', stock: 0 }, { s: '9', stock: 2 },
            { s: '10', stock: 1 }, { s: '11', stock: 3 }, { s: '12', stock: 1 }
        ]
    },
    {
        id: 4, emoji: '🤠',
        brand: 'Nike × Travis Scott', name: 'Travis Scott Dunk Low "Jackboys"',
        price: 1350, retail: 150, badge: 'hot',
        sizes: [
            { s: '8', stock: 1 }, { s: '9', stock: 1 }, { s: '10', stock: 2 },
            { s: '11', stock: 0 }, { s: '12', stock: 1 }
        ]
    },
];

/* ── PROMO CODES ── */
const PROMO_CODES = {
    'BACKDOOR10': { type: 'percent', value: 10, label: '10% off' },
    'WELCOME15': { type: 'percent', value: 15, label: '15% off' },
    'FLAT20': { type: 'flat', value: 20, label: '$20 off' },
    'FREESHIP': { type: 'freeship', value: 0, label: 'Free Shipping' },
};

/* ── SHIPPING OPTIONS ── */
const SHIPPING_OPTIONS = [
    { id: 'standard', name: 'Standard Shipping', time: '5–7 business days', price: 9.99 },
    { id: 'express', name: 'Express Shipping', time: '2–3 business days', price: 19.99 },
    { id: 'overnight', name: 'Overnight Shipping', time: 'Next business day', price: 34.99 },
];

const FREE_SHIP_THRESHOLD = 150;

/* ── STATE ── */
let cart = [];
let selectedShipping = 'standard';
let appliedPromo = null;
let selectedSizes = {};

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
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(110%)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

function formatCurrency(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ══════════════════════════════════════════
   PRODUCT GRID
══════════════════════════════════════════ */
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = PRODUCTS.map(p => {
        const badgeLabel = p.badge === 'hot' ? '🔥 HOT' : p.badge === 'new' ? '✨ NEW' : '⚡ LOW STOCK';
        const badgeClass = `badge-${p.badge}`;

        return `
      <div class="product-card">
        <div class="product-img">
          ${p.emoji}
          <span class="product-badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="product-info">
          <div class="product-brand">${p.brand}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-price-row">
            <div class="product-price">${formatCurrency(p.price)}</div>
            <div class="product-retail">Retail: $${p.retail}</div>
          </div>
          <div class="size-row" id="sizes-${p.id}">
            ${p.sizes.map(sz =>
            `<div class="size-chip ${sz.stock === 0 ? 'sold-out' : ''} ${selectedSizes[p.id] === sz.s ? 'selected' : ''}"
                   onclick="${sz.stock > 0 ? `selectSize(${p.id}, '${sz.s}')` : ''}">${sz.s}</div>`
        ).join('')}
          </div>
          <button class="add-to-cart-btn" onclick="addToCart(${p.id})">
            <i class="fa-solid fa-bag-shopping"></i>
            ADD TO CART
          </button>
        </div>
      </div>
    `;
    }).join('');
}

function selectSize(productId, size) {
    selectedSizes[productId] = size;
    renderProducts();
}

/* ══════════════════════════════════════════
   CART MANAGEMENT
══════════════════════════════════════════ */
function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const size = selectedSizes[productId];
    if (!size) {
        showToast('Please select a size first', 'warn');
        return;
    }

    // Check if already in cart with same size
    const existing = cart.find(c => c.productId === productId && c.size === size);
    if (existing) {
        const sizeData = product.sizes.find(s => s.s === size);
        if (existing.qty >= (sizeData?.stock || 1)) {
            showToast('Max stock reached for this size', 'error');
            return;
        }
        existing.qty++;
    } else {
        cart.push({ productId, size, qty: 1 });
    }

    updateCartUI();
    openCart();
    showToast(`${product.name} added to cart! 🛒`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    showToast('Item removed', 'info');
}

function updateQty(index, delta) {
    const item = cart[index];
    if (!item) return;

    const product = PRODUCTS.find(p => p.id === item.productId);
    const sizeData = product?.sizes.find(s => s.s === item.size);
    const maxStock = sizeData?.stock || 1;

    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(index);
        return;
    }
    if (item.qty > maxStock) {
        item.qty = maxStock;
        showToast('Max stock reached', 'warn');
    }

    updateCartUI();
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => {
        const product = PRODUCTS.find(p => p.id === item.productId);
        return sum + (product ? product.price * item.qty : 0);
    }, 0);
}

function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getDiscountAmount(subtotal) {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === 'percent') return subtotal * (appliedPromo.value / 100);
    if (appliedPromo.type === 'flat') return Math.min(appliedPromo.value, subtotal);
    return 0;
}

function getShippingCost() {
    const subtotal = getCartSubtotal();
    if (appliedPromo?.type === 'freeship' || subtotal >= FREE_SHIP_THRESHOLD) return 0;
    return SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.price || 9.99;
}

/* ══════════════════════════════════════════
   CART UI
══════════════════════════════════════════ */
function updateCartUI() {
    const count = getCartItemCount();
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount(subtotal);

    // Nav count
    document.getElementById('cartCount').textContent = count;

    // Cart header
    document.getElementById('cartHeaderCount').textContent = `${count} item${count !== 1 ? 's' : ''}`;

    // Drawer items
    const itemsContainer = document.getElementById('cartItems');
    if (cart.length === 0) {
        itemsContainer.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-bag-shopping"></i>
        <h3>YOUR CART IS EMPTY</h3>
        <p>Add some heat to your collection!</p>
      </div>
    `;
        document.getElementById('cartFooter').style.display = 'none';
    } else {
        document.getElementById('cartFooter').style.display = 'block';
        itemsContainer.innerHTML = cart.map((item, i) => {
            const p = PRODUCTS.find(pr => pr.id === item.productId);
            if (!p) return '';
            return `
        <div class="cart-item">
          <div class="cart-item-img">${p.emoji}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-meta">
              <span>Size ${item.size}</span>
              <span>${p.brand}</span>
            </div>
            <div class="cart-item-bottom">
              <div class="qty-control">
                <button class="qty-btn" onclick="updateQty(${i}, -1)" title="Decrease quantity">−</button>
                <div class="qty-val">${item.qty}</div>
                <button class="qty-btn" onclick="updateQty(${i}, 1)" title="Increase quantity">+</button>
              </div>
              <div class="cart-item-price">${formatCurrency(p.price * item.qty)}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${i})" title="Remove item">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
        </div>
      `;
        }).join('');
    }

    // Subtotal
    document.getElementById('cartSubtotal').textContent = formatCurrency(subtotal);

    // Savings
    const savingsEl = document.getElementById('cartSavings');
    if (discount > 0) {
        savingsEl.textContent = `You're saving ${formatCurrency(discount)}!`;
        savingsEl.classList.remove('hidden');
    } else {
        savingsEl.classList.add('hidden');
    }

    // Free shipping bar
    updateFreeShippingBar(subtotal);

    // Update checkout summary too
    updateCheckoutSummary();
}

function updateFreeShippingBar(subtotal) {
    const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
    const pct = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);

    // Nav bar
    const navShipAmt = document.getElementById('navShipAmt');
    const navShipText = document.getElementById('navShipText');
    const navShipFill = document.getElementById('navShipFill');
    if (remaining > 0) {
        navShipAmt.textContent = formatCurrency(remaining);
        navShipText.innerHTML = `Add <span>${formatCurrency(remaining)}</span> more for FREE shipping 🚚`;
    } else {
        navShipText.innerHTML = `🎉 You qualify for <span>FREE</span> shipping!`;
    }
    navShipFill.style.width = pct + '%';

    // Drawer bar
    const drawerShipAmt = document.getElementById('drawerShipAmt');
    const drawerShipText = document.getElementById('drawerShipText');
    const drawerShipFill = document.getElementById('drawerShipFill');
    if (remaining > 0) {
        drawerShipAmt.textContent = formatCurrency(remaining);
        drawerShipText.innerHTML = `Add <strong>${formatCurrency(remaining)}</strong> more for FREE shipping 🚚`;
    } else {
        drawerShipText.innerHTML = `🎉 You qualify for <strong>FREE</strong> shipping!`;
    }
    drawerShipFill.style.width = pct + '%';
}

/* ══════════════════════════════════════════
   CART DRAWER
══════════════════════════════════════════ */
function openCart() {
    document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartDrawer').classList.remove('open');
    document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   PAGES
══════════════════════════════════════════ */
function showPage(page) {
    document.getElementById('storePage').style.display = page === 'store' ? 'block' : 'none';
    document.getElementById('checkoutPage').classList.toggle('show', page === 'checkout');
    document.getElementById('successPage').classList.toggle('show', page === 'success');

    if (page === 'store') {
        renderProducts();
    }

    window.scrollTo(0, 0);
}

function goToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }
    closeCart();
    showPage('checkout');
    renderShippingOptions();
    updateCheckoutSummary();
}

/* ══════════════════════════════════════════
   SHIPPING OPTIONS
══════════════════════════════════════════ */
function renderShippingOptions() {
    const container = document.getElementById('shippingOptions');
    const subtotal = getCartSubtotal();

    container.innerHTML = SHIPPING_OPTIONS.map(opt => {
        const isFree = subtotal >= FREE_SHIP_THRESHOLD && opt.id === 'standard';
        const priceLabel = isFree ? 'FREE' : formatCurrency(opt.price);
        const isSelected = selectedShipping === opt.id;

        return `
      <div class="shipping-option ${isSelected ? 'selected' : ''}" onclick="selectShipping('${opt.id}')">
        <div class="shipping-radio"></div>
        <div class="shipping-info">
          <div class="shipping-name">${opt.name}</div>
          <div class="shipping-time">${opt.time}</div>
        </div>
        <div class="shipping-price">${priceLabel}</div>
      </div>
    `;
    }).join('');
}

function selectShipping(id) {
    selectedShipping = id;
    renderShippingOptions();
    updateCheckoutSummary();
}

/* ══════════════════════════════════════════
   CHECKOUT SUMMARY
══════════════════════════════════════════ */
function updateCheckoutSummary() {
    const summaryItems = document.getElementById('summaryItems');
    if (!summaryItems) return;

    // Summary items
    summaryItems.innerHTML = cart.map(item => {
        const p = PRODUCTS.find(pr => pr.id === item.productId);
        if (!p) return '';
        return `
      <div class="summary-item">
        <div class="summary-img">
          ${p.emoji}
          ${item.qty > 1 ? `<span class="summary-qty-badge">${item.qty}</span>` : ''}
        </div>
        <div class="summary-item-info">
          <div class="summary-item-name">${p.name}</div>
          <div class="summary-item-meta">Size ${item.size} · ${p.brand}</div>
        </div>
        <div class="summary-item-price">${formatCurrency(p.price * item.qty)}</div>
      </div>
    `;
    }).join('');

    // Totals
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount(subtotal);
    const shipping = getShippingCost();
    const taxable = subtotal - discount;
    const tax = taxable * 0.08;
    const total = taxable + shipping + tax;

    document.getElementById('summarySubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summaryShipping').textContent = shipping === 0 ? 'FREE' : formatCurrency(shipping);
    document.getElementById('summaryTax').textContent = formatCurrency(tax);
    document.getElementById('summaryTotal').textContent = formatCurrency(total);

    // Discount line
    const discountLine = document.getElementById('discountLine');
    if (discount > 0) {
        discountLine.classList.remove('hidden');
        document.getElementById('discountAmt').textContent = '-' + formatCurrency(discount);
    } else {
        discountLine.classList.add('hidden');
    }
}

/* ══════════════════════════════════════════
   PROMO CODES
══════════════════════════════════════════ */
function applyPromo() {
    // Try both promo inputs (cart drawer and checkout)
    const cartPromoInput = document.getElementById('promoCode');
    const checkoutPromoInput = document.getElementById('checkoutPromo');
    const code = (cartPromoInput?.value || checkoutPromoInput?.value || '').trim().toUpperCase();

    if (!code) {
        showToast('Enter a promo code', 'warn');
        return;
    }

    const promo = PROMO_CODES[code];
    if (!promo) {
        showToast('Invalid promo code', 'error');
        return;
    }

    appliedPromo = promo;
    showToast(`Promo applied: ${promo.label}! 🎉`);
    updateCartUI();

    // Clear inputs
    if (cartPromoInput) cartPromoInput.value = '';
    if (checkoutPromoInput) checkoutPromoInput.value = '';
}

/* ══════════════════════════════════════════
   PAYMENT METHODS
══════════════════════════════════════════ */
function setPayMethod(method, btn) {
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('cardPayment').classList.toggle('hidden', method !== 'card');
    document.getElementById('applePayment').classList.toggle('hidden', method !== 'apple');
    document.getElementById('googlePayment').classList.toggle('hidden', method !== 'google');
    document.getElementById('paypalPayment').classList.toggle('hidden', method !== 'paypal');
}

/* ══════════════════════════════════════════
   CARD FORMATTING
══════════════════════════════════════════ */
function formatCard(input) {
    let val = input.value.replace(/\D/g, '');
    val = val.substring(0, 16);
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += val[i];
    }
    input.value = formatted;
}

function formatExpiry(input) {
    let val = input.value.replace(/\D/g, '');
    val = val.substring(0, 4);
    if (val.length >= 2) {
        val = val.substring(0, 2) + ' / ' + val.substring(2);
    }
    input.value = val;
}

/* ══════════════════════════════════════════
   PLACE ORDER
══════════════════════════════════════════ */
async function placeOrder() {
    const btn = document.getElementById('placeOrderBtn');

    // Basic validation
    const required = [
        { id: 'firstName', label: 'First name' },
        { id: 'lastName', label: 'Last name' },
        { id: 'email', label: 'Email' },
        { id: 'address1', label: 'Address' },
        { id: 'city', label: 'City' },
        { id: 'zip', label: 'ZIP code' },
    ];

    let hasError = false;
    required.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el.value.trim()) {
            el.classList.add('error');
            if (!hasError) {
                showToast(`Please enter your ${f.label}`, 'error');
                el.focus();
            }
            hasError = true;
        } else {
            el.classList.remove('error');
        }
    });

    const state = document.getElementById('state').value;
    if (!state) {
        showToast('Please select a state', 'error');
        hasError = true;
    }

    if (hasError) return;

    // Check card (if card payment)
    const cardPayment = document.getElementById('cardPayment');
    if (!cardPayment.classList.contains('hidden')) {
        const cardNum = document.getElementById('cardNum').value.replace(/\s/g, '');
        const cardExp = document.getElementById('cardExp').value;
        const cardCvc = document.getElementById('cardCvc').value;

        if (cardNum.length < 13) {
            showToast('Please enter a valid card number', 'error');
            return;
        }
        if (cardExp.length < 7) {
            showToast('Please enter expiry date', 'error');
            return;
        }
        if (cardCvc.length < 3) {
            showToast('Please enter CVC', 'error');
            return;
        }
    }

    // Processing
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> PROCESSING...';

    // Simulate steps
    updateStep(1, 'done');
    updateStep(2, 'done');
    updateStep(3, 'active');

    await delay(1500);

    updateStep(3, 'done');
    await delay(800);

    // Calculate totals
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount(subtotal);
    const shipping = getShippingCost();
    const taxable = subtotal - discount;
    const tax = taxable * 0.08;
    const total = taxable + shipping + tax;

    // Generate order number
    const orderNum = '#BD-' + Date.now().toString().slice(-6);
    const email = document.getElementById('email').value;

    // Populate success page
    document.getElementById('successEmail').textContent = email;
    document.getElementById('successOrderNum').textContent = orderNum;
    document.getElementById('successDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('successTotal').textContent = formatCurrency(total);

    const shippingOpt = SHIPPING_OPTIONS.find(s => s.id === selectedShipping);
    const deliveryDays = selectedShipping === 'overnight' ? 1 : selectedShipping === 'express' ? 3 : 7;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    document.getElementById('successDelivery').textContent = deliveryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const cardNum = document.getElementById('cardNum').value;
    const last4 = cardNum.replace(/\s/g, '').slice(-4) || '4242';
    document.getElementById('successPayment').textContent = `Visa •••• ${last4}`;

    // Clear cart
    cart = [];
    appliedPromo = null;
    updateCartUI();

    // Show success
    showPage('success');
    showToast('Order placed successfully! 🎉');

    // Reset button
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-lock"></i> PLACE ORDER';
}

function updateStep(num, state) {
    const el = document.getElementById('step' + num);
    const label = document.getElementById('step' + num + 'l');
    el.className = 'c-step-num';
    label.className = 'c-step-label';

    if (state === 'active') {
        el.classList.add('active');
        label.classList.add('active');
    } else if (state === 'done') {
        el.classList.add('done');
        el.innerHTML = '<i class="fa-solid fa-check" style="font-size:12px"></i>';
        label.classList.add('active');
    }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartUI();

    // Clear error styling on input
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('input', () => input.classList.remove('error'));
    });

    // Close cart on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCart();
    });
});
