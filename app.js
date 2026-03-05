import { db } from './admin/firebase-config.js';
import {
    collection, query,
    orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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
    updateCartUI();
});

// ============================================
// FIREBASE SYNC
// ============================================
function initFirebaseSync() {
    const q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'active') {
                products.push({ id: doc.id, ...data });
            }
        });

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
             style="animation-delay:${i * 0.1}s"
             onclick="openProductModal('${p.id}')">

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

                <img src="${p.image || ''}"
                     alt="${p.name}"
                     loading="${i < 2 ? 'eager' : 'lazy'}"
                     onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/8B5CF6?text=${encodeURIComponent(p.name)}'">
            
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
                    ${p.stock > 0
            ? `<button class="mw-buy-btn drop-buy-btn"
                               onclick="event.stopPropagation();
                               openProductModal('${p.id}')">
                               Buy
                           </button>`
            : `<span class="mw-sold drop-sold-text">Sold Out</span>`
        }
                </div>
            </div>
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
export async function openProductModal(id) {
    const product = products.find(p => p.id === id);
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
            <div class="size-option" onclick="selectModalSize(this)">${size}</div>
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
}

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
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-size">Size: ${item.size}</div>
                <div class="cart-item-price">$${item.price.toFixed(0)}</div>
                <div class="cart-item-qty">
                    <span>Qty: ${item.qty}</span>
                </div>
            </div>
            <button class="cart-remove" onclick="removeFromCart(${index})">&times;</button>
        </div>
    `).join('');
}

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
window.openProductModal = openProductModal;
window.addToCart = addToCart;
window.toggleCart = window.toggleCart; // Redundant but explicit
