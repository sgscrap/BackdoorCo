/* ══════════════════════════════════════════
   BACKDOOR — ORDER TRACKING JS
══════════════════════════════════════════ */

/* ── DEMO ORDER DATA ── */
const ORDERS = [
    {
        id: '#BD-1042',
        customer: { name: 'Marcus Johnson', email: 'marcus@email.com', initials: 'MJ' },
        date: '2026-02-28',
        status: 'shipped',
        total: 799.99,
        subtotal: 750.00,
        discount: 0,
        shipping: 19.99,
        tax: 30.00,
        items: [
            { emoji: '👟', name: 'Air Jordan 1 Retro High OG "Chicago"', brand: 'Jordan', size: '10', qty: 1, price: 750 }
        ],
        address: { name: 'Marcus Johnson', street: '421 Sneaker Ave, Apt 3B', city: 'New York, NY 10001', country: 'United States' },
        carrier: { name: 'UPS', service: 'UPS Ground', tracking: '1Z999AA10123456784', logo: '📦', color: '#6b3a0a', url: 'https://www.ups.com/track' },
        estimatedDelivery: '2026-03-06',
        events: [
            { title: 'Shipped', desc: 'Package picked up by carrier', time: '2026-03-01T14:32:00', icon: 'fa-truck', color: 'var(--purple)', location: 'UPS Louisville, KY' },
            { title: 'In Transit', desc: 'Departed UPS facility', time: '2026-03-01T08:15:00', icon: 'fa-right-left', color: 'var(--blue)', location: 'UPS Louisville, KY' },
            { title: 'Label Created', desc: 'Shipping label created, package awaiting carrier pickup', time: '2026-02-28T22:10:00', icon: 'fa-tag', color: 'var(--accent)', location: 'Backdoor Warehouse, LA' },
            { title: 'Confirmed', desc: 'Payment verified, order confirmed', time: '2026-02-28T18:05:00', icon: 'fa-circle-check', color: 'var(--blue)' },
            { title: 'Order Placed', desc: 'Order created successfully', time: '2026-02-28T18:00:00', icon: 'fa-cart-shopping', color: 'var(--accent)' }
        ]
    },
    {
        id: '#BD-1041',
        customer: { name: 'Sarah Williams', email: 'sarah.w@email.com', initials: 'SW' },
        date: '2026-02-25',
        status: 'delivered',
        total: 349.99,
        subtotal: 320.00,
        discount: 0,
        shipping: 0,
        tax: 29.99,
        items: [
            { emoji: '🦓', name: 'Yeezy Boost 350 V2 "Zebra"', brand: 'Adidas', size: '8', qty: 1, price: 320 }
        ],
        address: { name: 'Sarah Williams', street: '88 Fashion Blvd', city: 'Los Angeles, CA 90210', country: 'United States' },
        carrier: { name: 'FedEx', service: 'FedEx Express', tracking: '794644790548', logo: '📬', color: '#4d148c', url: 'https://www.fedex.com/track' },
        estimatedDelivery: '2026-02-28',
        events: [
            { title: 'Delivered', desc: 'Package delivered to front door', time: '2026-02-28T11:22:00', icon: 'fa-house', color: 'var(--green)', location: 'Los Angeles, CA' },
            { title: 'Out for Delivery', desc: 'Package out for delivery', time: '2026-02-28T06:45:00', icon: 'fa-truck-fast', color: 'var(--orange)', location: 'Los Angeles, CA' },
            { title: 'In Transit', desc: 'Arrived at local facility', time: '2026-02-27T22:00:00', icon: 'fa-right-left', color: 'var(--blue)', location: 'FedEx Los Angeles Hub' },
            { title: 'Shipped', desc: 'Package picked up by FedEx', time: '2026-02-26T09:30:00', icon: 'fa-truck', color: 'var(--purple)', location: 'Backdoor Warehouse, LA' },
            { title: 'Order Placed', desc: 'Order created successfully', time: '2026-02-25T14:00:00', icon: 'fa-cart-shopping', color: 'var(--accent)' }
        ]
    },
    {
        id: '#BD-1040',
        customer: { name: 'James Chen', email: 'jchen@email.com', initials: 'JC' },
        date: '2026-03-03',
        status: 'processing',
        total: 185.89,
        subtotal: 165.00,
        discount: 0,
        shipping: 9.99,
        tax: 10.90,
        items: [
            { emoji: '🐼', name: 'Nike Dunk Low Retro "Panda"', brand: 'Nike', size: '11', qty: 1, price: 165 }
        ],
        address: { name: 'James Chen', street: '555 Tech Lane', city: 'San Francisco, CA 94105', country: 'United States' },
        carrier: null,
        estimatedDelivery: '2026-03-10',
        events: [
            { title: 'Processing', desc: 'Order is being prepared for shipment', time: '2026-03-03T16:00:00', icon: 'fa-gear', color: 'var(--accent)' },
            { title: 'Order Placed', desc: 'Order created successfully', time: '2026-03-03T15:45:00', icon: 'fa-cart-shopping', color: 'var(--accent)' }
        ]
    },
    {
        id: '#BD-1039',
        customer: { name: 'Emily Davis', email: 'emily.d@email.com', initials: 'ED' },
        date: '2026-02-27',
        status: 'out',
        total: 1399.99,
        subtotal: 1350.00,
        discount: 0,
        shipping: 0,
        tax: 49.99,
        items: [
            { emoji: '🤠', name: 'Travis Scott Dunk Low "Jackboys"', brand: 'Nike × Travis Scott', size: '9', qty: 1, price: 1350 }
        ],
        address: { name: 'Emily Davis', street: '200 Hype Street', city: 'Miami, FL 33101', country: 'United States' },
        carrier: { name: 'DHL', service: 'DHL Express', tracking: '1234567890', logo: '🟡', color: '#d40511', url: 'https://www.dhl.com/track' },
        estimatedDelivery: '2026-03-04',
        events: [
            { title: 'Out for Delivery', desc: 'Package is out for delivery today', time: '2026-03-04T07:00:00', icon: 'fa-truck-fast', color: 'var(--orange)', location: 'Miami, FL' },
            { title: 'In Transit', desc: 'Arrived at local DHL facility', time: '2026-03-03T20:15:00', icon: 'fa-right-left', color: 'var(--blue)', location: 'DHL Miami Hub' },
            { title: 'Shipped', desc: 'Package picked up by DHL Express', time: '2026-03-01T10:00:00', icon: 'fa-truck', color: 'var(--purple)', location: 'Backdoor Warehouse, LA' },
            { title: 'Confirmed', desc: 'Payment verified', time: '2026-02-27T12:30:00', icon: 'fa-circle-check', color: 'var(--blue)' },
            { title: 'Order Placed', desc: 'Order created', time: '2026-02-27T12:00:00', icon: 'fa-cart-shopping', color: 'var(--accent)' }
        ]
    },
    {
        id: '#BD-1038',
        customer: { name: 'Alex Turner', email: 'alex.t@email.com', initials: 'AT' },
        date: '2026-02-20',
        status: 'cancelled',
        total: 750.00,
        subtotal: 750.00,
        discount: 0,
        shipping: 0,
        tax: 0,
        items: [
            { emoji: '👟', name: 'Air Jordan 1 Retro High OG "Chicago"', brand: 'Jordan', size: '9', qty: 1, price: 750 }
        ],
        address: { name: 'Alex Turner', street: '333 Old Town Rd', city: 'Austin, TX 78701', country: 'United States' },
        carrier: null,
        estimatedDelivery: null,
        events: [
            { title: 'Cancelled', desc: 'Order cancelled by customer — refund initiated', time: '2026-02-21T09:30:00', icon: 'fa-ban', color: 'var(--red)' },
            { title: 'Order Placed', desc: 'Order created', time: '2026-02-20T16:00:00', icon: 'fa-cart-shopping', color: 'var(--accent)' }
        ]
    }
];

/* ── STATE ── */
let currentOrderId = null;
let selectedRows = new Set();
let sortField = 'date';
let sortDir = 'desc';
let filteredOrders = [...ORDERS];
let db = null;

/* ── FIREBASE INIT ── */
function initFirebase() {
    if (!window.firebaseConfig) return;
    try {
        if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
        db = firebase.firestore();
    } catch (e) { console.warn('Firebase init failed', e); }
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(110%)'; setTimeout(() => t.remove(), 300); }, 3000);
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const STATUS_MAP = {
    processing: { label: 'Processing', icon: 'fa-gear', badge: 'status-processing', pill: 'pill-processing', step: 1 },
    confirmed: { label: 'Confirmed', icon: 'fa-circle-check', badge: 'status-confirmed', pill: 'pill-confirmed', step: 2 },
    shipped: { label: 'Shipped', icon: 'fa-truck', badge: 'status-shipped', pill: 'pill-shipped', step: 3 },
    out: { label: 'Out for Delivery', icon: 'fa-truck-fast', badge: 'status-out', pill: 'pill-out', step: 4 },
    delivered: { label: 'Delivered', icon: 'fa-house', badge: 'status-delivered', pill: 'pill-delivered', step: 5 },
    cancelled: { label: 'Cancelled', icon: 'fa-ban', badge: 'status-cancelled', pill: 'pill-cancelled', step: -1 },
    returned: { label: 'Returned', icon: 'fa-rotate-left', badge: 'status-returned', pill: 'pill-returned', step: -1 }
};

const PROGRESS_STEPS = [
    { label: 'Placed', icon: 'fa-cart-shopping' },
    { label: 'Confirmed', icon: 'fa-circle-check' },
    { label: 'Shipped', icon: 'fa-truck' },
    { label: 'Out for Delivery', icon: 'fa-truck-fast' },
    { label: 'Delivered', icon: 'fa-house' }
];

/* ══════════════════════════════════════════
   PAGES
══════════════════════════════════════════ */
function showPage(page) {
    document.getElementById('lookupPage').classList.toggle('show', page === 'lookup');
    document.getElementById('trackingPage').classList.toggle('show', page === 'tracking');
    document.getElementById('adminPage').classList.toggle('show', page === 'admin');

    const navLookup = document.getElementById('navLookup');
    const navAdmin = document.getElementById('navAdmin');
    navLookup?.classList.toggle('active', page === 'lookup' || page === 'tracking');
    navAdmin?.classList.toggle('active', page === 'admin');

    if (page === 'admin') renderAdminPanel();
    window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════
   LOOKUP
══════════════════════════════════════════ */
function switchLookupTab(tab) {
    document.getElementById('tabOrder').classList.toggle('active', tab === 'order');
    document.getElementById('tabEmail').classList.toggle('active', tab === 'email');
    const input = document.getElementById('lookupInput');
    input.placeholder = tab === 'order' ? '#BD-1042' : 'marcus@email.com';
    input.value = '';
    input.focus();
}

function quickLookup(orderId) {
    document.getElementById('lookupInput').value = orderId;
    lookupOrder();
}

async function lookupOrder(autoInput) {
    const rawInput = autoInput || document.getElementById('lookupInput').value.trim();
    const input    = rawInput.replace(/^#/, '').trim();
    const btn      = document.getElementById('lookupBtn');
    if (!input) { showToast('Please enter an order number or email', 'warn'); return; }

    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }

    let order = null;

    // 1. Try Firestore first
    if (db) {
        try {
            // Search by orderNumber field
            const snap = await db.collection('orders')
                .where('orderNumber', '==', input)
                .limit(1).get();
            if (!snap.empty) {
                const data = snap.docs[0].data();
                order = normalizeFirestoreOrder(snap.docs[0].id, data);
            } else if (input.includes('@')) {
                // Search by email
                const snap2 = await db.collection('orders')
                    .where('customerEmail', '==', input)
                    .orderBy('createdAt', 'desc')
                    .limit(1).get();
                if (!snap2.empty) {
                    order = normalizeFirestoreOrder(snap2.docs[0].id, snap2.docs[0].data());
                }
            }
        } catch (e) { console.warn('Firestore lookup error', e); }
    }

    // 2. Fall back to demo orders
    if (!order) {
        order = ORDERS.find(o =>
            o.id.toLowerCase().replace(/^#/, '') === input.toLowerCase() ||
            o.customer?.email?.toLowerCase() === input.toLowerCase()
        );
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> TRACK'; }

    if (!order) { showToast('Order not found. Check your order number.', 'error'); return; }

    currentOrderId = order.id;
    showTrackingDetail(order);
}

/* Convert a Firestore order document into the tracking detail shape */
function normalizeFirestoreOrder(docId, data) {
    const pricing  = data.pricing || {};
    const addr     = data.shippingAddress || {};
    const custName = data.customerName || (addr.name || data.customerEmail || 'Customer');
    const carrier  = data.carrier ? {
        name: data.carrier.toUpperCase(),
        service: data.carrier + ' Shipping',
        tracking: data.trackingNumber || '',
        logo: '📦',
        color: '#333',
        url: data.trackingUrl || '#'
    } : null;

    const statusRaw = (data.status || 'processing').toLowerCase();

    // Build a basic events array from status
    const events = [];
    if (data.deliveredAt)   events.push({ title: 'Delivered', desc: 'Package delivered', time: data.deliveredAt?.toDate?.().toISOString() || data.deliveredAt, icon: 'fa-house', color: 'var(--green)' });
    if (data.shippedAt)     events.push({ title: 'Shipped', desc: 'Package shipped', time: data.shippedAt?.toDate?.().toISOString() || data.shippedAt, icon: 'fa-truck', color: 'var(--purple)' });
    if (data.confirmedAt)   events.push({ title: 'Confirmed', desc: 'Order confirmed', time: data.confirmedAt?.toDate?.().toISOString() || data.confirmedAt, icon: 'fa-circle-check', color: 'var(--blue)' });
    const createdISO = data.createdAt?.toDate?.().toISOString() || data.createdAt || new Date().toISOString();
    events.push({ title: 'Order Placed', desc: 'Order created', time: createdISO, icon: 'fa-cart-shopping', color: 'var(--accent)' });

    return {
        id: '#' + (data.orderNumber || docId),
        customer: { name: custName, email: data.customerEmail || '', initials: custName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) },
        date: createdISO,
        status: statusRaw,
        total: Number(pricing.total || 0),
        subtotal: Number(pricing.subtotal || pricing.total || 0),
        discount: Number(pricing.discount || 0),
        shipping: Number(pricing.shipping || 0),
        tax: Number(pricing.tax || 0),
        items: (data.items || []).map(item => ({
            emoji: '👟',
            name: item.name || item.title || 'Item',
            brand: item.brand || '',
            size: item.size || '—',
            qty: item.quantity || item.qty || 1,
            price: item.price || 0
        })),
        address: {
            name: addr.name || custName,
            street: [addr.line1, addr.line2].filter(Boolean).join(', ') || addr.address || '—',
            city: [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ') || '—',
            country: addr.country || 'United States'
        },
        carrier,
        estimatedDelivery: data.estimatedDelivery || null,
        events
    };
}

/* ══════════════════════════════════════════
   TRACKING DETAIL
══════════════════════════════════════════ */
function showTrackingDetail(order) {
    const s = STATUS_MAP[order.status];

    // Header
    document.getElementById('trackOrderId').textContent = order.id;
    document.getElementById('trackOrderDate').textContent = 'Placed on ' + formatDate(order.date);
    const badge = document.getElementById('trackStatusBadge');
    badge.className = 'order-status-badge ' + s.badge;
    document.getElementById('trackStatusText').textContent = s.label;

    // Meta
    document.getElementById('trackCustomer').textContent = order.customer.name;
    document.getElementById('trackTotal').textContent = formatCurrency(order.total);
    document.getElementById('trackItems').textContent = order.items.reduce((sum, i) => sum + i.qty, 0) + ' item(s)';
    document.getElementById('trackDelivery').textContent = formatDate(order.estimatedDelivery);

    // Delivery banner
    const banner = document.getElementById('deliveryBanner');
    if (order.estimatedDelivery && order.status !== 'cancelled' && order.status !== 'returned') {
        banner.style.display = 'flex';
        document.getElementById('deliveryDate').textContent = formatDate(order.estimatedDelivery);
        document.getElementById('deliveryNote').textContent = order.status === 'delivered' ? 'Package delivered!' : 'Estimated delivery date';
    } else {
        banner.style.display = 'none';
    }

    // Progress timeline
    renderProgressSteps(order);

    // Event log
    renderEventLog(order);

    // Carrier
    const carrierCard = document.getElementById('carrierCard');
    if (order.carrier) {
        carrierCard.style.display = 'block';
        document.getElementById('carrierLogo').textContent = order.carrier.logo;
        document.getElementById('carrierLogo').style.background = order.carrier.color + '22';
        document.getElementById('carrierName').textContent = order.carrier.name;
        document.getElementById('carrierService').textContent = order.carrier.service;
        document.getElementById('trackingNumDisplay').textContent = order.carrier.tracking;
        document.getElementById('carrierLink').href = order.carrier.url;
    } else {
        carrierCard.style.display = 'none';
    }

    // Items
    document.getElementById('trackItemsList').innerHTML = order.items.map(item => `
    <div class="order-item-row">
      <div class="item-thumb">${item.emoji}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta"><span>Size ${item.size}</span><span>Qty: ${item.qty}</span><span>${item.brand}</span></div>
      </div>
      <div class="item-price">${formatCurrency(item.price * item.qty)}</div>
    </div>
  `).join('');

    // Address
    document.getElementById('trackAddress').innerHTML = `
    <p><strong>${order.address.name}</strong></p>
    <p>${order.address.street}</p>
    <p>${order.address.city}</p>
    <p>${order.address.country}</p>
  `;

    // Pricing
    document.getElementById('trackPricing').innerHTML = `
    <div class="price-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
    ${order.discount > 0 ? `<div class="price-row"><span>Discount</span><span class="discount">-${formatCurrency(order.discount)}</span></div>` : ''}
    <div class="price-row"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}</span></div>
    <div class="price-row"><span>Tax</span><span>${formatCurrency(order.tax)}</span></div>
    <div class="price-row total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>
  `;

    // Actions
    const actions = document.getElementById('trackActions');
    let actionsHtml = `
    <button class="action-btn secondary" onclick="showToast('Receipt sent to ${order.customer.email}', 'info')"><i class="fa-solid fa-receipt"></i> Email Receipt</button>
    <button class="action-btn secondary" onclick="showToast('Support chat coming soon!', 'info')"><i class="fa-solid fa-headset"></i> Contact Support</button>
  `;
    if (order.status !== 'cancelled' && order.status !== 'delivered') {
        actionsHtml += `<button class="action-btn danger" onclick="cancelOrder('${order.id}')"><i class="fa-solid fa-ban"></i> Cancel Order</button>`;
    }
    if (order.status === 'delivered') {
        actionsHtml += `<button class="action-btn primary" onclick="showToast('Return initiated!', 'info')"><i class="fa-solid fa-rotate-left"></i> Request Return</button>`;
    }
    actions.innerHTML = actionsHtml;

    showPage('tracking');
}

function renderProgressSteps(order) {
    const container = document.getElementById('progressSteps');
    const fill = document.getElementById('progressFill');
    const s = STATUS_MAP[order.status];
    const currentStep = s.step;
    const isCancelled = order.status === 'cancelled' || order.status === 'returned';

    container.innerHTML = PROGRESS_STEPS.map((step, i) => {
        const stepNum = i + 1;
        let dotClass = 'p-step-dot';
        let labelClass = 'p-step-label';

        if (isCancelled) {
            if (stepNum === 1) { dotClass += ' done'; labelClass += ' done'; }
            else if (stepNum === 2) { dotClass += ' cancelled'; labelClass += ' active'; }
        } else {
            if (stepNum < currentStep) { dotClass += ' done'; labelClass += ' done'; }
            else if (stepNum === currentStep) { dotClass += ' active'; labelClass += ' active'; }
        }

        const eventForStep = order.events.find(e => {
            const t = e.title.toLowerCase();
            const l = step.label.toLowerCase();
            return t.includes(l) || l.includes(t);
        });

        return `
      <div class="p-step">
        <div class="${dotClass}"><i class="fa-solid ${isCancelled && stepNum === 2 ? 'fa-xmark' : step.icon}"></i></div>
        <div class="p-step-info">
          <div class="${labelClass}">${isCancelled && stepNum === 2 ? (order.status === 'cancelled' ? 'Cancelled' : 'Returned') : step.label}</div>
          <div class="p-step-date">${eventForStep ? formatDateTime(eventForStep.time) : ''}</div>
        </div>
      </div>
    `;
    }).join('');

    // Fill bar
    if (isCancelled) {
        fill.style.width = '12%';
    } else {
        const pct = ((currentStep - 1) / (PROGRESS_STEPS.length - 1)) * 100;
        setTimeout(() => { fill.style.width = pct + '%'; }, 100);
    }
}

function renderEventLog(order) {
    const container = document.getElementById('eventLog');
    container.innerHTML = order.events.map((evt, i) => `
    <div class="event-item" style="animation-delay:${i * 0.1}s">
      <div class="event-dot" style="background:${evt.color}22;border:2px solid ${evt.color};color:${evt.color}">
        <i class="fa-solid ${evt.icon}"></i>
      </div>
      <div class="event-content">
        <div class="event-title">${evt.title}</div>
        <div class="event-desc">${evt.desc}</div>
        <div class="event-time">${formatDateTime(evt.time)}</div>
        ${evt.location ? `<div class="event-location"><i class="fa-solid fa-location-dot"></i> ${evt.location}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function cancelOrder(orderId) {
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) return;
    order.status = 'cancelled';
    order.events.unshift({
        title: 'Cancelled', desc: 'Order cancelled by customer — refund initiated',
        time: new Date().toISOString(), icon: 'fa-ban', color: 'var(--red)'
    });
    showTrackingDetail(order);
    showToast('Order cancelled. Refund initiated.', 'info');
}

function copyTracking() {
    const num = document.getElementById('trackingNumDisplay').textContent;
    navigator.clipboard.writeText(num).then(() => showToast('Tracking number copied!', 'info'));
}

/* ══════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════ */
function renderAdminPanel() {
    updateAdminStats();
    filterOrders();
}

function updateAdminStats() {
    document.getElementById('aTotalOrders').textContent = ORDERS.length;
    document.getElementById('aProcessing').textContent = ORDERS.filter(o => o.status === 'processing' || o.status === 'confirmed').length;
    document.getElementById('aShipped').textContent = ORDERS.filter(o => o.status === 'shipped' || o.status === 'out').length;
    document.getElementById('aDelivered').textContent = ORDERS.filter(o => o.status === 'delivered').length;
    document.getElementById('aCancelled').textContent = ORDERS.filter(o => o.status === 'cancelled' || o.status === 'returned').length;
}

function filterOrders() {
    const search = (document.getElementById('searchOrders').value || '').toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const dateFilter = document.getElementById('filterDate').value;
    const now = new Date();

    filteredOrders = ORDERS.filter(o => {
        // Search
        if (search) {
            const match = o.id.toLowerCase().includes(search) ||
                o.customer.name.toLowerCase().includes(search) ||
                o.customer.email.toLowerCase().includes(search);
            if (!match) return false;
        }
        // Status
        if (statusFilter && o.status !== statusFilter) return false;
        // Date
        if (dateFilter) {
            const orderDate = new Date(o.date);
            if (dateFilter === 'today' && orderDate.toDateString() !== now.toDateString()) return false;
            if (dateFilter === 'week') {
                const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
                if (orderDate < weekAgo) return false;
            }
            if (dateFilter === 'month') {
                if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
            }
        }
        return true;
    });

    // Sort
    filteredOrders.sort((a, b) => {
        let valA, valB;
        switch (sortField) {
            case 'id': valA = a.id; valB = b.id; break;
            case 'customer': valA = a.customer.name; valB = b.customer.name; break;
            case 'total': valA = a.total; valB = b.total; break;
            default: valA = new Date(a.date); valB = new Date(b.date);
        }
        const cmp = valA > valB ? 1 : valA < valB ? -1 : 0;
        return sortDir === 'desc' ? -cmp : cmp;
    });

    renderOrdersTable();
}

function sortTable(field) {
    if (sortField === field) {
        sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    } else {
        sortField = field;
        sortDir = 'desc';
    }
    filterOrders();
}

function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = filteredOrders.map(o => {
        const s = STATUS_MAP[o.status];
        const isSelected = selectedRows.has(o.id);
        return `
      <tr>
        <td><input type="checkbox" class="accent-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleRow('${o.id}', this.checked)"/></td>
        <td><button type="button" class="order-id-cell" onclick="viewOrderFromAdmin('${o.id}')">${o.id}</button></td>
        <td><div class="customer-cell"><div class="cust-avatar">${o.customer.initials}</div><span>${o.customer.name}</span></div></td>
        <td>${formatDate(o.date)}</td>
        <td>${formatCurrency(o.total)}</td>
        <td><span class="status-pill ${s.pill}">${s.label}</span></td>
        <td>${o.carrier ? `<span style="font-family:monospace;font-size:11px;color:var(--text3)">${o.carrier.tracking.substring(0, 10)}...</span>` : '<span style="color:var(--text3)">—</span>'}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="viewOrderFromAdmin('${o.id}')" title="View order"><i class="fa-solid fa-eye"></i></button>
            <button class="row-btn" onclick="openStatusModal('${o.id}')" title="Update status"><i class="fa-solid fa-pen"></i></button>
            <button class="row-btn danger" onclick="cancelFromAdmin('${o.id}')" title="Cancel order"><i class="fa-solid fa-ban"></i></button>
          </div>
        </td>
      </tr>
    `;
    }).join('');

    document.getElementById('paginationInfo').textContent = `Showing ${filteredOrders.length} of ${ORDERS.length} orders`;
    updateBulkBar();
}

function viewOrderFromAdmin(orderId) {
    const order = ORDERS.find(o => o.id === orderId);
    if (order) showTrackingDetail(order);
}

function cancelFromAdmin(orderId) {
    cancelOrder(orderId);
    renderAdminPanel();
}

/* ── SELECTION ── */
function toggleRow(orderId, checked) {
    if (checked) selectedRows.add(orderId); else selectedRows.delete(orderId);
    updateBulkBar();
}

function toggleSelectAll(cb) {
    if (cb.checked) filteredOrders.forEach(o => selectedRows.add(o.id));
    else selectedRows.clear();
    renderOrdersTable();
}

function clearSelection() {
    selectedRows.clear();
    document.getElementById('selectAll').checked = false;
    renderOrdersTable();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    if (selectedRows.size > 0) {
        bar.classList.add('show');
        document.getElementById('bulkCount').textContent = selectedRows.size + ' selected';
    } else {
        bar.classList.remove('show');
    }
}

/* ── STATUS MODAL ── */
let modalTargetOrderId = null;

function openStatusModal(orderId) {
    modalTargetOrderId = orderId;
    document.getElementById('modalOrderId').textContent = orderId;
    const order = ORDERS.find(o => o.id === orderId);
    if (order) document.getElementById('modalNewStatus').value = order.status;
    document.getElementById('statusModal').classList.add('open');
}

function confirmStatusUpdate() {
    if (!modalTargetOrderId) return;
    const newStatus = document.getElementById('modalNewStatus').value;
    const tracking = document.getElementById('modalTracking').value.trim();
    const carrier = document.getElementById('modalCarrier').value;

    const order = ORDERS.find(o => o.id === modalTargetOrderId);
    if (!order) return;

    order.status = newStatus;

    // Add carrier if shipping
    if ((newStatus === 'shipped' || newStatus === 'out') && tracking) {
        const carriers = {
            ups: { name: 'UPS', service: 'UPS Ground', logo: '📦', color: '#6b3a0a', url: 'https://www.ups.com/track' },
            fedex: { name: 'FedEx', service: 'FedEx Express', logo: '📬', color: '#4d148c', url: 'https://www.fedex.com/track' },
            usps: { name: 'USPS', service: 'USPS Priority', logo: '📮', color: '#004b87', url: 'https://tools.usps.com/go/TrackConfirmAction' },
            dhl: { name: 'DHL', service: 'DHL Express', logo: '🟡', color: '#d40511', url: 'https://www.dhl.com/track' }
        };
        order.carrier = { ...carriers[carrier], tracking };
    }

    // Add event
    const s = STATUS_MAP[newStatus];
    order.events.unshift({
        title: s.label,
        desc: `Status updated to ${s.label}`,
        time: new Date().toISOString(),
        icon: s.icon,
        color: newStatus === 'cancelled' ? 'var(--red)' : newStatus === 'delivered' ? 'var(--green)' : 'var(--accent)'
    });

    closeModal('statusModal');
    showToast(`Order ${modalTargetOrderId} updated to "${s.label}"!`);
    renderAdminPanel();
    modalTargetOrderId = null;
}

/* ── BULK ACTIONS ── */
function bulkUpdateStatus() {
    if (selectedRows.size === 0) return;
    // Open modal for first, apply to all
    openStatusModal([...selectedRows][0]);
}

function bulkNotify() {
    if (selectedRows.size === 0) return;
    openNotifyModal();
    document.getElementById('notifyTo').value = [...selectedRows].join(', ');
}

/* ── NOTIFY MODAL ── */
function openNotifyModal() {
    document.getElementById('notifyModal').classList.add('open');
}

function sendNotification() {
    const to = document.getElementById('notifyTo').value.trim();
    const subject = document.getElementById('notifySubject').value.trim();
    const message = document.getElementById('notifyMessage').value.trim();

    if (!subject && !message) {
        showToast('Please enter a subject or message', 'warn');
        return;
    }

    closeModal('notifyModal');
    showToast(`Notification sent to ${to || 'all customers'}! 📬`);

    // Clear form
    document.getElementById('notifyTo').value = '';
    document.getElementById('notifySubject').value = '';
    document.getElementById('notifyMessage').value = '';
}

/* ── MODAL HELPERS ── */
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOnOverlay(e, id) { if (e.target.id === id) closeModal(id); }

/* ── EXPORT ── */
function exportOrders() {
    const headers = ['Order ID', 'Customer', 'Email', 'Date', 'Status', 'Total', 'Tracking'];
    const rows = filteredOrders.map(o => [
        o.id, o.customer.name, o.customer.email, o.date,
        STATUS_MAP[o.status].label, o.total.toFixed(2),
        o.carrier ? o.carrier.tracking : ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += r.map(v => `"${v}"`).join(',') + '\n'; });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backdoor_orders.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Orders exported as CSV! 📄');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    initFirebase();

    // Check for ?order= URL param (from accounts page Track button)
    const urlParams = new URLSearchParams(window.location.search);
    const orderParam = urlParams.get('order');
    if (orderParam) {
        const input = document.getElementById('lookupInput');
        if (input) input.value = '#' + orderParam.replace(/^#/, '');
        await lookupOrder(orderParam);
        return;
    }

    // Check for URL hash - e.g. tracking.html#BD-1042 (legacy)
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) {
        const orderId = hash.startsWith('BD-') ? '#' + hash : hash;
        const order = ORDERS.find(o => o.id === orderId);
        if (order) { showTrackingDetail(order); return; }
        // Try Firestore lookup
        await lookupOrder(hash);
        return;
    }

    // ESC to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal('statusModal');
            closeModal('notifyModal');
        }
    });
});
