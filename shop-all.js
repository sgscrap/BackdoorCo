// ================================
// shop-all.js — FIXED v1.2
// ================================
import { db } from './admin/firebase-config.js';
import {
    collection,
    query,
    where,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ================================
// STATE
// ================================// Global variables
let allProducts = [];
let currentFilter = window.initialFilter || 'all'; // Default to injected category, or 'all'
let currentSort = 'price-high';
let searchTerm = '';

// ================================
// DOM ELEMENTS
// ================================
const grid = document.getElementById('shopAllGrid');
const loading = document.getElementById('shopLoading');
const noResults = document.getElementById('shopNoResults');
const resultsCount = document.getElementById('resultsCount');

// ================================
// HIDE SKELETON — KEY FIX
// ================================
function showGrid() {
    // Hide skeleton
    if (loading) {
        loading.style.display = 'none';
        loading.classList.add('d-none');
    }
    // Show grid
    if (grid) {
        grid.style.display = 'grid';
        grid.classList.remove('d-none');
    }
    // Hide no results
    if (noResults) {
        noResults.style.display = 'none';
        noResults.classList.add('d-none');
    }
}

function showNoResults() {
    // Hide skeleton
    if (loading) {
        loading.style.display = 'none';
        loading.classList.add('d-none');
    }
    // Hide grid
    if (grid) {
        grid.style.display = 'none';
        grid.classList.add('d-none');
    }
    // Show no results
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
    if (grid) {
        grid.style.display = 'none';
        grid.classList.add('d-none');
    }
    if (noResults) {
        noResults.style.display = 'none';
        noResults.classList.add('d-none');
    }
}

// ================================
// LOAD ALL PRODUCTS FROM FIREBASE
// ================================
function loadAllProducts() {
    showLoading();

    try {
        const q = query(
            collection(db, 'products'),
            where('status', '==', 'active')
        );

        onSnapshot(q, (snapshot) => {
            allProducts = [];
            snapshot.forEach(doc => {
                allProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            updateFilterCounts();
            renderProducts();
            updateSubtitle();

        }, (error) => {
            console.error('Firebase error:', error);
            // If Firebase fails fall back to
            // showing no results cleanly
            showNoResults();
            if (resultsCount) {
                resultsCount.textContent =
                    'Error loading products.';
            }
        });

    } catch (err) {
        console.error('Load error:', err);
        showNoResults();
    }
}

// ================================
// RENDER PRODUCTS
// ================================
function renderProducts() {
    let filtered = [...allProducts];

    // Apply category/brand filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p =>
            p.brand === currentFilter ||
            p.category === currentFilter
        );
    }

    // Apply search
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
            p.name?.toLowerCase().includes(term) ||
            p.brand?.toLowerCase().includes(term) ||
            p.sku?.toLowerCase().includes(term) ||
            p.colorway?.toLowerCase().includes(term)
        );
    }

    // Apply sort
    switch (currentSort) {
        case 'price-high':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'price-low':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'featured':
            filtered.sort((a, b) =>
                (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
            );
            break;
        case 'name':
            filtered.sort((a, b) =>
                a.name.localeCompare(b.name)
            );
            break;
        default: // newest
            filtered.sort((a, b) =>
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
            );
    }

    // Update results count
    if (resultsCount) {
        resultsCount.textContent =
            `${filtered.length} product${filtered.length !== 1 ? 's' : ''
            }`;
    }

    // Handle empty state
    if (filtered.length === 0) {
        // Update no results message
        const msg = document.getElementById('noResultsMsg');
        if (msg) {
            msg.textContent = searchTerm
                ? `No results for "${searchTerm}"`
                : 'No products in this category yet.';
        }
        showNoResults();
        return;
    }

    // Build HTML
    if (grid) {
        grid.innerHTML = filtered.map((p, i) => `
            <div class="shop-card"
                 data-id="${p.id}"
                 style="animation-delay:${i * 0.04}s"
                 onclick="handleProductClick('${p.id}')">

                <div class="shop-card-img">
                    ${p.featured
                ? `<span class="hot-badge">HOT</span>`
                : ''
            }
                    ${p.stock <= 3 && p.stock > 0
                ? `<span class="low-badge">
                               ${p.stock} LEFT
                           </span>`
                : ''
            }
                    ${p.stock === 0
                ? `<div class="sold-overlay">
                               <span>SOLD OUT</span>
                           </div>`
                : ''
            }
                    ${p.image
                ? `<img src="${p.image}"
                                alt="${p.name}"
                                loading="${i < 4
                    ? 'eager'
                    : 'lazy'}"
                                onerror="this.style.display='none'">`
                : `<div class="no-img-placeholder">
                               <i class="fa-solid fa-shoe-prints"></i>
                           </div>`
            }
                </div>

                <div class="shop-card-info">
                    <p class="shop-card-brand">
                        ${p.brand || p.category || ''}
                    </p>
                    <h3 class="shop-card-name">${p.name}</h3>
                    <p class="shop-card-cat">
                        ${(p.category || '').toUpperCase()}
                    </p>
                    <div class="shop-card-bottom">
                        <div>
                            <p class="shop-card-label">
                                Lowest Ask
                            </p>
                            <p class="shop-card-price">
                                $${parseFloat(p.price)
                .toFixed(0)}
                            </p>
                        </div>
                        ${p.stock > 0
                ? `<button class="shop-buy-btn"
                                   onclick="event.stopPropagation();
                                   handleAddToCart('${p.id}')">
                                   Buy
                               </button>`
                : `<span class="shop-sold-label">
                                   Sold Out
                               </span>`
            }
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Show grid — hides skeletons
    showGrid();
}

// ================================
// FILTER COUNTS
// ================================
function updateFilterCounts() {
    const counts = {
        all: allProducts.length,
        Jordan: allProducts.filter(
            p => p.brand === 'Jordan'
        ).length,
        Nike: allProducts.filter(
            p => p.brand === 'Nike'
        ).length,
        Adidas: allProducts.filter(
            p => p.brand === 'Adidas'
        ).length,
        Sneakers: allProducts.filter(
            p => p.category === 'Sneakers'
        ).length,
        Apparel: allProducts.filter(
            p => p.category === 'Apparel'
        ).length
    };

    Object.entries(counts).forEach(([key, count]) => {
        const el = document.getElementById(`count-${key}`);
        if (el) el.textContent = `(${count})`;
    });
}

// ================================
// UPDATE SUBTITLE
// ================================
function updateSubtitle() {
    const sub = document.getElementById('shopAllSubtitle');
    if (sub && allProducts.length > 0) {
        sub.textContent =
            `${allProducts.length} products available now.`;
    }
}

// ================================
// PRODUCT CLICK
// ================================
window.handleProductClick = (id) => {
    // Try to open modal if app.js has it
    if (typeof openProductModal === 'function') {
        openProductModal(id);
    } else {
        window.location.href = `product.html?id=${id}`;
    }
};

// ================================
// ADD TO CART
// ================================
window.handleAddToCart = (id) => {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    let cart = JSON.parse(
        localStorage.getItem('backdoor-cart')
    ) || [];

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || '',
            size: 'One Size',
            qty: 1
        });
    }

    localStorage.setItem(
        'backdoor-cart',
        JSON.stringify(cart)
    );

    // Update cart count
    updateCartDisplay();

    // Show toast
    const toast = document.getElementById('shopToast');
    if (toast) {
        toast.textContent = `✓ ${product.name} added!`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
};

function updateCartDisplay() {
    const cart = JSON.parse(
        localStorage.getItem('backdoor-cart')
    ) || [];
    const total = cart.reduce(
        (sum, item) => sum + item.qty, 0
    );
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

// ================================
// FILTER TABS
// ================================
document.querySelectorAll('.shop-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-filter-tab')
            .forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderProducts();
    });
});

// ================================
// SORT
// ================================
const sortSelect = document.getElementById('shopSort');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
    });
}

// ================================
// SEARCH
// ================================
let searchDebounce;
const searchInput = document.getElementById('shopSearch');
const clearSearchBtn = document.getElementById('clearSearch');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);

        if (clearSearchBtn) {
            clearSearchBtn.classList.toggle(
                'd-none',
                !e.target.value
            );
        }

        searchDebounce = setTimeout(() => {
            searchTerm = e.target.value.toLowerCase().trim();
            renderProducts();
        }, 300);
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

// ================================
// CLEAR FILTERS
// ================================
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        currentFilter = 'all';
        searchTerm = '';
        currentSort = 'price-high';

        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) {
            clearSearchBtn.classList.add('d-none');
        }
        if (sortSelect) sortSelect.value = 'price-high';

        document.querySelectorAll('.shop-filter-tab')
            .forEach(t => t.classList.remove('active'));
        document.querySelector('[data-filter="all"]')
            ?.classList.add('active');

        renderProducts();
    });
}

// ================================
// URL PARAM — Auto sort
// e.g. shop-all.html?sort=price-high
// ================================
function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get('sort');
    if (sortParam) {
        currentSort = sortParam;
        if (sortSelect) sortSelect.value = sortParam;
    }
}

// ================================
// BACK TO TOP
// ================================
const backBtn = document.getElementById('backTopBtn');
if (backBtn) {
    window.addEventListener('scroll', () => {
        backBtn.style.opacity =
            window.scrollY > 400 ? '1' : '0';
        backBtn.style.pointerEvents =
            window.scrollY > 400 ? 'all' : 'none';
    });

    backBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ================================
// SIDEBAR ACCORDIONS
// ================================
document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
        const accordion = header.closest('.sidebar-accordion');
        if (accordion) {
            accordion.classList.toggle('open');
        }
    });
});

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.initialFilter) {
        document.querySelectorAll('.shop-filter-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`[data-filter="${window.initialFilter}"]`);
        if (activeTab) {
            // Expand the accordion containing this tab if it isn't the first one
            const accordion = activeTab.closest('.sidebar-accordion');
            if (accordion && !accordion.classList.contains('open')) {
                accordion.classList.add('open');
            }
            activeTab.classList.add('active');
        }
    }
    readUrlParams();
    updateCartDisplay();
    loadAllProducts();
});
