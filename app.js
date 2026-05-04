import { db } from './admin/firebase-config.js';
import {
    collection, query,
    orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
    buildProductHref,
    getProductCardImage,
    mergeCatalogProducts
} from './product-data.js';

// ============================================
// GLOBAL STATE
// ============================================
let products = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
let selectedFilters = {
    brands: [],
    categories: [],
    priceRange: [0, 1000],
    collection: '',
    searchQuery: ''
};
let currentSort = 'newest';

// ============================================
// DOM ELEMENTS
// ============================================
const isHomePage = !!document.getElementById('mostWanted');
const isShopPage = !!document.getElementById('shopAllGrid');

const productGrid = document.getElementById('shopAllGrid') || document.getElementById('mwGrid') || document.getElementById('productGrid');
const mwLoading = document.getElementById('mwLoading');
const mwCatalogCount = document.getElementById('mwCatalogCount');

// Modal Elements
const productModal = document.getElementById('productModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');

// Cart Elements
const cartSidebar = document.getElementById('cartSidebar');
const cartCount = document.getElementById('cartCount');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initFirebaseSync();
    initGlobalListeners();
    disableSiteLightbox();
    updateCartUI();
});

// Disable any image lightbox/pop-out behavior on public pages.
function disableSiteLightbox() {
    try {
        // Don't interfere with admin editing pages
        if (location.pathname.includes('/admin')) return;

        // Make showProductModal a no-op to prevent modal popouts
        window.showProductModal = function () { return; };

        // Remove inline onclick handlers that reference modal/lightbox functions
        document.querySelectorAll('[onclick]').forEach((el) => {
            const v = el.getAttribute('onclick') || '';
            if (/showProductModal|openProductModal|openLightbox|openImage|openModal/i.test(v)) {
                el.removeAttribute('onclick');
            }
        });

        // Remove any common data attributes used by lightbox libraries
        document.querySelectorAll('[data-lightbox],[data-fancybox],[data-zoom]').forEach((el) => {
            el.removeAttribute('data-lightbox');
            el.removeAttribute('data-fancybox');
            el.removeAttribute('data-zoom');
        });
    } catch (e) {
        // Non-fatal — surface errors to console for debugging
        console.warn('disableSiteLightbox error', e);
    }
}

// Enhance non-button clickable elements for keyboard and screen reader users
function enhanceClickableNonButtonElements() {
    try {
        // Select elements with inline onclick handlers that are not naturally focusable
        document.querySelectorAll('[onclick]').forEach((el) => {
            const tag = (el.tagName || '').toUpperCase();
            if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (el.getAttribute('role') === 'button') return;
            const hasTab = el.hasAttribute('tabindex');
            // Only modify elements that don't already expose keyboard focus
            if (!hasTab) el.setAttribute('tabindex', '0');
            if (!el.getAttribute('role')) el.setAttribute('role', 'button');

            // Add keyboard activation for Enter and Space
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Trigger the original click handler or navigate if it's present
                    el.click();
                }
            });
        });
    } catch (e) {
        console.warn('enhanceClickableNonButtonElements error', e);
    }
}

// ============================================
// FIREBASE SYNC
// ============================================
function initFirebaseSync() {
    const q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        const liveProducts = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'active') {
                liveProducts.push({ id: doc.id, ...data });
            }
        });
        products = mergeCatalogProducts(liveProducts);

        if (isHomePage) {
            renderMostWanted();
        }
    });
}

// ============================================
// HOMEPAGE: MOST WANTED (4 HIGHEST PRICED)
// ============================================
function renderMostWanted() {
    if (!productGrid || !isHomePage) return;

    // Show 4 highest priced
    const topPriced = [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 4);

    if (mwLoading) mwLoading.style.display = 'none';
    if (productGrid) {
        productGrid.classList.remove('d-none');
        productGrid.style.display = 'grid';
    }

    productGrid.innerHTML = topPriced.map((p, i) => `
        <div class="mw-card drop-card"
             data-id="${p.id}"
             style="animation-delay:${i * 0.1}s">

            <a class="mw-card-link" href="${buildProductHref(p)}" aria-label="${p.name}">
                <!-- Image -->
                <div class="mw-card-img drop-card-img-wrap">

                    <!-- Rank Badge -->
                    <div class="mw-rank new-badge">#${i + 1}</div>

                    <!-- Exclusive badge for top item -->
                    ${i === 0
            ? `<div class="mw-exclusive-badge low-stock-badge" style="background:var(--accent); color:#000;">
                           ⚡ EXCLUSIVE DROP
                       </div>`
            : ''
        }

                    <!-- Sold out -->
                    ${p.stock === 0
            ? `<div class="mw-sold-overlay sold-out-overlay">
                           <span>SOLD OUT</span>
                       </div>`
            : ''
        }

                    <img src="${getProductCardImage(p) || ''}"
                         alt="${p.name}"
                         loading="${i < 2 ? 'eager' : 'lazy'}"
                         onerror="this.style.display='none'">
                
                </div>

                <!-- Info -->
                <div class="mw-card-info drop-card-info">
                    <p class="mw-card-brand drop-brand">
                        ${p.brand || p.category} · 
                        ${p.category || 'Deadstock'}
                    </p>
                    <h3 class="mw-card-name drop-name">${p.name}</h3>

                    <div class="mw-price-row drop-bottom">
                        <div class="mw-price-block drop-price-wrap">
                            <span class="mw-ask-label drop-price-label">
                                Lowest Ask
                            </span>
                            <span class="mw-price drop-price">
                                $${parseFloat(p.price).toFixed(0)}
                            </span>
                        </div>
                    </div>
                </div>
            </a>

            ${p.stock > 0
            ? `<button class="mw-buy-btn drop-buy-btn"
                               onclick="event.stopPropagation(); window.location.href='${buildProductHref(p)}'">
                               Buy
                           </button>`
            : `<span class="mw-sold drop-sold-text">Sold Out</span>`
        }
        </div>
    `).join('');

    if (mwCatalogCount) {
        mwCatalogCount.textContent = `— ${products.length} items`;
    }
}


// ============================================
// GLOBAL LISTENERS (Cart, Modal, Nav)
// ============================================
function initGlobalListeners() {
    // Nav Scroll
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
    });

    // Close Modal
    if (modalClose) modalClose.onclick = closeProductModal;
    if (modalOverlay) modalOverlay.onclick = closeProductModal;

    // Cart Sidebar Close
    const cartClose = document.getElementById('cartClose');
    if (cartClose) cartClose.onclick = () => cartSidebar.classList.remove('active');

    // Esc Key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            if (cartSidebar) cartSidebar.classList.remove('active');
        }
    });

    // Search Redirect from Homepage
    const navSearch = document.getElementById('navSearch');
    if (navSearch && isHomePage) {
        navSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    window.location.href = `shop-all.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
}

// ============================================
// PRODUCT MODAL
// ============================================
window.showProductModal = function (product) {
    if (!product) return;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // Fill data
    document.getElementById('modalTitle').textContent = product.name;
    document.getElementById('modalImage').src = product.image;
    document.getElementById('modalCategory').textContent = product.category;
    document.getElementById('modalSku').textContent = `SKU: ${product.sku || 'N/A'}`;
    document.getElementById('modalPrice').textContent = `$${parseFloat(product.price).toFixed(0)}`;
    document.getElementById('modalDescription').textContent = product.desc || product.description || "Premium quality authenticated sneaker from Backdoor collection.";

    // Colorway
    const colEl = document.getElementById('modalColorway');
    if (colEl) colEl.textContent = product.colorway || "";

    // Sizes
    const sizesContainer = document.getElementById('modalSizeOptions');
    if (sizesContainer) {
        const sizes = product.sizes ? product.sizes.split(',').map(s => s.trim()) : ['8', '8.5', '9', '9.5', '10', '10.5', '11', '12'];
        sizesContainer.innerHTML = sizes.map(size => `
            <button class="size-option" type="button" onclick="selectModalSize(this)">${size}</button>
        `).join('');
    }

    // ATC Button
    const atcBtn = document.getElementById('modalAddToCart');
    if (atcBtn) {
        atcBtn.onclick = () => {
            const selectedSize = document.querySelector('.size-option.selected')?.textContent || 'TBD';
            addToCart(product, selectedSize);
            closeProductModal();
        };
    }

    modal.classList.add('active');
    if (modalOverlay) modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}; // End of showProductModal

export async function openProductModal(id) {
    window.openProductPage(id);
}
window.openProductModal = openProductModal;

function findProductForPage(value) {
    const target = String(value || '').trim().toLowerCase();
    return products.find((product) => (
        String(product.id || '').toLowerCase() === target ||
        String(product.sku || '').toLowerCase() === target ||
        String(product.name || '').toLowerCase() === target
    ));
}

window.openProductPage = (value) => {
    const product = findProductForPage(value);
    window.location.href = product ? buildProductHref(product) : `product.html?id=${encodeURIComponent(value)}`;
};

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
    if (modalOverlay) modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

window.selectModalSize = (el) => {
    document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
};

// ============================================
// CART SYSTEM
// ============================================
function addToCart(product, size) {
    const existing = cart.find(item => item.id === product.id && item.size === size);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: product.image,
            size: size,
            qty: 1
        });
    }
    saveCart();
    updateCartUI();
    toggleCart();
}

function saveCart() {
    localStorage.setItem('backdoor-cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCount) cartCount.textContent = totalQty;

    // Sync with header count if exists
    const headerCount = document.getElementById('cartHeaderCount');
    if (headerCount) headerCount.textContent = `(${totalQty})`;

    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = `$${totalPrice.toFixed(2)}`;

    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your bag is empty.</div>';
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-thumb">
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

window.updateCartQty = (index, delta) => {
    const item = cart[index];
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartUI();
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
};

window.toggleCart = () => {
    const cart = document.getElementById('cartSidebar');
    if (cart) cart.classList.toggle('active');
};

// ============================================
// GLOBAL EXPORTS
// ============================================
window.addToCart = addToCart;
