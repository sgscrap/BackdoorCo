import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initOrders();
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

let allOrders = [];
let currentFilter = 'all';

function initOrders() {
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snap => {
        allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById('ordersBadge').textContent = allOrders.filter(o => o.status === 'pending').length;
        renderOrders();
    });

    onSnapshot(collection(db, 'products'), snap => {
        document.getElementById('productsBadge').textContent = snap.size;
    });
}

function renderOrders() {
    let filtered = currentFilter === 'all' ? [...allOrders] : allOrders.filter(o => o.status === currentFilter);
    const tbody = document.getElementById('ordersBody');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(o => `
        <tr>
            <td><span class="order-id-cell">${o.orderId || o.id.slice(0, 8)}</span></td>
            <td>${o.customer?.name || o.customerName || '—'}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${o.items?.length || 1} item(s)</td>
            <td><strong>$${(parseFloat(o.total) || 0).toFixed(2)}</strong></td>
            <td>
                <select class="status-select" onchange="updateStatus('${o.id}', this.value)">
                    ${['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s =>
        `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('')}
                </select>
            </td>
            <td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(o.createdAt)}</td>
            <td><span class="pill ${o.status}">${o.status}</span></td>
        </tr>
    `).join('');
}

window.updateStatus = async (id, status) => {
    try {
        await updateDoc(doc(db, 'orders', id), { status, updatedAt: new Date() });
        showToast(`Order updated to ${status}`);
    } catch (err) {
        showToast('Error updating order', true);
    }
};

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderOrders();
    });
});

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.className = isError ? 'toast error show' : 'toast show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}
