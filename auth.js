/* ══════════════════════════════════════════
   BACKDOOR — GLOBAL AUTH & NAV STATE JS
   Handles Firebase User Session & Nav Updates across all pages
══════════════════════════════════════════ */

let globalUser = null;
let globalProfile = null;
let globalWishlist = [];

function initGlobalAuth() {
    if (!window.firebaseConfig) return;
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    auth.onAuthStateChanged(async (user) => {
        globalUser = user;
        if (user) {
            try {
                const snap = await db.collection('users').doc(user.uid).get();
                globalProfile = snap.exists ? snap.data() : null;
                globalWishlist = globalProfile?.wishlist || [];
            } catch (e) {
                console.error("Global auth profile load error:", e);
            }
        } else {
            globalProfile = null;
            globalWishlist = [];
        }
        updateGlobalNavUI();
    });
}

function updateGlobalNavUI() {
    // Look for the auth button in the navbar Right area
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    // Remove existing auth buttons or user menus
    const existingSignBtn = navRight.querySelector('.btn-signup-nav');
    const existingUserBtn = navRight.querySelector('.nav-user-btn');
    if (existingSignBtn) existingSignBtn.remove();
    if (existingUserBtn) existingUserBtn.remove();

    if (globalUser) {
        // Logged In State -> Show Avatar Button linking to Accounts
        const first = globalProfile?.first || globalUser.displayName?.split(' ')[0] || 'User';
        const initials = first[0]?.toUpperCase() || 'U';

        const userBtn = document.createElement('button');
        userBtn.className = 'nav-user-btn';
        userBtn.title = 'My Account';
        userBtn.onclick = () => window.location.href = 'accounts.html';
        userBtn.innerHTML = `<div class="nav-avatar">${initials}</div>`;
        
        // Insert before the cart button if possible, else append
        const cartBtn = document.getElementById('cartButton');
        if (cartBtn) {
            navRight.insertBefore(userBtn, cartBtn.nextSibling); // put after cart
        } else {
            navRight.appendChild(userBtn);
        }

        // Update wishlist behavior
        const wishBtn = navRight.querySelector('.fa-heart')?.parentElement;
        if (wishBtn) {
            wishBtn.onclick = () => window.location.href = 'accounts.html#wishlist';
            wishBtn.title = 'View Wishlist';
        }

    } else {
        // Logged Out State -> Show Sign In Button
        const signBtn = document.createElement('button');
        signBtn.className = 'btn-signup-nav';
        signBtn.textContent = 'Sign In';
        signBtn.onclick = () => window.location.href = 'accounts.html';
        
        navRight.appendChild(signBtn);
        
        // Update wishlist behavior
        const wishBtn = navRight.querySelector('.fa-heart')?.parentElement;
        if (wishBtn) {
            wishBtn.onclick = () => {
                if(typeof showToast === 'function') showToast('Sign in to view wishlist', 'info');
                else window.location.href = 'accounts.html';
            };
        }
    }
}

// Add CSS for the new nav avatar
document.head.insertAdjacentHTML('beforeend', `
<style>
.nav-user-btn {
    background: none;
    border: none;
    padding: 0;
    margin-left: 12px;
    cursor: pointer;
    border-radius: 50%;
    transition: transform 0.2s ease;
}
.nav-user-btn:hover {
    transform: scale(1.05);
}
.nav-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    border: 2px solid transparent;
}
</style>
`);

document.addEventListener('DOMContentLoaded', initGlobalAuth);
