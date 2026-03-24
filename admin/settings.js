import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    loadSettings();
    loadBadges();
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

function loadBadges() {
    onSnapshot(collection(db, 'products'), snap => {
        document.getElementById('productsBadge').textContent = snap.size;
    });
    onSnapshot(collection(db, 'orders'), snap => {
        document.getElementById('ordersBadge').textContent = snap.docs.filter(d => d.data().status === 'pending').length;
    });
}

async function loadSettings() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'store'));
        if (snap.exists()) {
            const s = snap.data();
            document.getElementById('storeName').value = s.storeName || 'Backdoor';
            document.getElementById('storeUrl').value = s.storeUrl || '';
            document.getElementById('storeDesc').value = s.storeDesc || '';
            document.getElementById('storeEmail').value = s.storeEmail || '';
            document.getElementById('storeCurrency').value = s.currency || 'USD';
            document.getElementById('maintenanceMode').checked = s.maintenanceMode || false;
            document.getElementById('guestCheckout').checked = s.guestCheckout !== false;
            document.getElementById('showStock').checked = s.showStock !== false;
            document.getElementById('emailConfirm').checked = s.emailConfirm !== false;
            document.getElementById('enableReviews').checked = s.enableReviews || false;
            document.getElementById('shippingRate').value = s.shippingRate || 0;
            document.getElementById('freeShipping').value = s.freeShipping || 150;
            document.getElementById('intlShipping').checked = s.intlShipping || false;
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveSettingsBtn');
    btn.innerHTML = '<span>Saving...</span>';
    btn.disabled = true;

    const settings = {
        storeName: document.getElementById('storeName').value,
        storeUrl: document.getElementById('storeUrl').value,
        storeDesc: document.getElementById('storeDesc').value,
        storeEmail: document.getElementById('storeEmail').value,
        currency: document.getElementById('storeCurrency').value,
        maintenanceMode: document.getElementById('maintenanceMode').checked,
        guestCheckout: document.getElementById('guestCheckout').checked,
        showStock: document.getElementById('showStock').checked,
        emailConfirm: document.getElementById('emailConfirm').checked,
        enableReviews: document.getElementById('enableReviews').checked,
        shippingRate: parseFloat(document.getElementById('shippingRate').value) || 0,
        freeShipping: parseFloat(document.getElementById('freeShipping').value) || 150,
        intlShipping: document.getElementById('intlShipping').checked,
        updatedAt: new Date(),
    };

    try {
        await setDoc(doc(db, 'settings', 'store'), settings, { merge: true });
        showToast('Settings saved successfully!');
    } catch (err) {
        showToast('Error saving settings', true);
        console.error(err);
    }

    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes`;
    btn.disabled = false;
});

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.className = isError ? 'toast error show' : 'toast show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}
