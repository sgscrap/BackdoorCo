/* ══════════════════════════════════════════
   BACKDOOR EMAIL AUTOMATION — CORE LOGIC
══════════════════════════════════════════ */

// ── DATA SOURCES ──
const FLOWS = [
    { id: 1, name: "Welcome Series", trigger: "signup", desc: "Sent immediately after a user creates an account.", sent: "4.2K", rate: "42.5%", color: "var(--accent)", active: true },
    { id: 2, name: "Abandoned Cart", trigger: "abandoned_cart", desc: "Remind users of items left in their cart after 1 hour.", sent: "1.8K", rate: "12.2%", color: "var(--orange)", active: true },
    { id: 3, name: "Order Confirmation", trigger: "order_placed", desc: "Transaction receipt and thank you message.", sent: "3.1K", rate: "98.1%", color: "var(--blue)", active: true },
    { id: 4, name: "Shipping Update", trigger: "order_shipped", desc: "Live tracking link when the package leaves our warehouse.", sent: "2.5K", rate: "85.4%", color: "var(--purple)", active: true },
    { id: 5, name: "Out for Delivery", trigger: "out_for_delivery", desc: "Last-mile notification when the courier is nearby.", sent: "2.1K", rate: "92.0%", color: "var(--green)", active: true },
    { id: 6, name: "Post-Purchase Review", trigger: "delivered", desc: "Ask for a review 7 days after delivery.", sent: "840", rate: "18.4%", color: "var(--red)", active: false }
];

const TEMPLATES = [
    { name: "Modern Receipt", type: "Transactional", subject: "Order #{{order_id}} Confirmed", headline: "THANK YOU FOR YOUR ORDER", body: "We've received your order and we're getting it ready for shipment. You'll receive another email with tracking info soon.", btn: "VIEW ORDER STATUS", showProducts: "yes" },
    { name: "Abandoned (Minimal)", type: "Flow", subject: "Forget something?", headline: "YOUR CART IS WAITING", body: "The best items sell out fast. We've saved your selection for a limited time—grab them before they're gone.", btn: "RETURN TO CART", showProducts: "yes" },
    { name: "Welcome (Hype)", type: "Flow", subject: "You're in. 🔓", headline: "ACCESS GRANTED", body: "Welcome to the inner circle. Get ready for exclusive drops, early access, and archive collections. Use code WELCOME10 for 10% off your first order.", btn: "SHOP COLLECTION", showProducts: "no" },
    { name: "Shipping Alert", type: "Transactional", subject: "Your gear is on the move!", headline: "PACKAGE SHIPPED", body: "Great news! Your order has been processed and is currently with our carrier. Track your delivery below.", btn: "TRACK PACKAGE", showProducts: "no" }
];

const SUBSCRIBERS = [
    { email: "alex.sneaker@gmail.com", joined: "2025-10-12", lastOpen: "2 hours ago", orders: 4, spent: "$1,240", status: "vip" },
    { email: "jordan_fan88@outlook.com", joined: "2025-11-05", lastOpen: "1 day ago", orders: 1, spent: "$250", status: "active" },
    { email: "hypebeast_99@me.com", joined: "2025-11-20", lastOpen: "Never", orders: 0, spent: "$0", status: "active" },
    { email: "collector_eric@yahoo.com", joined: "2025-08-30", lastOpen: "3 mins ago", orders: 12, spent: "$4,800", status: "vip" },
    { email: "sarah_k@gmail.com", joined: "2025-12-01", lastOpen: "1 week ago", orders: 2, spent: "$420", status: "active" }
];

// ── STATE ──
let activePage = 'flows';
let currentTemplateIndex = 0;
let currentDevice = 'desktop';

// ── NAVIGATION ──
function showPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
    document.getElementById(pageId + 'Page').classList.add('show');

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    activePage = pageId;
    window.location.hash = pageId;

    if (pageId === 'flows') renderFlows();
    if (pageId === 'builder') initBuilder();
    if (pageId === 'analytics') {
        if (typeof renderCharts === 'function') renderCharts('7');
    }
    if (pageId === 'subs') renderSubs();
}

// ── FLOWS ──
function renderFlows() {
    const list = document.getElementById('flowsList');
    if (!list) return;

    list.innerHTML = FLOWS.map(f => `
        <div class="flow-card ${f.active ? 'active-flow' : ''}" style="--flow-color: ${f.color}">
            <div class="flow-icon" style="background: ${f.color}15; color: ${f.color}">
                <i class="fa-solid ${getFlowIcon(f.trigger)}"></i>
            </div>
            <div class="flow-info">
                <div class="flow-name">${f.name}</div>
                <div class="flow-desc">${f.desc}</div>
                <div class="flow-trigger"><i class="fa-solid fa-bolt"></i> Trigger: ${f.trigger}</div>
            </div>
            <div class="flow-stats">
                <div class="flow-sent">${f.sent}</div>
                <div class="flow-rate rate-${parseFloat(f.rate) > 30 ? 'good' : 'mid'}">${f.rate} Open</div>
            </div>
            <div class="flow-toggle-wrap">
                <div class="toggle ${f.active ? 'on' : ''}" onclick="toggleFlow(${f.id}, event)"></div>
                <div class="toggle-label">${f.active ? 'Active' : 'Paused'}</div>
            </div>
        </div>
    `).join('');
}

function getFlowIcon(trigger) {
    const icons = {
        signup: 'fa-user-plus',
        abandoned_cart: 'fa-cart-shopping',
        order_placed: 'fa-receipt',
        order_shipped: 'fa-truck-fast',
        out_for_delivery: 'fa-map-location-dot',
        delivered: 'fa-envelope-circle-check'
    };
    return icons[trigger] || 'fa-envelope';
}

function toggleFlow(id, e) {
    e.stopPropagation();
    const flow = FLOWS.find(f => f.id === id);
    if (!flow) return;
    flow.active = !flow.active;
    showToast(`${flow.name} ${flow.active ? 'activated' : 'paused'}.`, flow.active ? 'success' : 'warn');
    renderFlows();
}

// ── BUILDER ──
function initBuilder() {
    const tList = document.getElementById('templateList');
    if (!tList) return;

    tList.innerHTML = TEMPLATES.map((t, i) => `
        <div class="template-item ${i === currentTemplateIndex ? 'active' : ''}" onclick="loadTemplate(${i})">
            <div class="template-name">${t.name}</div>
            <div class="template-type">${t.type}</div>
        </div>
    `).join('');

    loadTemplate(currentTemplateIndex);
}

function loadTemplate(index) {
    currentTemplateIndex = index;
    const t = TEMPLATES[index];

    document.getElementById('builderFlowName').textContent = `Editing: ${t.name}`;
    document.getElementById('emailSubject').value = t.subject;
    document.getElementById('emailHeadline').value = t.headline;
    document.getElementById('emailBody').value = t.body;
    document.getElementById('emailBtnText').value = t.btn;
    document.getElementById('showProducts').value = t.showProducts;

    document.querySelectorAll('.template-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    updatePreview();
}

function updatePreview() {
    const frame = document.getElementById('emailPreviewContent');
    if (!frame) return;

    const headline = document.getElementById('emailHeadline').value;
    const body = document.getElementById('emailBody').value;
    const btnText = document.getElementById('emailBtnText').value;
    const showProducts = document.getElementById('showProducts').value;
    const accentColor = document.querySelector('.color-swatch.selected')?.style.background || 'var(--accent)';

    let productsHtml = '';
    if (showProducts === 'yes') {
        productsHtml = `
            <div class="email-product-grid">
                <div class="product-item">
                    <img src="products/jordan-1-ow-alaska.png" class="product-img">
                    <div class="product-name">OW x Air Jordan 1 "Alaska"</div>
                    <div class="product-price">$1,647</div>
                </div>
                <div class="product-item">
                    <img src="products/godspeed-surf-day.png" class="product-img">
                    <div class="product-name">Godspeed Surf Day T-Shirt</div>
                    <div class="product-price">$100</div>
                </div>
            </div>
        `;
    }

    frame.innerHTML = `
        <div class="email-header-bar">
            <div class="email-logo">BACK<span>DOOR</span></div>
        </div>
        <div class="email-body-content">
            <h1 class="email-headline">${headline}</h1>
            <p class="email-text">${body.replace(/\n/g, '<br>')}</p>
            <a href="#" class="email-button" style="background: #000; color: ${accentColor}">${btnText}</a>
        </div>
        ${productsHtml}
        <div class="email-footer-bar">
            ${document.getElementById('footerText')?.value || 'Backdoor · Authenticated Sneakers'}
            <br>
            Unsubscribe · View in Browser
        </div>
    `;
}

function setDevice(device) {
    const frame = document.getElementById('emailFrame');
    currentDevice = device;
    frame.className = `email-frame ${device}`;
    document.getElementById('desktopBtn').classList.toggle('active', device === 'desktop');
    document.getElementById('mobileBtn').classList.toggle('active', device === 'mobile');
}

function insertVar(v) {
    const body = document.getElementById('emailBody');
    const start = body.selectionStart;
    const end = body.selectionEnd;
    const text = body.value;
    body.value = text.substring(0, start) + v + text.substring(end);
    updatePreview();
    body.focus();
}

function setColor(c, btn) {
    if (btn) {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
    }
    updatePreview();
}

// ── ANALYTICS ──
function renderPerfTable() {
    const tbody = document.getElementById('perfTableBody');
    if (!tbody) return;

    tbody.innerHTML = FLOWS.map(f => `
        <tr>
            <td><strong>${f.name}</strong></td>
            <td>${f.sent}</td>
            <td style="color:var(--blue)">${f.rate}</td>
            <td style="color:var(--purple)">${(parseFloat(f.rate) * 0.12).toFixed(1)}%</td>
            <td style="color:var(--green)">$${(parseInt(f.sent) * 0.85).toFixed(0)}</td>
        </tr>
    `).join('');
}

function setAnaFilter(days, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
    btn.classList.add('active-filter');
    renderCharts(days);
}

// ── SUBSCRIBERS ──
function renderSubs() {
    const tbody = document.getElementById('subTableBody');
    if (!tbody) return;

    tbody.innerHTML = SUBSCRIBERS.map(s => `
        <tr>
            <td>
                <div style="font-weight:700">${s.email}</div>
                <div style="font-size:11px;color:var(--text3)">Customer ID: #${Math.floor(Math.random() * 9000) + 1000}</div>
            </td>
            <td>${s.joined}</td>
            <td>${s.lastOpen}</td>
            <td>${s.orders}</td>
            <td><span class="sub-tag tag-${s.status}">${s.status.toUpperCase()}</span></td>
        </tr>
    `).join('');
}

function filterSubs(segment, btn) {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active-seg'));
    btn.classList.add('active-seg');
    // Simulation: filtering just updates list visual order
    SUBSCRIBERS.sort(() => Math.random() - 0.5);
    renderSubs();
}

function searchSubs() {
    const q = document.getElementById('subSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#subTableBody tr');
    rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
    });
}

// ── UTILS ──
function showToast(msg, type = 'accent') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(100%)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

function openNewFlowModal() {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    title.textContent = "CREATE NEW AUTOMATION";
    content.innerHTML = `
        <div class="setting-group">
            <label class="setting-label">Flow Name</label>
            <input type="text" class="setting-input" placeholder="e.g. VIP Re-engagement">
        </div>
        <div class="setting-group">
            <label class="setting-label">Trigger Event</label>
            <select class="setting-select">
                <option value="signup">New Account</option>
                <option value="order">Order Success</option>
                <option value="high_value">High Value Order (>$500)</option>
                <option value="no_purchase">No purchase for 30 days</option>
            </select>
        </div>
        <div class="modal-footer">
            <button class="btn-ghost" onclick="closeModal()">Cancel</button>
            <button class="btn-primary" onclick="confirmNewFlow()">Create Flow</button>
        </div>
    `;
    overlay.classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

function confirmNewFlow() {
    showToast("Flow created and added to dashboard! 🚀", "success");
    closeModal();
}

function saveTemplate() { showToast("Template saved and synced.", "success"); }
function sendTestEmail() {
    const addr = document.getElementById('testEmailAddr')?.value || "admin@backdoor.com";
    showToast(`Test email sent to ${addr}! 📬`, "info");
}
function activateTemplate() { showToast("Template activated and live in flow.", "success"); }
function sendBroadcast() { showToast("Broadcast scheduled for 2,104 recipients.", "info"); }

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
    // Check initial tab
    const hash = window.location.hash.replace('#', '');
    if (['flows', 'builder', 'analytics', 'subs', 'settings'].includes(hash)) {
        showPage(hash, document.querySelector(`.nav-tab[onclick*="${hash}"]`));
    } else {
        renderFlows();
    }
});
