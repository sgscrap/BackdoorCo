import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initOffers();
});

document.getElementById('logoutBtn').addEventListener('click', () =>
    signOut(auth).then(() => window.location.href = 'index.html'));

let allOffers = [];
let currentFilter = 'all';
let currentOfferId = null;

function initOffers() {
    onSnapshot(query(collection(db, 'offers'), orderBy('createdAt', 'desc')), snap => {
        allOffers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.getElementById('offersBadge').textContent = allOffers.filter(o => o.status === 'pending').length;
        renderOffers();
    });
    onSnapshot(collection(db, 'products'), snap =>
        document.getElementById('productsBadge').textContent = snap.size);
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snap =>
        document.getElementById('ordersBadge').textContent =
            snap.docs.filter(d => d.data().status === 'pending').length);
}

function renderOffers() {
    const filtered = currentFilter === 'all'
        ? [...allOffers]
        : allOffers.filter(o => o.status === currentFilter);
    const tbody = document.getElementById('offersBody');

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-row">No ${currentFilter === 'all' ? '' : currentFilter + ' '}offers.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(o => {
        const pct = o.askingPrice
            ? ((o.offerAmount / o.askingPrice) * 100 - 100).toFixed(1)
            : null;
        const pctStr = pct !== null ? (pct >= 0 ? `+${pct}%` : `${pct}%`) : '';
        const offerColor = o.offerAmount >= o.askingPrice ? '#22c55e' : '#ef4444';
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    ${o.productImage ? `<img src="${o.productImage}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'">` : ''}
                    <div>
                        <div style="font-weight:600;font-size:0.82rem">${o.productName || '—'}</div>
                        ${o.productSku ? `<div style="font-size:0.72rem;color:var(--text-secondary)">${o.productSku}</div>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:500;font-size:0.84rem">${o.customerName || '—'}</div>
                <div style="font-size:0.72rem;color:var(--text-secondary)">${o.customerEmail || ''}</div>
            </td>
            <td><strong>$${(parseFloat(o.askingPrice) || 0).toFixed(2)}</strong></td>
            <td>
                <strong style="color:${offerColor}">$${(parseFloat(o.offerAmount) || 0).toFixed(2)}</strong>
                ${pctStr ? `<div style="font-size:0.72rem;color:var(--text-secondary)">${pctStr}</div>` : ''}
            </td>
            <td style="font-size:0.8rem">${o.size || '—'}</td>
            <td><span class="pill ${o.status}">${o.status}</span></td>
            <td style="font-size:0.75rem;color:var(--text-secondary)">${formatDate(o.createdAt)}</td>
            <td><button class="action-btn" onclick="openModal('${o.id}')">Details</button></td>
        </tr>`;
    }).join('');
}

window.openModal = (id) => {
    currentOfferId = id;
    const o = allOffers.find(x => x.id === id);
    if (!o) return;

    document.getElementById('modalProductName').textContent = o.productName || 'Offer Details';

    const pct = o.askingPrice
        ? ((o.offerAmount / o.askingPrice) * 100 - 100).toFixed(1)
        : 0;
    const offerColor = o.offerAmount >= o.askingPrice ? '#22c55e' : '#ef4444';

    document.getElementById('modalBody').innerHTML = `
        <div style="display:flex;gap:16px;padding:20px 28px;border-bottom:1px solid var(--border)">
            ${o.productImage ? `<img src="${o.productImage}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.style.display='none'">` : ''}
            <div style="padding-top:4px">
                <div style="font-weight:700;font-size:1rem">${o.productName || '—'}</div>
                ${o.productSku ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:3px">SKU: ${o.productSku}</div>` : ''}
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px">Size: ${o.size || '—'} · Brand: ${o.brand || '—'}</div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px 28px;border-bottom:1px solid var(--border)">
            <div style="background:var(--bg-hover);padding:14px;border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Asking Price</div>
                <div style="font-size:1.4rem;font-weight:700">$${(parseFloat(o.askingPrice) || 0).toFixed(2)}</div>
            </div>
            <div style="background:var(--bg-hover);padding:14px;border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Customer Offer</div>
                <div style="font-size:1.4rem;font-weight:700;color:${offerColor}">$${(parseFloat(o.offerAmount) || 0).toFixed(2)}</div>
                <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">${pct >= 0 ? '+' : ''}${pct}% of asking</div>
            </div>
        </div>
        <div style="padding:16px 28px;border-bottom:1px solid var(--border)">
            <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Customer</div>
            <div style="font-weight:600">${o.customerName || '—'}</div>
            <div style="font-size:0.83rem;color:var(--text-secondary);margin-top:2px">${o.customerEmail || ''}</div>
            ${o.customerPhone ? `<div style="font-size:0.83rem;color:var(--text-secondary);margin-top:2px">${o.customerPhone}</div>` : ''}
        </div>
        ${o.message ? `
        <div style="padding:16px 28px;border-bottom:1px solid var(--border)">
            <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Message</div>
            <p style="margin:0;font-size:0.88rem;line-height:1.6">${o.message}</p>
        </div>` : ''}
        ${o.counterAmount ? `
        <div style="padding:16px 28px;border-bottom:1px solid var(--border)">
            <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Counter Offer Sent</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--accent-orange)">$${parseFloat(o.counterAmount).toFixed(2)}</div>
        </div>` : ''}
        <div style="padding:12px 28px"><span class="pill ${o.status}">${o.status}</span></div>
    `;

    const footer = document.getElementById('modalFooter');
    if (o.status === 'pending') {
        footer.innerHTML = `
            <button class="btn-primary" style="flex:none;padding:10px 20px;border-radius:8px;font-size:0.88rem" onclick="acceptOffer()">Accept</button>
            <div style="display:flex;gap:8px;flex:1">
                <input type="number" id="counterInput" placeholder="Counter $" step="0.01" min="0"
                    style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-hover);color:var(--text-primary);font-family:inherit;font-size:0.88rem;outline:none">
                <button class="btn-secondary" style="padding:9px 16px;border-radius:8px;font-size:0.84rem;white-space:nowrap" onclick="counterOffer()">Counter</button>
            </div>
            <button style="padding:10px 16px;border:1px solid rgba(255,77,77,0.3);border-radius:8px;background:transparent;cursor:pointer;font-weight:600;font-size:0.84rem;color:var(--accent-red);font-family:inherit" onclick="rejectOffer()">Reject</button>
        `;
    } else {
        footer.innerHTML = `<button class="btn-secondary" style="padding:10px 20px;border-radius:8px" onclick="closeModal()">Close</button>`;
    }

    document.getElementById('offerModal').classList.add('open');
};

window.closeModal = () => {
    document.getElementById('offerModal').classList.remove('open');
    currentOfferId = null;
};

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('offerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('offerModal')) closeModal();
});

window.acceptOffer = async () => {
    if (!currentOfferId) return;
    try {
        await updateDoc(doc(db, 'offers', currentOfferId), { status: 'accepted', updatedAt: new Date() });
        showToast('Offer accepted');
        closeModal();
    } catch { showToast('Error updating offer', true); }
};

window.rejectOffer = async () => {
    if (!currentOfferId) return;
    if (!confirm('Reject this offer?')) return;
    try {
        await updateDoc(doc(db, 'offers', currentOfferId), { status: 'rejected', updatedAt: new Date() });
        showToast('Offer rejected');
        closeModal();
    } catch { showToast('Error updating offer', true); }
};

window.counterOffer = async () => {
    if (!currentOfferId) return;
    const amount = parseFloat(document.getElementById('counterInput')?.value);
    if (!amount || amount <= 0) { showToast('Enter a valid counter amount', true); return; }
    try {
        await updateDoc(doc(db, 'offers', currentOfferId), {
            status: 'countered', counterAmount: amount, updatedAt: new Date()
        });
        showToast(`Counter offer of $${amount.toFixed(2)} sent`);
        closeModal();
    } catch { showToast('Error sending counter', true); }
};

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderOffers();
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
