/* ══════════════════════════════════════════
   BACKDOOR — GLOBAL AUTH & NAV STATE JS
   Handles Firebase User Session & Nav Updates across all pages
══════════════════════════════════════════ */

window.globalUser = null;
window.globalProfile = null;
window.globalWishlist = [];

function initGlobalAuth() {
    if (!window.firebaseConfig) return;
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    auth.onAuthStateChanged(async (user) => {
        window.globalUser = user;
        if (user) {
            try {
                // Real-time profile listener
                db.collection('users').doc(user.uid).onSnapshot((snap) => {
                    window.globalProfile = snap.exists ? snap.data() : null;
                    window.globalWishlist = window.globalProfile?.wishlist || [];
                    
                    updateGlobalNavUI();
                    
                    // Notify other scripts
                    window.dispatchEvent(new CustomEvent('backdoor-auth-changed', { 
                        detail: { user: window.globalUser, profile: window.globalProfile } 
                    }));

                    if (typeof updateWishlistBtnUI === 'function') updateWishlistBtnUI();
                    if (typeof renderProducts === 'function') renderProducts();
                    if (typeof renderMostWanted === 'function') renderMostWanted();
                }, (err) => {
                    console.warn("Global profile listener error:", err);
                    updateGlobalNavUI(); // Fallback to show navbar even if sync fails
                });
            } catch (e) {
                console.error("Global auth profile listener error:", e);
            }
        } else {
            window.globalProfile = null;
            window.globalWishlist = [];
            updateGlobalNavUI();
            
            window.dispatchEvent(new CustomEvent('backdoor-auth-changed', { 
                detail: { user: null, profile: null } 
            }));

            if (typeof updateWishlistBtnUI === 'function') updateWishlistBtnUI();
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderMostWanted === 'function') renderMostWanted();
        }
    });
}

function updateGlobalNavUI() {
    // Look for the auth button in the navbar icons group
    const navRight = document.querySelector('.nav-icons-group') || document.querySelector('.nav-right');
    if (!navRight) return;

    // Remove existing auth buttons or user menus
    const existingSignBtn = navRight.querySelector('.btn-signup-nav');
    const existingUserBtn = navRight.querySelector('.nav-user-btn');
    if (existingSignBtn) existingSignBtn.remove();
    if (existingUserBtn) existingUserBtn.remove();

    if (window.globalUser) {
        // Logged In State -> Show Avatar Dropdown
        const first = window.globalProfile?.first || window.globalUser.displayName?.split(' ')[0] || 'User';
        const initials = first[0]?.toUpperCase() || 'U';
        const email = window.globalProfile?.email || window.globalUser.email || '';

        const wrapper = document.createElement('div');
        wrapper.className = 'user-menu-wrap';
        wrapper.id = 'globalUserMenu';
        
        wrapper.innerHTML = `
            <button type="button" class="user-avatar-btn" onclick="document.getElementById('globalUserDropdown').classList.toggle('open')" id="globalUserAvatarBtn" aria-haspopup="true" aria-expanded="false">
                <div class="user-avatar" id="navAvatar">${initials}</div>
                <span id="navName">${first}</span>
                <i class="fa-solid fa-chevron-down chevron-icon"></i>
            </button>
            <div class="user-dropdown" id="globalUserDropdown">
                <div class="dropdown-header">
                    <p id="dropName">${first}</p>
                    <span id="dropEmail">${email}</span>
                </div>
                <button type="button" class="dropdown-item" onclick="window.location.href='accounts.html'"><i class="fa-solid fa-chart-pie"></i> Dashboard</button>
                <button type="button" class="dropdown-item" onclick="window.location.href='accounts.html#orders'"><i class="fa-solid fa-box"></i> My Orders</button>
                <button type="button" class="dropdown-item" onclick="window.location.href='accounts.html#wishlist'"><i class="fa-regular fa-heart"></i> Wishlist</button>
                <button type="button" class="dropdown-item" onclick="window.location.href='accounts.html#profile'"><i class="fa-solid fa-user"></i> Profile</button>
                <button type="button" class="dropdown-item danger" onclick="firebase.auth().signOut(); window.location.reload(); return false;"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
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
        const wishBtn = document.getElementById('navWishlistBtn');
        const countBadge = document.getElementById('wishlistCountBadge');
        if (countBadge) {
            countBadge.textContent = globalWishlist.length;
            countBadge.style.display = globalWishlist.length > 0 ? 'flex' : 'none';
        }
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
        const wishBtn = document.getElementById('navWishlistBtn');
        const countBadge = document.getElementById('wishlistCountBadge');
        if (countBadge) countBadge.style.display = 'none';
        if (wishBtn) {
            wishBtn.onclick = () => {
                if(typeof showToast === 'function') showToast('Sign in to view wishlist', 'info');
                else window.location.href = 'accounts.html';
            };
        }
    }
}

window.toggleWishlist = async (productId) => {
    if (!window.globalUser) {
        if (typeof showToast === 'function') showToast('Sign in to save favorites', 'info');
        else alert('Please sign in to save favorites');
        window.location.href = 'accounts.html';
        return;
    }

    const db = firebase.firestore();
    const userRef = db.collection('users').doc(window.globalUser.uid);
    let newWishlist = [...(window.globalWishlist || [])];

    if (newWishlist.includes(productId)) {
        newWishlist = newWishlist.filter(id => id !== productId);
        if (typeof showToast === 'function') showToast('Removed from favorites');
    } else {
        newWishlist.push(productId);
        if (typeof showToast === 'function') showToast('Added to favorites!');
    }

    try {
        // Use update instead of set to avoid permission issues if doc exists but rules are strict
        await userRef.update({ wishlist: newWishlist });
    } catch (e) {
        if (e.code === 'not-found' || e.message?.includes('No document')) {
            await userRef.set({ wishlist: newWishlist }, { merge: true });
        } else {
            console.error("Wishlist sync error:", e);
            if (typeof showToast === 'function') showToast('Sync failed (Permissions)', 'error');
        }
    }
};

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
    top: calc(100% + 12px);
    right: 0;
    width: 220px;
    background: var(--bg2, #111);
    border: 1px solid var(--border2, #2a2a2a);
    border-radius: 14px;
    padding: 8px;
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    z-index: 1200;
}
.user-dropdown.open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: all;
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

document.addEventListener('DOMContentLoaded', () => {
    initGlobalAuth();

    // ── navSearch wiring ──
    const navSearch = document.getElementById('navSearch');
    if (navSearch) {
        // Pre-fill from URL ?search= param on the shop page
        const sp = new URLSearchParams(window.location.search);
        const term = sp.get('search');
        if (term) navSearch.value = term;

        navSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && navSearch.value.trim()) {
                const q = encodeURIComponent(navSearch.value.trim());
                // If already on shop-all, update shopSearch too
                const shopInput = document.getElementById('shopSearch');
                if (shopInput) {
                    shopInput.value = navSearch.value.trim();
                    shopInput.dispatchEvent(new Event('input'));
                } else {
                    window.location.href = `shop-all.html?search=${q}`;
                }
            }
        });
    }
});
