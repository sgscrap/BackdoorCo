import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initAnalytics();
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

let revenueChartInst = null;
let statusChartInst = null;
let categoryChartInst = null;

function initAnalytics() {
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snap => {
        const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById('ordersBadge').textContent = orders.filter(o => o.status === 'pending').length;
        updateMetrics(orders);
        renderRevenueChart(orders);
        renderStatusChart(orders);
    });

    onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), snap => {
        const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById('productsBadge').textContent = products.length;
        renderTopProducts(products);
        renderCategoryChart(products);
    });
}

function updateMetrics(orders) {
    const total = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const items = orders.reduce((s, o) => s + (o.items?.length || 1), 0);
    const avg = orders.length ? total / orders.length : 0;

    document.getElementById('totalRev').textContent = '$' + total.toFixed(2);
    document.getElementById('avgOrder').textContent = '$' + avg.toFixed(2);
    document.getElementById('totalItems').textContent = items;
    document.getElementById('convRate').textContent = orders.length > 0
        ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100) + '%'
        : '0%';
}

function renderRevenueChart(orders) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = new Array(12).fill(0);
    orders.forEach(o => {
        const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        if (d && d.getMonth) data[d.getMonth()] += parseFloat(o.total) || 0;
    });

    if (revenueChartInst) revenueChartInst.destroy();
    revenueChartInst = new Chart(document.getElementById('revenueChart'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue',
                data,
                backgroundColor: 'rgba(163,230,53,0.3)',
                borderColor: '#a3e635',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 }, callback: v => '$' + v } }
            }
        }
    });
}

function renderStatusChart(orders) {
    const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => { if (counts.hasOwnProperty(o.status)) counts[o.status]++; });

    if (statusChartInst) statusChartInst.destroy();
    statusChartInst = new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#f59e0b', '#3b82f6', '#6366f1', '#a3e635', '#ef4444'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, padding: 16 } } }
        }
    });
}

function renderTopProducts(products) {
    const container = document.getElementById('topProducts');
    const sorted = [...products].sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, 5);
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No products yet.</p>';
        return;
    }
    container.innerHTML = sorted.map((p, i) => `
        <div class="activity-item">
            <span style="font-size:0.78rem;font-weight:700;color:var(--green);width:20px">#${i + 1}</span>
            <div class="activity-content">
                <div class="activity-text"><strong>${p.name}</strong></div>
                <div class="activity-time">$${(parseFloat(p.price) || 0).toFixed(2)} · ${p.stock || 0} in stock</div>
            </div>
        </div>
    `).join('');
}

function renderCategoryChart(products) {
    const cats = {};
    products.forEach(p => { cats[p.category || 'Other'] = (cats[p.category || 'Other'] || 0) + 1; });

    if (categoryChartInst) categoryChartInst.destroy();
    categoryChartInst = new Chart(document.getElementById('categoryChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(cats),
            datasets: [{
                data: Object.values(cats),
                backgroundColor: ['#a3e635', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, padding: 16 } } }
        }
    });
}
