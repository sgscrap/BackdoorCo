import { db } from './admin/firebase-config.js';
import {
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
    applyProductOverrides,
    getProductImages,
    getProductSizes,
    getTotalStock,
    isFeatured,
    isOutOfStock
} from './product-data.js';

let currentProduct = null;
let selectedSize = '';
let cart = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
let productImages = [];
let currentImageIndex = 0;

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');
const cartSidebar = document.getElementById('cartSidebar');
const cartCount = document.getElementById('cartCount');

document.addEventListener('DOMContentLoaded', async () => {
    initShell();
    updateCartUI();

    if (!productId) {
        renderMissingProduct();
        return;
    }

    try {
        const snapshot = await getDoc(doc(db, 'products', productId));
        if (!snapshot.exists()) {
            renderMissingProduct();
            return;
        }

        currentProduct = applyProductOverrides({ id: snapshot.id, ...snapshot.data() });
        renderProduct(currentProduct);
    } catch (error) {
        console.error(error);
        renderMissingProduct('Unable to load this product right now.');
    }
});

function initShell() {
    document.getElementById('cartClose')?.addEventListener('click', () => cartSidebar?.classList.remove('active'));
    document.getElementById('productPrevImage')?.addEventListener('click', () => changeProductImage(-1));
    document.getElementById('productNextImage')?.addEventListener('click', () => changeProductImage(1));
    document.getElementById('productMainImage')?.addEventListener('click', () => changeProductImage(1));
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') cartSidebar?.classList.remove('active');
        if (event.key === 'ArrowLeft') changeProductImage(-1);
        if (event.key === 'ArrowRight') changeProductImage(1);
    });
}

function renderMissingProduct(message = 'Product not found.') {
    document.getElementById('productPageLayout').innerHTML = `
        <div class="product-page-empty">
            <h1>Product unavailable</h1>
            <p>${message}</p>
            <a class="btn-hero-primary" href="men.html">Back to Men</a>
        </div>
    `;
}

function renderProduct(product) {
    document.title = `${product.name} | Backdoor`;
    document.getElementById('productBreadcrumbLabel').textContent = product.name;
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productCategoryLabel').textContent = product.category || 'Product';
    document.getElementById('productBrandLine').textContent = formatBrandLine(product);
    document.getElementById('productPrice').textContent = `$${(Number(product.price) || 0).toFixed(0)}`;
    document.getElementById('productDescription').textContent = product.description || 'Premium authenticated product from Backdoor.';
    document.getElementById('productSku').textContent = product.sku || 'N/A';
    document.getElementById('productColorway').textContent = product.colorway || 'N/A';
    document.getElementById('productReleaseDate').textContent = product.releaseDate || 'TBD';

    const soldOut = isOutOfStock(product);
    document.getElementById('productStockLabel').textContent = soldOut
        ? 'Out of stock'
        : `${getTotalStock(product)} items available`;

    const badge = document.getElementById('productStatusBadge');
    if (soldOut) {
        badge.textContent = 'Out of Stock';
        badge.className = 'modal-badge modal-badge--out';
        badge.style.display = 'inline-block';
    } else if (isFeatured(product)) {
        badge.textContent = 'Featured';
        badge.className = 'modal-badge modal-badge--featured';
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }

    const images = getProductImages(product);
    productImages = images.length > 0 ? images : [product.image].filter(Boolean);
    currentImageIndex = 0;

    const mainImage = document.getElementById('productMainImage');
    mainImage.src = productImages[0] || '';
    mainImage.alt = `${product.name} image 1`;

    renderGalleryControls();

    const sizes = getProductSizes(product);
    const sizeOptions = document.getElementById('productSizeOptions');
    sizeOptions.innerHTML = sizes.map((entry) => {
        const sizeSoldOut = soldOut || entry.stock <= 0;
        return `
            <button type="button" class="size-option ${sizeSoldOut ? 'out-of-stock' : ''}" ${sizeSoldOut ? 'disabled' : ''} data-size="${entry.size}" onclick="selectProductSize(this)">
                ${entry.size}
            </button>
        `;
    }).join('');

    const addToCartButton = document.getElementById('productAddToCart');
    addToCartButton.disabled = soldOut;
    addToCartButton.textContent = soldOut ? 'Out of Stock' : sizes.length > 0 ? 'Select Size' : 'Add to Cart';
    if (!soldOut && sizes.length === 0) selectedSize = 'One Size';

    document.querySelector('.product-back-link')?.setAttribute('href', buildBackHref(product));
}

function formatBrandLine(product) {
    const brand = String(product?.brand || '').trim();
    const colorway = String(product?.colorway || '').trim();

    if (brand && colorway) return `${brand} | ${colorway}`;
    return brand || colorway || '';
}

function buildBackHref(product) {
    if (product.category === 'Apparel') return 'apparel.html';
    if (product.category === 'Accessories') return 'accessories.html';
    if (product.category === 'Electronics') return 'electronics.html';
    return 'men.html';
}

window.selectProductImage = (button) => {
    const nextIndex = Number(button.dataset.index || 0);
    setProductImage(nextIndex);
};

function renderGalleryControls() {
    const dots = document.getElementById('productGalleryDots');
    const hint = document.getElementById('productGalleryHint');
    const prevButton = document.getElementById('productPrevImage');
    const nextButton = document.getElementById('productNextImage');
    const hasMultiple = productImages.length > 1;

    if (hint) {
        hint.textContent = hasMultiple
            ? `Image ${currentImageIndex + 1} / ${productImages.length} | Click image for next`
            : 'Single product preview';
    }

    if (prevButton) prevButton.style.display = hasMultiple ? 'inline-flex' : 'none';
    if (nextButton) nextButton.style.display = hasMultiple ? 'inline-flex' : 'none';

    if (dots) {
        dots.innerHTML = productImages.map((_, index) => `
            <button class="product-gallery-dot ${index === currentImageIndex ? 'active' : ''}" type="button" data-index="${index}" onclick="selectProductImage(this)" aria-label="View image ${index + 1}"></button>
        `).join('');
        dots.style.display = hasMultiple ? 'flex' : 'none';
    }
}

function setProductImage(index) {
    if (productImages.length === 0) return;

    currentImageIndex = (index + productImages.length) % productImages.length;
    const mainImage = document.getElementById('productMainImage');
    if (mainImage) {
        mainImage.src = productImages[currentImageIndex];
        mainImage.alt = `${currentProduct?.name || 'Product'} image ${currentImageIndex + 1}`;
    }

    renderGalleryControls();
}

function changeProductImage(direction) {
    if (productImages.length <= 1) return;
    setProductImage(currentImageIndex + direction);
}

window.selectProductSize = (button) => {
    if (button.disabled) return;
    document.querySelectorAll('#productSizeOptions .size-option').forEach((option) => option.classList.remove('selected'));
    button.classList.add('selected');
    selectedSize = button.dataset.size || '';
    document.getElementById('productAddToCart').textContent = 'Add to Cart';
};

document.getElementById('productAddToCart')?.addEventListener('click', () => {
    if (!currentProduct || isOutOfStock(currentProduct)) return;
    if (!selectedSize) {
        showToast('Select a size first.', 'info');
        return;
    }

    const existing = cart.find((item) => item.id === currentProduct.id && item.size === selectedSize);
    if (existing) existing.qty += 1;
    else {
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: Number(currentProduct.price) || 0,
            image: getProductImages(currentProduct)[0] || currentProduct.image || '',
            size: selectedSize,
            qty: 1
        });
    }

    localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    updateCartUI();
    showToast(`${currentProduct.name} added to cart.`);
});

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCount) {
        cartCount.textContent = totalQty;
        cartCount.style.display = totalQty > 0 ? 'flex' : 'none';
    }

    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = `$${totalPrice.toFixed(2)}`;
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart-msg">Your bag is empty.</div>';
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
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
    localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    updateCartUI();
};

window.toggleCart = () => {
    cartSidebar?.classList.toggle('active');
};

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>+</span><span>${message}</span>`;
    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2500);
}
