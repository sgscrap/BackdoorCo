import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
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
    // Products listener
    onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), snap => {
        const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById('productsVal').textContent = products.length;
        document.getElementById('productsBadge').textContent = products.length;
    });

    // Orders listener
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snap => {
        const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById('ordersVal').textContent = orders.length;
        document.getElementById('ordersBadge').textContent = orders.filter(o => o.status === 'pending').length;

        const revenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        document.getElementById('revenueVal').textContent = '$' + revenue.toFixed(2);

        renderRecentOrders(orders.slice(0, 5));
        renderActivity(orders.slice(0, 6));
        renderChart(orders);
    });

    // Customers listener
    onSnapshot(query(collection(db, 'customers'), orderBy('createdAt', 'desc')), snap => {
        document.getElementById('customersVal').textContent = snap.size;
    });
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">No orders yet.</td></tr>';
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

function renderChart(orders) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRev = new Array(12).fill(0);

    orders.forEach(o => {
        const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        if (d && d.getMonth) {
            monthlyRev[d.getMonth()] += parseFloat(o.total) || 0;
        }
    });

    new Chart(ctx, {
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

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
