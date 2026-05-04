const CHECKOUT_FUNCTIONS_BASE = '/.netlify/functions';
const SUCCESS_QUERY_KEY = 'checkout';

const SHIPPING_OPTIONS = [
    { id: 'standard', name: 'Standard Shipping', time: '5-7 business days', price: 9.99 },
    { id: 'express', name: 'Express Shipping', time: '2-3 business days', price: 19.99 },
    { id: 'overnight', name: 'Overnight Shipping', time: 'Next business day', price: 34.99 }
];

const FREE_SHIP_THRESHOLD = 150;
const COUNTRY_CODES = {
    'United States': 'US',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'Australia': 'AU',
    US: 'US',
    CA: 'CA',
    GB: 'GB',
    AU: 'AU'
};

let cart = [];
let currentStep = 1;
let selectedShipping = 'standard';
let selectedPaymentMethod = 'stripe';

// ── Promo Code State ──
const PROMO_CODES = {
    'SGSCRAP': { discount: 0.30, label: '30% off — SGSCRAP' }
};
let promoState = JSON.parse(localStorage.getItem('backdoor-promo') || 'null');

function applyPromoCode(raw) {
    const code = (raw || '').trim().toUpperCase();
    const match = PROMO_CODES[code];
    if (!match) {
        showToast('Invalid promo code.', 'error');
        return false;
    }
    promoState = { code };
    localStorage.setItem('backdoor-promo', JSON.stringify(promoState));
    showToast(`✓ Code applied — ${match.label}!`, 'success');
    renderCartDrawer();
    updateCheckoutSummary();
    return true;
}

function removePromo() {
    promoState = null;
    localStorage.removeItem('backdoor-promo');
    renderCartDrawer();
    updateCheckoutSummary();
    showToast('Promo code removed.', 'info');
}

function normalizeCartItem(item) {
    return {
        id: item?.id || item?.productId || '',
        productId: item?.productId || item?.id || '',
        name: String(item?.name || '').trim(),
        brand: String(item?.brand || '').trim(),
        size: String(item?.size || 'One Size').trim() || 'One Size',
        price: Number(item?.price) || 0,
        image: String(item?.image || '').trim(),
        backorder: Boolean(item?.backorder),
        backorderLeadTime: String(item?.backorderLeadTime || '').trim(),
        qty: Math.max(1, Number(item?.qty) || Number(item?.quantity) || 1)
    };
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon =
        type === 'error' ? 'fa-circle-xmark' :
        type === 'info' ? 'fa-circle-info' :
        type === 'warn' ? 'fa-triangle-exclamation' :
        'fa-circle-check';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(110%)';
        window.setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function fmt(amount) {
    return `$${Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getDiscountAmount() {
    const codeInfo = promoState && PROMO_CODES[promoState.code?.toUpperCase()];
    if (!codeInfo) return 0;
    return Math.round(getCartSubtotal() * Number(codeInfo.discount || 0) * 100) / 100;
}

function getShippingCost() {
    const subtotal = getCartSubtotal();
    if (cart.length === 0 || subtotal <= 0) {
        return 0;
    }
    if (subtotal >= FREE_SHIP_THRESHOLD && selectedShipping === 'standard') {
        return 0;
    }

    return SHIPPING_OPTIONS.find((option) => option.id === selectedShipping)?.price || SHIPPING_OPTIONS[0].price;
}

function updateCheckoutActionsState() {
    const hasItems = cart.length > 0;
    const continueBtn = document.getElementById('continueBtn');
    const placeBtn = document.getElementById('placeOrderBtn');

    if (continueBtn) {
        continueBtn.disabled = !hasItems;
        continueBtn.title = hasItems ? '' : 'Add a product to your cart to continue checkout.';
    }

    if (placeBtn) {
        placeBtn.disabled = !hasItems;
        if (!hasItems) {
            placeBtn.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> ADD ITEMS TO CHECKOUT';
        } else if (!placeBtn.dataset.loading) {
            placeBtn.innerHTML = getCheckoutButtonIdleLabel();
        }
    }
}

function getCheckoutButtonIdleLabel() {
    return selectedPaymentMethod === 'paypal'
        ? '<i class="fa-brands fa-paypal"></i> CONTINUE TO PAYPAL'
        : '<i class="fa-solid fa-lock"></i> CONTINUE TO SECURE PAYMENT';
}

function updateFreeShippingBar(subtotal) {
    const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
    const progress = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);
    const message = remaining > 0
        ? `Add <span>${fmt(remaining)}</span> more for FREE shipping`
        : 'You qualify for <span>FREE</span> shipping!';

    ['navShipText', 'drawerShipText'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.innerHTML = message;
    });

    ['navShipFill', 'drawerShipFill'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.style.width = `${progress}%`;
    });
}

function loadCart() {
    try {
        const stored = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
        cart = Array.isArray(stored)
            ? stored.map(normalizeCartItem).filter((item) => item.name)
            : [];
    } catch {
        cart = [];
    }

    const count = getCartItemCount();
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = String(count);

    updateFreeShippingBar(getCartSubtotal());
    renderCartDrawer();
    updateCheckoutSummary();
}

function saveCart() {
    cart = cart.map(normalizeCartItem).filter((item) => item.name);
    localStorage.setItem('backdoor-cart', JSON.stringify(cart));

    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = String(getCartItemCount());

    updateFreeShippingBar(getCartSubtotal());
    renderCartDrawer();
    updateCheckoutSummary();
}

function clearCart() {
    cart = [];
    localStorage.removeItem('backdoor-cart');

    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = '0';
}

function renderCartDrawer() {
    const itemsContainer = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    const headerCount = document.getElementById('cartHeaderCount');
    const subtotalNode = document.getElementById('cartSubtotal');

    if (headerCount) {
        const count = getCartItemCount();
        headerCount.textContent = `${count} item${count === 1 ? '' : 's'}`;
    }

    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fa-solid fa-bag-shopping"></i>
                <h3>YOUR CART IS EMPTY</h3>
                <p>Add some heat and come back to checkout.</p>
            </div>
        `;
        if (footer) footer.style.display = 'none';
        if (subtotalNode) subtotalNode.textContent = fmt(0);
        return;
    }

    if (footer) footer.style.display = 'block';
    if (subtotalNode) subtotalNode.textContent = fmt(getCartSubtotal());

    itemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-img">
                ${item.image
                    ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;font-size:2rem">👟</span>`
                    : '<span style="font-size:2rem">👟</span>'}
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">
                    <span>Size ${item.size}</span>
                    <span>${item.brand || 'Backdoor'}</span>
                    ${item.backorder ? `<span>Backorder${item.backorderLeadTime ? ` | ${item.backorderLeadTime}` : ''}</span>` : ''}
                </div>
                <div class="cart-item-bottom">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateQty(${index}, -1)" title="Decrease quantity">−</button>
                        <div class="qty-val">${item.qty}</div>
                        <button class="qty-btn" onclick="updateQty(${index}, 1)" title="Increase quantity">+</button>
                    </div>
                    <div class="cart-item-price">${fmt(item.price * item.qty)}</div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})" title="Remove item">
                    <i class="fa-solid fa-trash-can"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    showToast('Item removed.', 'info');
}

function updateQty(index, delta) {
    const item = cart[index];
    if (!item) return;

    item.qty = Math.max(1, item.qty + delta);
    saveCart();
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

function setStep(step) {
    currentStep = step;

    for (let index = 1; index <= 3; index += 1) {
        const numberNode = document.getElementById(`step${index}`);
        const labelNode = document.getElementById(`step${index}l`);
        if (!numberNode || !labelNode) continue;

        numberNode.className = 'c-step-num';
        labelNode.className = 'c-step-label';

        if (index < step) {
            numberNode.classList.add('done');
            numberNode.innerHTML = '<i class="fa-solid fa-check" style="font-size:12px"></i>';
            labelNode.classList.add('active');
        } else if (index === step) {
            numberNode.classList.add('active');
            numberNode.textContent = String(index);
            labelNode.classList.add('active');
        } else {
            numberNode.textContent = String(index);
        }
    }

    const sections = {
        1: ['sectionContact', 'sectionAddress'],
        2: ['sectionShipping'],
        3: ['sectionPayment']
    };

    ['sectionContact', 'sectionAddress', 'sectionShipping', 'sectionPayment'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.style.display = 'none';
    });

    (sections[step] || []).forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.style.display = 'block';
    });

    const continueBtn = document.getElementById('continueBtn');
    const backBtn = document.getElementById('backBtn');
    const placeBtn = document.getElementById('placeOrderBtn');

    if (continueBtn) continueBtn.style.display = step < 3 ? 'inline-flex' : 'none';
    if (backBtn) backBtn.style.display = step > 1 ? 'inline-flex' : 'none';
    if (placeBtn) placeBtn.style.display = step === 3 ? 'flex' : 'none';

    if (step === 2) renderShippingOptions();
    updateCheckoutActionsState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep1() {
    const requiredFields = [
        ['firstName', 'first name'],
        ['lastName', 'last name'],
        ['email', 'email'],
        ['address1', 'address'],
        ['city', 'city'],
        ['zip', 'ZIP code']
    ];

    for (const [id, label] of requiredFields) {
        const node = document.getElementById(id);
        if (!node) continue;

        if (!node.value.trim()) {
            node.classList.add('error');
            node.focus();
            showToast(`Please enter your ${label}.`, 'error');
            return false;
        }

        node.classList.remove('error');
    }

    const email = document.getElementById('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add('error');
        email.focus();
        showToast('Please enter a valid email address.', 'error');
        return false;
    }

    const state = document.getElementById('state');
    if (state && !state.value) {
        state.classList.add('error');
        state.focus();
        showToast('Please select your state.', 'error');
        return false;
    }

    return true;
}

function validateStep2() {
    if (!selectedShipping) {
        showToast('Please select a shipping method.', 'error');
        return false;
    }
    return true;
}

function validateStep3() {
    return true;
}

function continueStep() {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setStep(Math.min(3, currentStep + 1));
}

function prevStep() {
    if (currentStep > 1) {
        setStep(currentStep - 1);
    }
}

function renderShippingOptions() {
    const container = document.getElementById('shippingOptions');
    if (!container) return;

    const subtotal = getCartSubtotal();
    container.innerHTML = SHIPPING_OPTIONS.map((option) => {
        const isSelected = option.id === selectedShipping;
        const isFree = subtotal >= FREE_SHIP_THRESHOLD && option.id === 'standard';
        const priceLabel = isFree ? '<span class="free-badge">FREE</span>' : fmt(option.price);

        return `
            <button type="button" class="shipping-option ${isSelected ? 'selected' : ''}" onclick="selectShipping('${option.id}')" aria-pressed="${isSelected ? 'true' : 'false'}">
                <div class="shipping-radio${isSelected ? ' checked' : ''}"></div>
                <div class="shipping-info">
                    <div class="shipping-name">${option.name}</div>
                    <div class="shipping-time">${option.time}</div>
                </div>
                <div class="shipping-price">${priceLabel}</div>
            </button>
        `;
    }).join('');
}

function selectShipping(id) {
    selectedShipping = id;
    renderShippingOptions();
    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const summaryItems = document.getElementById('summaryItems');
    if (!summaryItems) return;

    if (cart.length === 0) {
        summaryItems.innerHTML = `
            <div class="summary-empty-state">
                <i class="fa-solid fa-bag-shopping"></i>
                <strong>Your cart is empty.</strong>
                <span>Add a product to unlock shipping rates and secure checkout.</span>
            </div>
        `;

        const discountLine = document.getElementById('discountLine');
        if (discountLine) discountLine.classList.add('hidden');

        const setText = (id, value) => {
            const node = document.getElementById(id);
            if (node) node.textContent = value;
        };

        setText('summarySubtotal', fmt(0));
        setText('summaryShipping', '--');
        setText('summaryTax', 'Calculated at payment');
        setText('summaryTotal', fmt(0));
        updateCheckoutActionsState();
        return;
    }

    summaryItems.innerHTML = cart.map((item) => `
        <div class="summary-item">
            <div class="summary-img">
                ${item.image
                    ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.parentElement.innerHTML='<span style=&quot;font-size:1.8rem&quot;>👟</span>'">`
                    : '<span style="font-size:1.8rem">👟</span>'}
                ${item.qty > 1 ? `<span class="summary-qty-badge">${item.qty}</span>` : ''}
            </div>
            <div class="summary-item-info">
                <div class="summary-item-name">${item.name}</div>
                <div class="summary-item-meta">Size ${item.size} · ${item.brand || 'Backdoor'}</div>
            </div>
            <div class="summary-item-price">${fmt(item.price * item.qty)}</div>
        </div>
    `).join('');

    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount();
    const discountedSubtotal = subtotal - discount;
    const shipping = getShippingCost();
    const total = discountedSubtotal + shipping;

    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };

    setText('summarySubtotal', fmt(subtotal));
    setText('summaryShipping', shipping === 0 ? 'FREE' : fmt(shipping));
    setText('summaryTax', selectedPaymentMethod === 'paypal' ? fmt(0) : 'Calculated at payment');
    setText('summaryTotal', fmt(total));

    const discountLine = document.getElementById('discountLine');
    const discountAmt = document.getElementById('discountAmount');
    const discountLabel = document.getElementById('discountLabel');
    if (discountLine) {
        if (discount > 0) {
            discountLine.classList.remove('hidden');
            if (discountAmt) discountAmt.textContent = `-${fmt(discount)}`;
            const codeInfo = promoState && PROMO_CODES[promoState.code?.toUpperCase()];
            if (discountLabel) discountLabel.textContent = codeInfo ? codeInfo.label : 'Discount';
        } else {
            discountLine.classList.add('hidden');
        }
    }

    updateCheckoutActionsState();
}

function getShippingSelection() {
    return SHIPPING_OPTIONS.find((option) => option.id === selectedShipping) || SHIPPING_OPTIONS[0];
}

function normalizeCountryCode(value) {
    return COUNTRY_CODES[String(value || '').trim()] || 'US';
}

function buildCheckoutRequestPayload() {
    return {
        customer: {
            firstName: document.getElementById('firstName')?.value.trim() || '',
            lastName: document.getElementById('lastName')?.value.trim() || '',
            email: document.getElementById('email')?.value.trim() || '',
            phone: document.getElementById('phone')?.value.trim() || ''
        },
        shippingAddress: {
            address1: document.getElementById('address1')?.value.trim() || '',
            address2: document.getElementById('address2')?.value.trim() || '',
            city: document.getElementById('city')?.value.trim() || '',
            state: document.getElementById('state')?.value || '',
            zip: document.getElementById('zip')?.value.trim() || '',
            country: normalizeCountryCode(document.getElementById('country')?.value || 'US')
        },
        shippingMethod: getShippingSelection().id,
        cart: cart.map(normalizeCartItem),
        promoCode: promoState?.code || null,
        discountAmount: Math.round(getDiscountAmount() * 100) // cents
    };
}

function setCheckoutButtonLoading(isLoading) {
    const button = document.getElementById('placeOrderBtn');
    if (!button) return;

    button.dataset.loading = isLoading ? 'true' : '';
    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? `<div class="spinner"></div> OPENING ${selectedPaymentMethod === 'paypal' ? 'PAYPAL' : 'SECURE CHECKOUT'}...`
        : getCheckoutButtonIdleLabel();

    if (!isLoading) {
        updateCheckoutActionsState();
    }
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method === 'paypal' ? 'paypal' : 'stripe';

    document.getElementById('payTabStripe')?.classList.toggle('active', selectedPaymentMethod === 'stripe');
    document.getElementById('payTabPaypal')?.classList.toggle('active', selectedPaymentMethod === 'paypal');

    const setHtml = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.innerHTML = value;
    };

    if (selectedPaymentMethod === 'paypal') {
        setHtml('paymentKicker', 'SECURE PAYPAL CHECKOUT');
        setHtml('paymentTitle', 'Pay with PayPal, Venmo, or eligible cards');
        setHtml('paymentCopy', 'After you confirm the order, PayPal opens a secure hosted checkout page. Backdoor sends the cart, shipping choice, and customer details so the final approval matches your order summary.');
        setHtml('paymentPills', `
            <span><i class="fa-brands fa-paypal"></i> PayPal</span>
            <span>Venmo</span>
            <span><i class="fa-regular fa-credit-card"></i> Cards</span>
            <span><i class="fa-solid fa-shield-halved"></i> Buyer protection</span>
        `);
        setHtml('paymentNote', 'You will return to Backdoor after PayPal approval so the order can be confirmed.');
    } else {
        setHtml('paymentKicker', 'SECURE STRIPE CHECKOUT');
        setHtml('paymentTitle', "Pay on Backdoor's encrypted Stripe checkout page");
        setHtml('paymentCopy', 'After you confirm the order, Stripe handles payment on a secure hosted checkout page. Card, Apple Pay, Google Pay, and pay-later options show there automatically when the order and customer country are eligible.');
        setHtml('paymentPills', `
            <span><i class="fa-regular fa-credit-card"></i> Cards</span>
            <span><i class="fa-brands fa-apple"></i> Apple Pay</span>
            <span><i class="fa-brands fa-google-pay"></i> Google Pay</span>
            <span>Klarna</span>
            <span>Afterpay</span>
            <span>Affirm</span>
            <span><i class="fa-solid fa-building-columns"></i> Direct payouts to your bank</span>
        `);
        setHtml('paymentNote', 'Final payment, promo codes, wallets, and pay-later options are completed inside Stripe checkout.');
    }

    updateCheckoutSummary();
    updateCheckoutActionsState();
}

function formatMoneyDisplay(amount, currency = 'USD') {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount || 0));
    } catch {
        return fmt(amount || 0);
    }
}

function formatDeliveryEstimate(shippingMethod) {
    const days = shippingMethod === 'overnight' ? 1 : shippingMethod === 'express' ? 3 : 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function loadCheckoutSessionStatus(sessionId) {
    const response = await fetch(`${CHECKOUT_FUNCTIONS_BASE}/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { Accept: 'application/json' }
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'Unable to verify Stripe checkout.');
    }

    return payload;
}

async function hydrateSuccessPage(sessionId) {
    const summary = await loadCheckoutSessionStatus(sessionId);
    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };

    setText('successEmail', summary.customerEmail || '');
    setText('successOrderNum', summary.orderNumber ? `#${summary.orderNumber}` : '#BACKDOOR');
    setText('successDate', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setText('successPayment', summary.paymentLabel || 'Stripe Checkout');
    setText('successTotal', formatMoneyDisplay(summary.total, summary.currency || 'USD'));
    setText('successDelivery', formatDeliveryEstimate(summary.shippingMethod));

    clearCart();
    updateCheckoutSummary();
    renderCartDrawer();
    showPage('success');
}

async function startStripeCheckout(payload) {
    const response = await fetch(`${CHECKOUT_FUNCTIONS_BASE}/create-checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.url) {
        throw new Error(result.error || 'Unable to start secure checkout.');
    }

    window.location.href = result.url;
}

async function startPayPalCheckout(payload) {
    const response = await fetch(`${CHECKOUT_FUNCTIONS_BASE}/create-paypal-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.url || !result.orderId) {
        throw new Error(result.error || 'Unable to start PayPal checkout.');
    }

    localStorage.setItem('backdoor-paypal-pending-order', JSON.stringify({
        ...payload,
        orderId: result.orderId,
        orderNumber: result.orderNumber || ''
    }));
    window.location.href = result.url;
}

async function placeOrder() {
    if (!validateStep3()) return;
    if (cart.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
    }

    setCheckoutButtonLoading(true);

    try {
        const payload = buildCheckoutRequestPayload();

        if (selectedPaymentMethod === 'paypal') {
            await startPayPalCheckout(payload);
        } else {
            await startStripeCheckout(payload);
        }
    } catch (error) {
        console.error('Checkout start failed:', error);
        showToast(error.message || 'Unable to start secure checkout.', 'error');
        setCheckoutButtonLoading(false);
    }
}

async function capturePayPalReturn(orderId) {
    const pending = JSON.parse(localStorage.getItem('backdoor-paypal-pending-order') || 'null');
    const response = await fetch(`${CHECKOUT_FUNCTIONS_BASE}/capture-paypal-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({
            orderId,
            pendingOrder: pending
        })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'Unable to confirm PayPal checkout.');
    }

    return payload;
}

async function hydratePayPalSuccessPage(orderId) {
    const summary = await capturePayPalReturn(orderId);
    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };

    setText('successEmail', summary.customerEmail || '');
    setText('successOrderNum', summary.orderNumber ? `#${summary.orderNumber}` : '#BACKDOOR');
    setText('successDate', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setText('successPayment', summary.paymentLabel || 'PayPal Checkout');
    setText('successTotal', formatMoneyDisplay(summary.total, summary.currency || 'USD'));
    setText('successDelivery', formatDeliveryEstimate(summary.shippingMethod));

    localStorage.removeItem('backdoor-paypal-pending-order');
    clearCart();
    updateCheckoutSummary();
    renderCartDrawer();
    showPage('success');
}

function applyPromo() {
    const cartInput = document.getElementById('promoCode');
    const checkoutInput = document.getElementById('checkoutPromo');
    const raw = (cartInput?.value || checkoutInput?.value || '').trim();
    if (!raw) {
        showToast('Please enter a promo code.', 'error');
        return;
    }
    applyPromoCode(raw);
    if (cartInput) cartInput.value = '';
    if (checkoutInput) checkoutInput.value = '';
}

async function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    const state = params.get(SUCCESS_QUERY_KEY);
    const sessionId = params.get('session_id');
    const paypalOrderId = params.get('token') || params.get('orderId') || params.get('order_id');

    if (state === 'cancelled') {
        showPage('checkout');
        setStep(Number(params.get('step')) || 3);
        showToast('Checkout was canceled.', 'info');
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }

    if (state === 'success' && sessionId) {
        try {
            await hydrateSuccessPage(sessionId);
            showToast('Payment confirmed.', 'success');
        } catch (error) {
            console.error('Stripe checkout confirmation failed:', error);
            showToast(error.message || 'Payment confirmation is still processing.', 'info');
            showPage('success');
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        return true;
    }

    if (state === 'success' && paypalOrderId) {
        try {
            await hydratePayPalSuccessPage(paypalOrderId);
            showToast('Payment confirmed.', 'success');
        } catch (error) {
            console.error('PayPal checkout confirmation failed:', error);
            showToast(error.message || 'Payment confirmation is still processing.', 'info');
            showPage('success');
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        return true;
    }

    return false;
}

function showPage(page) {
    const storePage = document.getElementById('storePage');
    const checkoutPage = document.getElementById('checkoutPage');
    const successPage = document.getElementById('successPage');

    if (storePage) {
        storePage.style.display = page === 'store' ? 'block' : 'none';
    }
    if (checkoutPage) {
        checkoutPage.classList.toggle('show', page === 'checkout');
    }
    if (successPage) {
        successPage.classList.toggle('show', page === 'success');
    }

    window.scrollTo(0, 0);
}

function goToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
    }

    closeCart();
    showPage('checkout');
    setStep(1);
    updateCheckoutSummary();
}

function formatPhone(input) {
    let value = input.value.replace(/\D/g, '').substring(0, 10);
    if (value.length >= 6) {
        value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length >= 3) {
        value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    }
    input.value = value;
}

document.addEventListener('DOMContentLoaded', async () => {
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
        navLogo.onclick = () => {
            window.location.href = 'index.html';
        };
    }

    loadCart();

    document.querySelectorAll('.form-input, .form-select').forEach((node) => {
        node.addEventListener('input', () => node.classList.remove('error'));
        node.addEventListener('change', () => node.classList.remove('error'));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeCart();
    });

    closeCart();
    setStep(1);

    const handledReturn = await handleCheckoutReturn();
    if (!handledReturn) {
        showPage('checkout');
    }
});

window.openCart = openCart;
window.closeCart = closeCart;
window.goToCheckout = goToCheckout;
window.showPage = showPage;
window.applyPromo = applyPromo;
window.removePromo = removePromo;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.formatPhone = formatPhone;
window.selectShipping = selectShipping;
window.selectPaymentMethod = selectPaymentMethod;
window.placeOrder = placeOrder;
window.continueStep = continueStep;
window.prevStep = prevStep;
