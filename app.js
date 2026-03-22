import { db } from './admin/firebase-config.js';
import {
    collection,
    orderBy,
    onSnapshot,
    query
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

let products = [];
let cart = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
let selectedModalSize = '';
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
});

function getProductSizes(product) {
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
        return product.sizes.map((entry) => ({
            size: String(entry.size || '').trim(),
            stock: Math.max(0, Number(entry.stock) || 0),
            price: Number(entry.price) || Number(product.price) || 0
        })).filter((entry) => entry.size);
    }

    if (typeof product?.sizes === 'string' && product.sizes.trim()) {
        return product.sizes.split(',').map((size) => ({
            size: size.trim(),
            stock: Math.max(0, Number(product.stock) || 1),
            price: Number(product.price) || 0
        })).filter((entry) => entry.size);
    }

    return [];
}

function getTotalStock(product) {
    const sizes = getProductSizes(product);
    if (sizes.length > 0) {
        return sizes.reduce((sum, entry) => sum + Math.max(0, Number(entry.stock) || 0), 0);
    }
    return Math.max(0, Number(product?.stock) || 0);
}

function isHidden(product) {
    return Boolean(product?.isHidden);
}

function isFeatured(product) {
    return Boolean(product?.isFeatured);
}

function isOutOfStock(product) {
    return Boolean(product?.isOutOfStock) || getTotalStock(product) <= 0;
}

function getVisibleProducts() {
    return products.filter((product) => product.status === 'active' && !isHidden(product));
}

function getBadgeMeta(product) {
    if (isOutOfStock(product)) {
        return { label: 'Out of Stock', className: 'modal-badge modal-badge--out' };
    }
    if (isFeatured(product)) {
        return { label: 'Featured', className: 'modal-badge modal-badge--featured' };
    }
    return { label: '', className: 'modal-badge' };
}

function normalizeProduct(doc) {
    return {
        id: doc.id,
        ...doc,
        price: Number(doc.price) || 0,
        sizes: getProductSizes(doc)
    };
}

function initFirebaseSync() {
    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

    onSnapshot(productsQuery, (snapshot) => {
        products = snapshot.docs.map((doc) => normalizeProduct({ id: doc.id, ...doc.data() }));
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
        const featuredBadge = isFeatured(product)
            ? '<div class="mw-status-badge">FEATURED</div>'
            : '';

        return `
            <div class="mw-card drop-card ${soldOut ? 'mw-card--out-of-stock' : ''}" data-id="${product.id}" style="animation-delay:${index * 0.1}s" onclick="openProductModal('${product.id}')">
                <div class="mw-card-img drop-card-img-wrap">
                    <div class="mw-rank new-badge">#${index + 1}</div>
                    ${featuredBadge}
                    ${soldOut ? '<div class="mw-sold-overlay sold-out-overlay"><span>OUT OF STOCK</span></div>' : ''}
                    <img src="${product.image || ''}" alt="${product.name}" loading="${index < 2 ? 'eager' : 'lazy'}" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/c8f65d?text=Backdoor'">
                </div>
                <div class="mw-card-info drop-card-info">
                    <p class="mw-card-brand drop-brand">${product.brand || product.category || ''} · ${product.category || 'Deadstock'}</p>
                    <h3 class="mw-card-name drop-name">${product.name}</h3>
                    <div class="mw-price-row drop-bottom">
                        <div class="mw-price-block drop-price-wrap">
                            <span class="mw-ask-label drop-price-label">${soldOut ? 'Unavailable' : isFeatured(product) ? 'Featured Pick' : 'Lowest Ask'}</span>
                            <span class="mw-price drop-price">$${product.price.toFixed(0)}</span>
                        </div>
                        ${soldOut
                ? '<span class="mw-sold drop-sold-text">Sold Out</span>'
                : `<button class="mw-buy-btn drop-buy-btn" onclick="event.stopPropagation(); openProductModal('${product.id}')">Buy</button>`}
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

    document.getElementById('modalTitle').textContent = product.name || '';
    document.getElementById('modalImage').src = product.image || '';
    document.getElementById('modalCategory').textContent = product.category || '';
    document.getElementById('modalSku').textContent = `SKU: ${product.sku || 'N/A'}`;
    document.getElementById('modalColorway').textContent = product.colorway || '';
    document.getElementById('modalPrice').textContent = `$${(Number(product.price) || 0).toFixed(0)}`;
    document.getElementById('modalReleaseDate').textContent = product.releaseDate || 'TBD';
    document.getElementById('modalDescription').textContent = product.desc || product.description || 'Premium quality authenticated product from Backdoor.';

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
            const soldOut = isOutOfStock(product) || entry.stock <= 0;
            return `
                <button type="button" class="size-option ${soldOut ? 'out-of-stock' : ''}" ${soldOut ? 'disabled' : ''} data-size="${entry.size}" onclick="selectModalSize(this)">
                    ${entry.size}
                </button>
            `;
        }).join('');
    }

    const addToCartButton = document.getElementById('modalAddToCart');
    if (addToCartButton) {
        if (!isOutOfStock(product) && sizes.length === 0) {
            selectedModalSize = 'One Size';
            addToCartButton.disabled = false;
            addToCartButton.textContent = 'Add to Cart';
        } else {
            addToCartButton.disabled = isOutOfStock(product);
            addToCartButton.textContent = isOutOfStock(product) ? 'Out of Stock' : 'Select Size';
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
}

window.selectModalSize = (element) => {
    if (element.disabled) return;
    document.querySelectorAll('.size-option').forEach((option) => option.classList.remove('selected'));
    element.classList.add('selected');
    selectedModalSize = element.dataset.size || '';

    const addToCartButton = document.getElementById('modalAddToCart');
    if (addToCartButton && selectedModalProduct && !isOutOfStock(selectedModalProduct)) {
        addToCartButton.disabled = false;
        addToCartButton.textContent = 'Add to Cart';
    }
};

function addToCart(product, size) {
    if (!product || isOutOfStock(product)) return;

    const existing = cart.find((item) => item.id === product.id && item.size === size);
    if (existing) existing.qty += 1;
    else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image || '',
            size,
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

    if (cartCount) {
        cartCount.textContent = totalQty;
        cartCount.style.display = totalQty > 0 ? 'flex' : 'none';
    }

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
                <div class="cart-item-qty"><span>Qty: ${item.qty}</span></div>
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
    cartSidebar?.classList.toggle('active');
};

window.addToCart = addToCart;
