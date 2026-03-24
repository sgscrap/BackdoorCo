import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initDashboard();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'index.html');
});

function initDashboard() {
    // ── PRODUCTS ── no orderBy so no index needed
    onSnapshot(collection(db, 'products'), snap => {
        const count = snap.size;
        document.getElementById('productsVal').textContent = count;
        document.getElementById('productsBadge').textContent = count;

        // Inventory spotlight: top 3 low-stock items
        const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderInventorySpotlight(products);
    });

    // ── ORDERS ──
    onSnapshot(collection(db, 'orders'), snap => {
        const orders = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return tb - ta;
            });

        document.getElementById('ordersVal').textContent = orders.length;

        const pending = orders.filter(o => o.status === 'pending').length;
        document.getElementById('ordersBadge').textContent = pending || '';

        const revenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        document.getElementById('revenueVal').textContent = '$' + revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        renderRecentOrders(orders.slice(0, 5));
        renderActivity(orders.slice(0, 6));
        renderChart(orders);
    });

    // ── CUSTOMERS ──
    onSnapshot(collection(db, 'customers'), snap => {
        document.getElementById('customersVal').textContent = snap.size;
    });
}

// ============================================
// INVENTORY SPOTLIGHT
// ============================================
function renderInventorySpotlight(products) {
    const el = document.getElementById('inventorySpotlight');
    if (!el) return;

    // Sort by stock ascending — lowest first
    const sorted = [...products].sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 4);

    if (sorted.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted);padding:12px 0;font-size:0.82rem;">No products yet.</p>';
        return;
    }

    el.innerHTML = sorted.map(p => {
        const stock = p.stock || 0;
        const isLow = stock < 5;
        return `
            <div class="spotlight-item">
                <div class="spotlight-img">
                    ${p.image
                ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
                : `<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:6px;display:flex;align-items:center;justify-content:center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                           </div>`
            }
                </div>
                <div class="spotlight-info">
                    <span class="spotlight-name">${p.name}</span>
                    <span class="spotlight-sku">${p.sku || ''}</span>
                </div>
                <span class="spotlight-stock ${isLow ? 'low' : ''}">${stock} left</span>
            </div>`;
    }).join('');
}

// ============================================
// RECENT ORDERS
// ============================================
function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state-row">No orders yet.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><span class="order-id-cell">${o.orderId || o.id.slice(0, 8)}</span></td>
            <td>${o.customer?.name || o.customerName || '—'}</td>
            <td><strong>$${(parseFloat(o.total) || 0).toFixed(2)}</strong></td>
            <td><span class="pill ${o.status}">${o.status}</span></td>
            <td style="color:var(--text-muted);font-size:0.75rem">${formatDate(o.createdAt)}</td>
        </tr>
    `).join('');
}

// ============================================
// ACTIVITY FEED
// ============================================
function renderActivity(orders) {
    const list = document.getElementById('activityList');
    if (orders.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">No recent activity.</p>';
        return;
    }
    const colors = { pending: 'yellow', processing: 'blue', shipped: 'blue', delivered: 'green', cancelled: 'red' };
    list.innerHTML = orders.map(o => `
        <div class="activity-item">
            <div class="activity-dot ${colors[o.status] || 'green'}"></div>
            <div class="activity-content">
                <div class="activity-text">Order <strong>${o.orderId || o.id.slice(0, 8)}</strong> — ${o.status}</div>
                <div class="activity-time">${formatDate(o.createdAt)}</div>
            </div>
        </div>
    `).join('');
}

// ============================================
// REVENUE CHART
// ============================================
let chartInstance = null;

function renderChart(orders) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRev = new Array(12).fill(0);

    orders.forEach(o => {
        const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
        if (d && !isNaN(d)) {
            monthlyRev[d.getMonth()] += parseFloat(o.total) || 0;
        }
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue',
                data: monthlyRev,
                borderColor: '#a3e635',
                backgroundColor: 'rgba(163,230,53,0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#a3e635',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 }, callback: v => '$' + v } }
            }
        }
    });
}

// ============================================
// UTILS
// ============================================
function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
