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
        // Logged In State -> Show Avatar Dropdown
        const first = globalProfile?.first || globalUser.displayName?.split(' ')[0] || 'User';
        const initials = first[0]?.toUpperCase() || 'U';
        const email = globalProfile?.email || globalUser.email || '';

        const wrapper = document.createElement('div');
        wrapper.className = 'user-menu-wrap';
        wrapper.id = 'globalUserMenu';
        
        wrapper.innerHTML = `
            <div class="user-avatar-btn" onclick="document.getElementById('globalUserDropdown').classList.toggle('open')" id="globalUserAvatarBtn">
                <div class="user-avatar" id="navAvatar">${initials}</div>
                <span id="navName">${first}</span>
                <i class="fa-solid fa-chevron-down chevron-icon"></i>
            </div>
            <div class="user-dropdown" id="globalUserDropdown">
                <div class="dropdown-header">
                    <p id="dropName">${first}</p>
                    <span id="dropEmail">${email}</span>
                </div>
                <a class="dropdown-item" href="accounts.html"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
                <a class="dropdown-item" href="accounts.html#orders"><i class="fa-solid fa-box"></i> My Orders</a>
                <a class="dropdown-item" href="accounts.html#wishlist"><i class="fa-regular fa-heart"></i> Wishlist</a>
                <a class="dropdown-item" href="accounts.html#profile"><i class="fa-solid fa-user"></i> Profile</a>
                <a class="dropdown-item danger" href="#" onclick="firebase.auth().signOut(); window.location.reload(); return false;"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
            </div>
        `;
        
        // Insert before the cart button if possible, else append
        const cartBtn = document.getElementById('cartButton');
        if (cartBtn) {
            navRight.insertBefore(wrapper, cartBtn); // put BEFORE cart
        } else {
            navRight.appendChild(wrapper);
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            const drop = document.getElementById('globalUserDropdown');
            const btn = document.getElementById('globalUserAvatarBtn');
            if (drop && drop.classList.contains('open') && !drop.contains(e.target) && (!btn || !btn.contains(e.target))) {
                drop.classList.remove('open');
            }
        });

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
        
        // Insert before cart if available
        const cartBtn = document.getElementById('cartButton');
        if (cartBtn) {
            navRight.insertBefore(signBtn, cartBtn);
        } else {
            navRight.appendChild(signBtn);
        }
        
        // Update wishlist behavior
        var wishBtn = navRight.querySelector('.fa-heart')?.parentElement;
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
.user-menu-wrap {
    position: relative;
    margin-left: 12px;
}
.user-avatar-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px 6px 6px;
    background: var(--bg3, #161616);
    border: 1px solid var(--border2, #2a2a2a);
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.2s;
}
.user-avatar-btn:hover {
    border-color: var(--accent, #c8f65d);
}
.user-avatar {
    width: 32px;
    height: 32px;
    background: var(--accent, #c8f65d);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #000;
}
.user-avatar-btn span {
    font-size: 13px;
    font-weight: 600;
    color: var(--text, #fff);
}
.chevron-icon {
    font-size: 10px;
    color: var(--text3, #444);
}
.user-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 220px;
    background: var(--bg2, #111);
    border: 1px solid var(--border2, #2a2a2a);
    border-radius: 14px;
    padding: 8px;
    display: none;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    z-index: 1000;
}
.user-dropdown.open {
    display: block;
}
.dropdown-header {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border, #222);
    margin-bottom: 6px;
}
.dropdown-header p {
    font-size: 13px;
    font-weight: 700;
    color: var(--text, #fff);
    margin: 0;
}
.dropdown-header span {
    font-size: 11px;
    color: var(--text3, #444);
    margin: 0;
}
.dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text2, #888);
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
}
.dropdown-item:hover {
    background: var(--bg4, #1e1e1e);
    color: var(--text, #fff);
}
.dropdown-item i {
    width: 16px;
    text-align: center;
}
.dropdown-item.danger:hover {
    color: var(--red, #ff4d4d);
    background: rgba(255, 77, 77, 0.08);
}
</style>
`);

document.addEventListener('DOMContentLoaded', initGlobalAuth);
