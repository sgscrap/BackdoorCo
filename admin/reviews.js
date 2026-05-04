import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initReviews();
});

document.getElementById('logoutBtn').addEventListener('click', () =>
    signOut(auth).then(() => window.location.href = 'index.html'));

let allReviews = [];
let currentFilter = 'all';

function initReviews() {
    onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), snap => {
        allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderReviews();
    });
    onSnapshot(collection(db, 'products'), snap =>
        document.getElementById('productsBadge').textContent = snap.size);
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snap =>
        document.getElementById('ordersBadge').textContent =
            snap.docs.filter(d => d.data().status === 'pending').length);
    onSnapshot(collection(db, 'offers'), snap =>
        document.getElementById('offersBadge').textContent =
            snap.docs.filter(d => d.data().status === 'pending').length);
}

function renderReviews() {
    const filtered = currentFilter === 'all'
        ? [...allReviews]
        : allReviews.filter(r => String(r.rating) === currentFilter);
    const tbody = document.getElementById('reviewsBody');

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-row">No reviews found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const initial = (r.name || '?')[0].toUpperCase();
        const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
        const safeComment = (r.comment || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeName = (r.name || '—').replace(/'/g, "\\'");
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    ${r.image
                        ? `<img src="${r.image}" style="width:36px;height:36px;object-fit:cover;border-radius:50%;flex-shrink:0" onerror="this.style.display='none'">`
                        : `<div style="width:36px;height:36px;border-radius:50%;background:var(--bg-hover);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;border:1px solid var(--border)">${initial}</div>`}
                    <span style="font-weight:600;font-size:0.84rem">${r.name || '—'}</span>
                </div>
            </td>
            <td style="font-size:0.82rem;color:var(--text-secondary);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.productName || '—'}</td>
            <td>
                <div style="color:#f59e0b;letter-spacing:1px;font-size:0.9rem">${stars}</div>
                <div style="font-size:0.72rem;color:var(--text-secondary)">${r.rating || 0}/5</div>
            </td>
            <td style="max-width:260px">
                <div style="font-size:0.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeComment || '—'}</div>
            </td>
            <td style="font-size:0.75rem;color:var(--text-secondary);white-space:nowrap">${formatDate(r.createdAt)}</td>
            <td>
                <button class="action-btn" style="color:var(--accent-red);border-color:rgba(255,77,77,0.3)"
                    onclick="deleteReview('${r.id}', '${safeName}')">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

window.deleteReview = async (id, name) => {
    if (!confirm(`Delete review by ${name}? This cannot be undone.`)) return;
    try {
        await deleteDoc(doc(db, 'reviews', id));
        showToast('Review deleted');
    } catch { showToast('Error deleting review', true); }
};

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderReviews();
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
