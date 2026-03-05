import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initCustomers();
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

let allCustomers = [];

function initCustomers() {
    onSnapshot(query(collection(db, 'customers'), orderBy('createdAt', 'desc')), snap => {
        allCustomers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCustomers();
    });

    onSnapshot(collection(db, 'products'), snap => {
        document.getElementById('productsBadge').textContent = snap.size;
    });
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snap => {
        document.getElementById('ordersBadge').textContent = snap.docs.filter(d => d.data().status === 'pending').length;
    });
}

function renderCustomers() {
    const search = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    let filtered = allCustomers;
    if (search) {
        filtered = filtered.filter(c =>
            (c.name || '').toLowerCase().includes(search) ||
            (c.email || '').toLowerCase().includes(search)
        );
    }

    const tbody = document.getElementById('customersBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">No customers found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td>
                <div class="customer-row">
                    <div class="user-avatar" style="width:28px;height:28px;font-size:0.7rem">${(c.name || c.email || '?')[0].toUpperCase()}</div>
                    <span>${c.name || '—'}</span>
                </div>
            </td>
            <td><span class="customer-email">${c.email || '—'}</span></td>
            <td>${c.orderCount || 0}</td>
            <td><strong>$${(parseFloat(c.totalSpent) || 0).toFixed(2)}</strong></td>
            <td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(c.createdAt)}</td>
        </tr>
    `).join('');
}

document.getElementById('customerSearch')?.addEventListener('input', renderCustomers);

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
