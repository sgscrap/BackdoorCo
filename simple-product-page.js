import { db, auth } from './admin/firebase-config.js';
import {
    collection, doc, getDoc, limit, onSnapshot, query, where
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
    applyProductOverrides, getSeededProducts, getProductImages,
    getProductSizes, getBackorderLeadTime, getTotalStock,
    hasBackorderSizes, hasInStockSizes, isBackorder, isBackorderOnly,
    isFeatured, isOutOfStock
} from './product-data.js';
import {
    mergeVisibleReviews, reviewMatchesProduct
} from './reviews-data.js';

// --- Cart management (shared with sidebar) ---
function loadCartFromStorage() {
    try {
        return JSON.parse(localStorage.getItem('backdoor-cart')) || [];
    } catch (e) {
        return [];
    }
}

function saveCartToStorage(cart) {
    try {
        localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    } catch (e) {
        // Handle storage errors
    }
}

// Expose global cart object
window.cart = loadCartFromStorage();

// Parse product ID from URL (e.g., /product.html?id=prod123)
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = '/';
}

let currentProduct = null;
let selectedSize = '';
let selectedSizeBackorder = false;
let productImages = [];
let currentImageIndex = 0;
let unsubscribeReviews = null;
let unsubscribeProduct = null;

// --- DOM Elements ---
const titleEl = document.getElementById('product-title');
const categoryEl = document.getElementById('product-category');
const nameEl = document.getElementById('product-name');
const priceEl = document.getElementById('product-price');
const descEl = document.getElementById('product-description');
const mainImg = document.getElementById('main-product-image');
const thumbGallery = document.getElementById('thumbnail-gallery');
const sizeButtons = document.getElementById('size-buttons');
const sizeStockInfo = document.getElementById('size-stock-info');
const backorderLeadEl = document.getElementById('backorder-leadtime');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const cartFeedback = document.getElementById('cart-feedback');
const ratingEl = document.getElementById('product-rating');
const reviewsContainer = document.getElementById('reviews-container');

// Helper to escape HTML
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

// Load product data
async function loadProduct() {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
        alert('Product not found');
        window.location.href = '/';
        return;
    }
    currentProduct = { id: productDoc.id, ...productDoc.data() };
    applyProductOverrides(currentProduct);

    // Populate details
    document.title = currentProduct.name;
    titleEl.textContent = currentProduct.name;
    nameEl.textContent = currentProduct.name;
    categoryEl.textContent = currentProduct.category || '';
    priceEl.textContent = `$${currentProduct.price?.toFixed(2)}`;
    descEl.innerHTML = escapeHtml(currentProduct.description || '');

    // Images
    productImages = getProductImages(currentProduct);
    if (productImages.length > 0) {
        mainImg.src = productImages[0];
        thumbGallery.innerHTML = productImages.map((img, i) => 
            `<img src="${img}" alt="Thumbnail" style="width: 60px; height: 60px; object-fit: cover; border: ${i===0?'2px solid black':'1px solid #ccc'}; cursor:pointer;" onclick="document.getElementById('main-product-image').src='${img}'; document.querySelectorAll('#thumbnail-gallery img').forEach((el,idx)=>el.style.border=idx===i?'2px solid black':'1px solid #ccc')">`
        ).join('');
    }

    // Sizes
    const sizes = getProductSizes(currentProduct);
    sizeButtons.innerHTML = '';
    sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.textContent = size.label;
        btn.style.padding = '0.5rem 1rem';
        btn.style.border = '1px solid #ccc';
        btn.style.background = '#fff';
        btn.onclick = () => selectSize(size);
        if (isOutOfStock(size)) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
        sizeButtons.appendChild(btn);
    });

    // Initial size selection (first in‑stock)
    const firstInStock = sizes.find(s => !isOutOfStock(s));
    if (firstInStock) selectSize(firstInStock);

    // Reviews
    loadReviews();
}

function selectSize(size) {
    selectedSize = size.label;
    selectedSizeBackorder = isBackorder(size);
    addToCartBtn.disabled = isOutOfStock(size);
    sizeStockInfo.textContent = isOutOfStock(size) ? '(Out of stock)' : 
                                 isBackorder(size) ? '(Backordered - ships later)' : '(In stock)';
    backorderLeadEl.style.display = selectedSizeBackorder ? 'block' : 'none';
    if (selectedSizeBackorder) {
        backorderLeadEl.textContent = `Lead time: ${getBackorderLeadTime(currentProduct)}`;
    }
}

// Add to cart
addToCartBtn.addEventListener('click', () => {
    if (!selectedSize || isOutOfStock({label: selectedSize})) return;
    const item = {
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        size: selectedSize,
        image: productImages[0] || '',
        quantity: 1
    };
    // cart is global (from cart.js)
    const existing = window.cart.find(i => i.id === item.id && i.size === item.size);
    if (existing) {
        existing.quantity++;
    } else {
        window.cart.push(item);
    }
    saveCartToStorage(window.cart);
    // Trigger cart update event for sidebar
    window.dispatchEvent(new CustomEvent('cart-updated'));
    // Show feedback
    cartFeedback.style.display = 'block';
    setTimeout(() => cartFeedback.style.display = 'none', 2000);
});

// Reviews
function loadReviews() {
    const reviewsQuery = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        limit(20)
    );
    unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
        const reviews = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        const merged = mergeVisibleReviews(reviews).filter(r => reviewMatchesProduct(r, currentProduct));
        renderReviews(merged);
    });
}

function renderReviews(reviews) {
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p>No reviews yet.</p>';
        return;
    }
    const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    ratingEl.innerHTML = `⭐ ${avg.toFixed(1)} (${reviews.length} reviews)`;
    reviewsContainer.innerHTML = reviews.map(r => `
        <div style="border-bottom: 1px solid #eee; padding: 1rem 0;">
            <strong>${escapeHtml(r.userName || 'Anonymous')}</strong> - ${'⭐'.repeat(r.rating)}
            <p>${escapeHtml(r.text)}</p>
        </div>
    `).join('');
}

// Initialize
onAuthStateChanged(auth, (user) => {
    // optional: user-based features
    loadProduct();
});