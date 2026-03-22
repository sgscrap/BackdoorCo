import { db } from './admin/firebase-config.js';
import {
    collection,
    onSnapshot,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
    applyProductOverrides,
    buildProductHref,
    getProductCardImagePadding,
    getProductCardImageScale,
    getProductImageFit,
    getProductImagePosition,
    mergeCatalogProducts,
    getTotalStock,
    isBackorder,
    isFeatured,
    isHidden,
    isOutOfStock
} from './product-data.js';

let allProducts = [];
let currentFilter = window.initialFilter || 'all';
let currentSort = 'featured';
let searchTerm = '';

const grid = document.getElementById('shopAllGrid');
const loading = document.getElementById('shopLoading');
const noResults = document.getElementById('shopNoResults');
const resultsCount = document.getElementById('resultsCount');
const sortSelect = document.getElementById('shopSort');
const searchInput = document.getElementById('shopSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

function getVisibleProducts() {
    return allProducts.filter((product) => !isHidden(product));
}

function showGrid() {
    loading?.classList.add('d-none');
    noResults?.classList.add('d-none');
    if (grid) {
        grid.style.display = 'grid';
        grid.classList.remove('d-none');
    }
}

function showNoResults() {
    loading?.classList.add('d-none');
    grid?.classList.add('d-none');
    if (noResults) {
        noResults.style.display = 'flex';
        noResults.classList.remove('d-none');
    }
}

function showLoading() {
    if (loading) {
        loading.style.display = 'grid';
        loading.classList.remove('d-none');
    }
    grid?.classList.add('d-none');
    noResults?.classList.add('d-none');
}

function loadAllProducts() {
    showLoading();

    const productsQuery = query(collection(db, 'products'), where('status', '==', 'active'));
    onSnapshot(productsQuery, (snapshot) => {
        allProducts = mergeCatalogProducts(snapshot.docs.map((doc) => applyProductOverrides({
            id: doc.id,
            ...doc.data(),
            price: Number(doc.data().price) || 0
        })));

        updateFilterCounts();
        renderProducts();
        updateSubtitle();
    }, (error) => {
        console.error('Firebase error:', error);
        if (resultsCount) resultsCount.textContent = 'Error loading products.';
        showNoResults();
    });
}

function getFilteredProducts() {
    let filtered = [...getVisibleProducts()];

    if (currentFilter === 'Men') {
        filtered = filtered.filter((product) => product.category !== 'Women' && product.category !== 'Kids');
    } else if (currentFilter === 'Shoes') {
        filtered = filtered.filter((product) => product.category === 'Shoes' || product.category === 'Sneakers');
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter((product) => product.brand === currentFilter || product.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter((product) => (
            product.name?.toLowerCase().includes(searchTerm) ||
            product.brand?.toLowerCase().includes(searchTerm) ||
            product.sku?.toLowerCase().includes(searchTerm) ||
            (product.colorway || '').toLowerCase().includes(searchTerm)
        ));
    }

    switch (currentSort) {
        case 'price-high':
            filtered.sort((left, right) => right.price - left.price);
            break;
        case 'price-low':
            filtered.sort((left, right) => left.price - right.price);
            break;
        case 'name':
            filtered.sort((left, right) => (left.name || '').localeCompare(right.name || ''));
            break;
        case 'featured':
            filtered.sort((left, right) => (
                Number(isFeatured(right)) - Number(isFeatured(left)) ||
                (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0)
            ));
            break;
        default:
            filtered.sort((left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0));
            break;
    }

    return filtered;
}

function renderProducts() {
    const filtered = getFilteredProducts();

    if (resultsCount) {
        resultsCount.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
        const message = document.getElementById('noResultsMsg');
        if (message) {
            message.textContent = searchTerm ? `No results for "${searchTerm}"` : 'No products in this category yet.';
        }
        showNoResults();
        return;
    }

    if (grid) {
        grid.innerHTML = filtered.map((product, index) => {
            const soldOut = isOutOfStock(product);
            const backorder = isBackorder(product);
            const totalStock = getTotalStock(product);
            const imageScale = getProductCardImageScale(product);
            const imagePadding = getProductCardImagePadding(product);
            const imageFit = getProductImageFit(product);
            const imagePosition = getProductImagePosition(product);
            const statusBadge = backorder
                ? '<span class="product-state-badge product-state-badge--featured">Backorder</span>'
                : soldOut
                ? '<span class="product-state-badge product-state-badge--out">Out of Stock</span>'
                : isFeatured(product)
                    ? '<span class="product-state-badge product-state-badge--featured">Featured</span>'
                    : '';

            return `
                <div class="shop-card ${soldOut && !backorder ? 'shop-card--out-of-stock' : ''}" data-id="${product.id}" style="animation-delay:${Math.min(index * 0.04, 0.3)}s" onclick="handleProductClick('${product.id}')">
                    <div class="shop-card-img">
                        ${statusBadge}
                        ${!soldOut && totalStock > 0 && totalStock <= 3 ? `<span class="low-badge">${totalStock} LEFT</span>` : ''}
                        ${soldOut && !backorder ? '<div class="sold-overlay"><span>OUT OF STOCK</span></div>' : ''}
                        ${product.image
                ? `<img src="${product.image}" alt="${product.name}" loading="${index < 4 ? 'eager' : 'lazy'}" style="object-fit:${imageFit};object-position:${imagePosition};padding:${imagePadding};--product-image-scale:${imageScale};--product-image-hover-scale:${(imageScale + 0.04).toFixed(2)}" onerror="this.style.display='none'">`
                : '<div class="no-img-placeholder"><i class="fa-solid fa-shoe-prints"></i></div>'}
                    </div>
                    <div class="shop-card-info">
                        <p class="shop-card-brand">${product.brand || product.category || ''}</p>
                        <h3 class="shop-card-name">${product.name}</h3>
                        <p class="shop-card-cat">${(product.category || '').toUpperCase()}</p>
                        <div class="shop-card-bottom">
                            <div>
                                <p class="shop-card-label">${backorder ? (product.backorderLeadTime || 'Backorder') : soldOut ? 'Unavailable' : isFeatured(product) ? 'Featured Pick' : 'Lowest Ask'}</p>
                                <p class="shop-card-price">$${product.price.toFixed(0)}</p>
                                <a class="product-page-link" href="${buildProductHref(product)}" onclick="event.stopPropagation()">View product page</a>
                            </div>
                            ${soldOut && !backorder
                ? '<span class="shop-sold-label">Sold Out</span>'
                : `<button class="shop-buy-btn" onclick="event.stopPropagation(); handleAddToCart('${product.id}')">Buy</button>`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showGrid();
}

function updateFilterCounts() {
    const visible = getVisibleProducts();
    const counts = {
        all: visible.length,
        Jordan: visible.filter((product) => product.brand === 'Jordan').length,
        Nike: visible.filter((product) => product.brand === 'Nike').length,
        Adidas: visible.filter((product) => product.brand === 'Adidas').length,
        Sneakers: visible.filter((product) => product.category === 'Sneakers').length,
        Apparel: visible.filter((product) => product.category === 'Apparel').length
    };

    Object.entries(counts).forEach(([key, count]) => {
        const element = document.getElementById(`count-${key}`);
        if (element) element.textContent = `(${count})`;
    });
}

function updateSubtitle() {
    const subtitle = document.getElementById('shopAllSubtitle');
    if (subtitle) subtitle.textContent = `${getVisibleProducts().length} products available now.`;
}

window.handleProductClick = (id) => {
    const product = allProducts.find((entry) => entry.id === id);
    if (product) window.location.href = buildProductHref(product);
};

window.handleAddToCart = (id) => {
    const product = allProducts.find((entry) => entry.id === id);
    if (!product || isOutOfStock(product)) return;

    const cart = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.qty += 1;
    else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || '',
            size: 'One Size',
            qty: 1
        });
    }

    localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    updateCartDisplay();
}

function updateCartDisplay() {
    const cart = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

document.querySelectorAll('.shop-filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-filter-tab').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderProducts();
    });
});

if (sortSelect) {
    sortSelect.value = currentSort;
    sortSelect.addEventListener('change', (event) => {
        currentSort = event.target.value;
        renderProducts();
    });
}

let searchDebounce;
if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        window.clearTimeout(searchDebounce);
        clearSearchBtn?.classList.toggle('d-none', !event.target.value);
        searchDebounce = window.setTimeout(() => {
            searchTerm = event.target.value.toLowerCase().trim();
            renderProducts();
        }, 250);
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        clearSearchBtn.classList.add('d-none');
        searchTerm = '';
        renderProducts();
    });
}

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        currentFilter = 'all';
        currentSort = 'featured';
        searchTerm = '';
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = currentSort;
        clearSearchBtn?.classList.add('d-none');
        document.querySelectorAll('.shop-filter-tab').forEach((item) => item.classList.remove('active'));
        document.querySelector('[data-filter="all"]')?.classList.add('active');
        renderProducts();
    });
}

function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get('sort');
    const searchParam = params.get('search');

    if (sortParam) currentSort = sortParam;
    if (searchParam) {
        searchTerm = searchParam.toLowerCase().trim();
        if (searchInput) searchInput.value = searchParam;
        clearSearchBtn?.classList.remove('d-none');
    }
    if (sortSelect) sortSelect.value = currentSort;
}

const backBtn = document.getElementById('backTopBtn');
if (backBtn) {
    window.addEventListener('scroll', () => {
        backBtn.style.opacity = window.scrollY > 400 ? '1' : '0';
        backBtn.style.pointerEvents = window.scrollY > 400 ? 'all' : 'none';
    });

    backBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

document.querySelectorAll('.accordion-header').forEach((header) => {
    header.addEventListener('click', () => {
        header.closest('.sidebar-accordion')?.classList.toggle('open');
    });
});

document.addEventListener('DOMContentLoaded', () => {
    readUrlParams();
    if (window.initialFilter) {
        document.querySelectorAll('.shop-filter-tab').forEach((item) => item.classList.remove('active'));
        const activeTab = document.querySelector(`[data-filter="${window.initialFilter}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.closest('.sidebar-accordion')?.classList.add('open');
        }
    }
    loadAllProducts();
    updateCartDisplay();
});
