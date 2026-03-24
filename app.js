import { db } from './admin/firebase-config.js';
import {
    collection,
    orderBy,
    onSnapshot,
    query
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
    applyProductOverrides,
    getProductCardImage,
    getProductCardImagePadding,
    getProductCardImageScale,
    getProductImageFit,
    getProductImagePosition,
    mergeCatalogProducts,
    getBackorderLeadTime,
    getProductSizes,
    getTotalStock,
    isBackorder,
    isBackorderOnly,
    isFeatured,
    isHidden,
    isOutOfStock
} from './product-data.js';

let products = [];
let cart = loadCartFromStorage();
let selectedModalSize = '';
let selectedModalBackorder = false;
let selectedModalProduct = null;

const isHomePage = Boolean(document.getElementById('mostWanted'));
const productGrid = document.getElementById('shopAllGrid') || document.getElementById('mwGrid') || document.getElementById('productGrid');
const mwLoading = document.getElementById('mwLoading');
const mwCatalogCount = document.getElementById('mwCatalogCount');
const productModal = document.getElementById('productModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const cartSidebar = document.getElementById('cartSidebar');
const cartCount = document.getElementById('cartCount');

document.addEventListener('DOMContentLoaded', () => {
    initFirebaseSync();
    initGlobalListeners();
    updateCartUI();
    
    // Listen for auth changes to merge carts
    if (window.firebaseConfig && firebase.apps.length) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                mergeCartsOnLogin(user.uid);
            }
        });
    }
});

async function mergeCartsOnLogin(uid) {
    try {
        const snap = await firebase.firestore().collection('users').doc(uid).get();
        if (snap.exists && snap.data().cart) {
            const dbCart = snap.data().cart || [];
            if (dbCart.length > 0) {
                // Merge DB cart with local cart (local takes precedence if duplicates)
                const merged = [...cart];
                dbCart.forEach(dbItem => {
                    const exists = merged.find(i => i.id === dbItem.id && i.size === dbItem.size);
                    if (!exists) merged.push(dbItem);
                });
                cart = merged;
                saveCart();
                updateCartUI();
            }
        }
    } catch(e) { console.warn("Cart merge error:", e); }
}

function getVisibleProducts() {
    return products.filter((product) => product.status === 'active' && !isHidden(product));
}

function getBadgeMeta(product) {
    if (isBackorderOnly(product)) {
        return { label: 'Backorder', className: 'modal-badge modal-badge--featured' };
    }
    if (isOutOfStock(product)) {
        return { label: 'Out of Stock', className: 'modal-badge modal-badge--out' };
    }
    if (isFeatured(product)) {
        return { label: 'Featured', className: 'modal-badge modal-badge--featured' };
    }
    return { label: '', className: 'modal-badge' };
}

function normalizeProduct(doc) {
    return applyProductOverrides({
        id: doc.id,
        ...doc,
        price: Number(doc.price) || 0,
        sizes: getProductSizes(doc)
    });
}

function initFirebaseSync() {
    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

    onSnapshot(productsQuery, (snapshot) => {
        products = mergeCatalogProducts(snapshot.docs.map((doc) => normalizeProduct({ id: doc.id, ...doc.data() })));
        if (isHomePage) renderMostWanted();
    });
}

function renderMostWanted() {
    if (!productGrid || !isHomePage) return;

    const visibleProducts = getVisibleProducts();
    const featuredFirst = [...visibleProducts]
        .sort((left, right) => (
            Number(isFeatured(right)) - Number(isFeatured(left)) ||
            right.price - left.price ||
            (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0)
        ))
        .slice(0, 4);

    if (mwLoading) mwLoading.style.display = 'none';
    productGrid.classList.remove('d-none');
    productGrid.style.display = 'grid';

    productGrid.innerHTML = featuredFirst.map((product, index) => {
        const soldOut = isOutOfStock(product);
        const backorder = isBackorderOnly(product);
        const cardImage = getProductCardImage(product);
        const imageScale = getProductCardImageScale(product);
        const imagePadding = getProductCardImagePadding(product);
        const imageFit = getProductImageFit(product);
        const imagePosition = getProductImagePosition(product);
        const featuredBadge = backorder
            ? '<div class="mw-status-badge">BACKORDER</div>'
            : isFeatured(product)
            ? '<div class="mw-status-badge">FEATURED</div>'
            : '';

        return `
            <div class="mw-card drop-card ${soldOut && !backorder ? 'mw-card--out-of-stock' : ''}" data-id="${product.id}" style="animation-delay:${index * 0.1}s" onclick="openProductModal('${product.id}')">
                <div class="mw-card-img drop-card-img-wrap">
                    <div class="mw-rank new-badge">#${index + 1}</div>
                    ${featuredBadge}
                    ${soldOut && !backorder ? '<div class="mw-sold-overlay sold-out-overlay"><span>OUT OF STOCK</span></div>' : ''}
                    <img src="${cardImage || ''}" alt="${product.name}" loading="${index < 2 ? 'eager' : 'lazy'}" style="object-fit:${imageFit};object-position:${imagePosition};padding:${imagePadding};--product-image-scale:${imageScale};--product-image-hover-scale:${(imageScale + 0.04).toFixed(2)}" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/c8f65d?text=Backdoor'">
                </div>
                <div class="mw-card-info drop-card-info">
                    <p class="mw-card-brand drop-brand">${product.brand || product.category || ''} · ${product.category || 'Deadstock'}</p>
                    <h3 class="mw-card-name drop-name">${product.name}</h3>
                    <div class="mw-price-row drop-bottom">
                        <div class="mw-price-block drop-price-wrap">
                            <span class="mw-ask-label drop-price-label">${backorder ? getBackorderLeadTime(product) : soldOut ? 'Unavailable' : isFeatured(product) ? 'Featured Pick' : 'Lowest Ask'}</span>
                            <span class="mw-price drop-price">$${product.price.toFixed(0)}</span>
                        </div>
                        <div class="actions-row" style="display:flex; gap:8px;">
                            <button class="heart-btn ${window.globalWishlist?.includes(product.id) ? 'wishlisted' : ''}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                                <i class="${window.globalWishlist?.includes(product.id) ? 'fa-solid' : 'fa-regular'} fa-heart" id="wishlist-icon-${product.id}"></i>
                            </button>
                            ${soldOut && !backorder
                                ? '<span class="mw-sold drop-sold-text" style="display:flex;align-items:center;">Sold Out</span>'
                                : `<button class="mw-buy-btn drop-buy-btn" onclick="event.stopPropagation(); openProductModal('${product.id}')">Buy</button>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (mwCatalogCount) mwCatalogCount.textContent = `- ${visibleProducts.length} items`;
}

function initGlobalListeners() {
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
    });

    if (modalClose) modalClose.onclick = closeProductModal;
    if (modalOverlay) modalOverlay.onclick = closeProductModal;

    const cartClose = document.getElementById('cartClose');
    if (cartClose) cartClose.onclick = () => cartSidebar?.classList.remove('active');

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProductModal();
            cartSidebar?.classList.remove('active');
        }
    });

    const navSearch = document.getElementById('navSearch');
    if (navSearch && isHomePage) {
        navSearch.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const search = event.target.value.trim();
                if (search) window.location.href = `shop-all.html?search=${encodeURIComponent(search)}`;
            }
        });
    }
}

window.showProductModal = function showProductModal(product) {
    if (!product || !productModal) return;

    selectedModalProduct = product;
    selectedModalSize = '';
    selectedModalBackorder = false;

    document.getElementById('modalTitle').textContent = product.name || '';
    document.getElementById('modalImage').src = product.image || '';
    document.getElementById('modalCategory').textContent = product.category || '';
    document.getElementById('modalSku').textContent = `SKU: ${product.sku || 'N/A'}`;
    document.getElementById('modalColorway').textContent = product.colorway || '';
    document.getElementById('modalPrice').textContent = `$${(Number(product.price) || 0).toFixed(0)}`;
    document.getElementById('modalReleaseDate').textContent = product.releaseDate || 'TBD';
    document.getElementById('modalDescription').textContent = isBackorder(product)
        ? `${product.desc || product.description || 'Premium quality authenticated product from Backdoor.'}\n\n${product.backorderLeadTime || 'Ships in 1.5-2 weeks'}.`
        : (product.desc || product.description || 'Premium quality authenticated product from Backdoor.');

    const badge = document.getElementById('modalBadge');
    const badgeMeta = getBadgeMeta(product);
    if (badge) {
        badge.textContent = badgeMeta.label;
        badge.className = badgeMeta.className;
        badge.style.display = badgeMeta.label ? 'inline-block' : 'none';
    }

    const sizesContainer = document.getElementById('modalSizeOptions');
    const sizes = getProductSizes(product);
    if (sizesContainer) {
        sizesContainer.innerHTML = sizes.map((entry) => {
            const sizeBackorder = isBackorder(product, entry) && entry.stock <= 0;
            const soldOut = entry.stock <= 0 && !sizeBackorder;
            return `
                <button type="button" class="size-option ${soldOut ? 'out-of-stock' : ''} ${sizeBackorder ? 'backorder' : ''}" ${soldOut ? 'disabled' : ''} data-size="${entry.size}" data-backorder="${sizeBackorder}" onclick="selectModalSize(this)">
                    ${entry.size}${sizeBackorder ? '<span class="size-option-tag">BO</span>' : ''}
                </button>
            `;
        }).join('');
    }

    const addToCartButton = document.getElementById('modalAddToCart');
    if (addToCartButton) {
        if (!isOutOfStock(product) && sizes.length === 0) {
            selectedModalSize = 'One Size';
            selectedModalBackorder = isBackorderOnly(product);
            addToCartButton.disabled = false;
            addToCartButton.textContent = 'Add to Cart';
        } else {
            addToCartButton.disabled = isOutOfStock(product);
            addToCartButton.textContent = isOutOfStock(product) ? 'Out of Stock' : isBackorder(product) ? 'Select Size for Backorder' : 'Select Size';
        }
        addToCartButton.onclick = () => {
            if (!selectedModalProduct || isOutOfStock(selectedModalProduct)) return;
            if (!selectedModalSize) {
                alert('Please select a size');
                return;
            }
            addToCart(selectedModalProduct, selectedModalSize);
            closeProductModal();
        };
    }

    productModal.classList.add('active');
    modalOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
};

export async function openProductModal(id) {
    const product = products.find((entry) => entry.id === id);
    if (product) window.showProductModal(product);
}

window.openProductModal = openProductModal;

function closeProductModal() {
    productModal?.classList.remove('active');
    modalOverlay?.classList.remove('active');
    document.body.style.overflow = '';
    selectedModalProduct = null;
    selectedModalSize = '';
    selectedModalBackorder = false;
}

window.selectModalSize = (element) => {
    if (element.disabled) return;
    document.querySelectorAll('.size-option').forEach((option) => option.classList.remove('selected'));
    element.classList.add('selected');
    selectedModalSize = element.dataset.size || '';
    selectedModalBackorder = element.dataset.backorder === 'true';

    const addToCartButton = document.getElementById('modalAddToCart');
    if (addToCartButton && selectedModalProduct && !isOutOfStock(selectedModalProduct)) {
        addToCartButton.disabled = false;
        addToCartButton.textContent = selectedModalBackorder ? 'Add Backorder' : 'Add to Cart';
    }
};

function addToCart(product, size) {
    if (!product || isOutOfStock(product)) return;
    const sizeEntry = getProductSizes(product).find((entry) => entry.size === size);
    const backorder = Boolean(selectedModalBackorder || (sizeEntry && isBackorder(product, sizeEntry)));

    const existing = cart.find((item) => item.id === product.id && item.size === size);
    if (existing) {
        existing.qty += 1;
        existing.backorder = backorder;
        existing.backorderLeadTime = backorder ? getBackorderLeadTime(product, sizeEntry) : '';
    }
    else {
        cart.push({
            id: product.id,
            name: product.name,
            brand: product.brand || '',
            price: Number(product.price) || 0,
            image: product.image || '',
            size,
            backorder,
            backorderLeadTime: backorder ? getBackorderLeadTime(product, sizeEntry) : '',
            qty: 1
        });
    }

    saveCart();
    updateCartUI();
    toggleCart();
    
    // Show a toast that it was added (using existing showToast if present)
    if(typeof showToast === 'function') {
        showToast(`${product.name} added to cart!`, 'success');
    }
}

function loadCartFromStorage() {
    try {
        const stored = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
        return Array.isArray(stored) ? stored.map(normalizeCartItem).filter((item) => item.name) : [];
    } catch {
        return [];
    }
}

function normalizeCartItem(item) {
    return {
        id: item?.id || item?.productId || '',
        name: String(item?.name || '').trim(),
        brand: String(item?.brand || '').trim(),
        price: Number(item?.price) || 0,
        image: String(item?.image || '').trim(),
        size: String(item?.size || 'One Size').trim() || 'One Size',
        backorder: Boolean(item?.backorder),
        backorderLeadTime: String(item?.backorderLeadTime || '').trim(),
        qty: Math.max(1, Number(item?.qty) || Number(item?.quantity) || 1)
    };
}

function saveCart() {
    cart = cart.map(normalizeCartItem).filter((item) => item.name);
    localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    
    // Sync to Firestore if logged in
    if (window.globalUser && window.firebaseConfig) {
        try {
            firebase.firestore().collection('users').doc(window.globalUser.uid).set({
                cart: cart
            }, { merge: true });
        } catch(e) { console.warn("Error syncing cart to DB:", e); }
    }
}

function updateCartUI() {
    cart = cart.map(normalizeCartItem).filter((item) => item.name);
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCount) {
        cartCount.textContent = totalQty;
        cartCount.style.display = totalQty > 0 ? 'flex' : 'none';
    }

    const headerCount = document.getElementById('cartHeaderCount');
    if (headerCount) headerCount.textContent = `(${totalQty})`;

    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = `$${totalPrice.toFixed(2)}`;
    const checkoutButton = document.getElementById('cartCheckoutBtn') || document.querySelector('#cartSidebar .cart-checkout');
    if (checkoutButton) checkoutButton.disabled = cart.length === 0;

    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-msg">
                <i class="fa-solid fa-bag-shopping"></i>
                <h4>Your bag is empty.</h4>
                <p>Add some heat and come back to checkout.</p>
            </div>
        `;
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-img">
                ${item.image
                    ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                    : ''}
                <span class="cart-item-fallback" ${item.image ? 'style="display:none"' : ''}><i class="fa-solid fa-shoe-prints"></i></span>
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">
                    <span>Size ${item.size}</span>
                    ${item.brand ? `<span>${item.brand}</span>` : ''}
                    ${item.backorder ? `<span>Backorder${item.backorderLeadTime ? ` | ${item.backorderLeadTime}` : ''}</span>` : ''}
                </div>
                <div class="cart-item-bottom">
                    <div class="qty-control">
                        <button class="qty-btn" type="button" onclick="updateCartQty(${index}, -1)" aria-label="Decrease quantity">−</button>
                        <div class="qty-val">${item.qty}</div>
                        <button class="qty-btn" type="button" onclick="updateCartQty(${index}, 1)" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
                </div>
                <button class="cart-item-remove" type="button" onclick="removeFromCart(${index})">
                    <i class="fa-solid fa-trash-can"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
};

window.updateCartQty = (index, delta) => {
    const item = cart[index];
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartUI();
};

window.toggleCart = () => {
    cartSidebar?.classList.toggle('active');
};

window.addToCart = addToCart;

window.toggleWishlist = async (productId) => {
    if (!window.globalUser) {
        if(typeof showToast === 'function') showToast('Please sign in to save items to your wishlist', 'info');
        window.location.href = 'accounts.html';
        return;
    }

    if (!window.globalWishlist) window.globalWishlist = [];
    const idx = window.globalWishlist.indexOf(productId);
    const added = idx === -1;

    if (added) {
        window.globalWishlist.push(productId);
    } else {
        window.globalWishlist.splice(idx, 1);
    }

    // Attempt to update icon immediately for fast feedback
    const icons = document.querySelectorAll(`#wishlist-icon-${productId}`);
    icons.forEach(icon => {
        icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        const btn = icon.parentElement;
        if (btn && btn.classList.contains('heart-btn')) {
            btn.classList.toggle('wishlisted', added);
        }
    });

    if(typeof showToast === 'function') {
        showToast(added ? 'Added to wishlist' : 'Removed from wishlist', 'success');
    }

    // Sync to DB
    try {
        await firebase.firestore().collection('users').doc(window.globalUser.uid).set({
            wishlist: window.globalWishlist
        }, { merge: true });
    } catch(e) {
        console.warn('Wishlist sync failed:', e);
    }
};
