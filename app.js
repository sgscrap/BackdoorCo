// ============================================
// BACKDOOR MARKETPLACE - JAVASCRIPT
// ============================================

// ============================================
// PRODUCT DATA
// ============================================
const db = firebase.firestore();
let products = [];
let firebaseLoaded = false;

// ============================================
// FIREBASE DATA SYNC
// ============================================
function initFirebaseSync() {
    console.log('Syncing Shop with Firebase...');
    db.collection('products').where('status', '==', 'active').onSnapshot(snapshot => {
        products = snapshot.docs.map(doc => {
            const data = doc.data();

            // Format sizes nicely because it could be string or array
            let parsedSizes = [];
            if (Array.isArray(data.sizes)) {
                parsedSizes = data.sizes;
            } else if (typeof data.sizes === 'string') {
                parsedSizes = data.sizes.split(',').map(s => {
                    return { size: s.trim(), stock: data.stock || 10, price: parseFloat(data.price) || 0 };
                });
            }

            return {
                id: doc.id,
                name: data.name,
                brand: data.brand || (data.category === 'Sneakers' ? '' : data.category),
                price: parseFloat(data.price) || 0,
                sku: data.sku || '',
                colorway: data.colorway || '',
                releaseDate: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : '',
                category: data.category || 'Uncategorized',
                badge: data.featured ? 'trending' : (data.badge || null),
                sizes: parsedSizes,
                description: data.description || '',
                image: data.image || '',
                images: data.images || [data.image]
            };
        });

        firebaseLoaded = true;
        console.log('Sync Complete: ' + products.length + ' products loaded.');

        // Re-run original setup logic now that we have data
        filteredProducts = [...products];
        applyFilters();
    }, err => {
        console.error('Firebase Sync Error:', err);
        showToast('Error loading products. Please refresh.', 'error');
    });
}

// ============================================
// STATE MANAGEMENT
// ============================================
let filteredProducts = [...products];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedFilters = {
    brands: [],
    categories: [],
    sizes: [],
    maxPrice: 1000,
    searchQuery: '',
    badge: null,
    collection: null
};

// ============================================
// DOM ELEMENTS
// ============================================
const productGrid = document.getElementById('productGrid');
const productCount = document.getElementById('productCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const priceSlider = document.getElementById('priceSlider');
const maxPriceLabel = document.getElementById('maxPrice');
const resetFiltersBtn = document.getElementById('resetFilters');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
const header = document.getElementById('header');

// Modal elements
const productModal = document.getElementById('productModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalCategory = document.getElementById('modalCategory');
const modalTitle = document.getElementById('modalTitle');
const modalSku = document.getElementById('modalSku');
const modalColorway = document.getElementById('modalColorway');
const modalPrice = document.getElementById('modalPrice');
const modalDescription = document.getElementById('modalDescription');
const modalReleaseDate = document.getElementById('modalReleaseDate');
const modalSizeOptions = document.getElementById('modalSizeOptions');
const modalAddToCart = document.getElementById('modalAddToCart');
const modalBadge = document.getElementById('modalBadge');

// Cart elements
const cartButton = document.getElementById('cartButton');
const cartSidebar = document.getElementById('cartSidebar');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initFirebaseSync();
    renderProducts();
    setupEventListeners();
    updateCartUI();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', handleSearch);

    // Sort
    sortSelect.addEventListener('change', handleSort);

    // Nav Links (Top Navigation)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavLink);
    });

    // Brand filter chips
    document.querySelectorAll('.brand-filter').forEach(chip => {
        chip.addEventListener('click', handleBrandFilterChip);
    });

    // Category filter chips
    document.querySelectorAll('.category-filter').forEach(chip => {
        chip.addEventListener('click', handleCategoryFilterChip);
    });

    // Modal
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if (modalAddToCart) modalAddToCart.addEventListener('click', addToCartFromModal);

    // Cart
    cartButton.addEventListener('click', toggleCart);
    if (cartClose) cartClose.addEventListener('click', toggleCart);

    // Product card heart / like functionality (event delegation)
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            const heartIcon = e.target.closest('.card-heart-icon');
            if (heartIcon) {
                e.preventDefault();
                heartIcon.classList.toggle('liked');
                const isLiked = heartIcon.classList.contains('liked');
                const productName = heartIcon.closest('.product-card').querySelector('.product-name').innerText;
                console.log(`${isLiked ? 'Liked' : 'Unliked'}: ${productName}`);
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ============================================
// PRODUCT RENDERING
// ============================================
function renderProducts() {
    if (filteredProducts.length === 0) {
        productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">No products found</h3>
        <p>Try adjusting your filters or search query</p>
      </div>
    `;
        return;
    }

    productGrid.innerHTML = filteredProducts.map(product => `
    <div class="product-card" data-product-id="${product.id}">
      <div class="card-heart-icon">♡</div>
      <div class="product-image-container" onclick="openProductModal(${product.id})">
        <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/400x400/f8f8f8/666?text=${encodeURIComponent(product.brand)}'" loading="lazy">
      </div>
      <div class="product-info" onclick="openProductModal(${product.id})">
        <div class="product-name">${product.name}</div>
        <div class="product-category">${product.category}</div>
        <div class="product-lowest-ask">Lowest Ask</div>
        <div class="product-price">$${product.price.toFixed(0)}</div>
      </div>
      <button class="quick-view-btn" onclick="openProductModal(${product.id})">View</button>
    </div>
  `).join('');
}

// ============================================
// FILTERING
// ============================================
function applyFilters() {
    filteredProducts = products.filter(product => {
        // Brand filter
        if (selectedFilters.brands.length > 0 && !selectedFilters.brands.includes(product.brand)) {
            return false;
        }

        // Category filter
        if (selectedFilters.categories.length > 0 && !selectedFilters.categories.includes(product.category)) {
            return false;
        }

        // Collection filter
        if (selectedFilters.collection) {
            const col = selectedFilters.collection;
            if (col === 'Trending' && !(product.badge === 'bestseller' || product.badge === 'trending')) return false;
            if (col === 'Deals' && product.price > 200) return false;
            if (col === 'Kids' && !(product.name.toLowerCase().includes('kids') || product.name.toLowerCase().includes('gs'))) return false;
            if (col === 'Men' && product.category !== 'Sneakers' && product.category !== 'Apparel') return false; // Default logic
        }

        // Badge filter (New Releases / Trending)
        if (selectedFilters.badge && product.badge !== selectedFilters.badge) {
            return false;
        }

        // Price filter
        if (product.price > selectedFilters.maxPrice) {
            return false;
        }

        // Size filter
        if (selectedFilters.sizes.length > 0) {
            const hasSize = selectedFilters.sizes.some(size =>
                product.sizes.some(productSize => productSize.includes(size))
            );
            if (!hasSize) return false;
        }

        // Search filter
        if (selectedFilters.searchQuery) {
            const query = selectedFilters.searchQuery.toLowerCase();
            const searchableText = `${product.name} ${product.brand} ${product.colorway} ${product.sku}`.toLowerCase();
            if (!searchableText.includes(query)) {
                return false;
            }
        }

        return true;
    });

    renderProducts();
    updateFilterCounts();
}

function updateFilterCounts() {
    const counts = {
        all: products.length,
        Jordan: products.filter(p => (p.brand || '').toLowerCase() === 'jordan').length,
        Nike: products.filter(p => (p.brand || '').toLowerCase() === 'nike').length,
        Adidas: products.filter(p => (p.brand || '').toLowerCase() === 'adidas').length,
        Sneakers: products.filter(p => (p.category || '').toLowerCase() === 'sneakers').length,
        Apparel: products.filter(p => (p.category || '').toLowerCase() === 'apparel').length
    };

    document.querySelectorAll('.filter-count').forEach(span => {
        const type = span.dataset.count;
        if (counts[type] !== undefined) {
            span.textContent = `(${counts[type]})`;
        }
    });
}

function handleSearch(e) {
    selectedFilters.searchQuery = e.target.value;
    applyFilters();
}

function handleSort(e) {
    const sortValue = e.target.value;

    switch (sortValue) {
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
            filteredProducts.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
            break;
        default:
            // Featured - restore original order
            applyFilters();
            return;
    }

    renderProducts();
}

function handleNavLink(e) {
    e.preventDefault();
    const link = e.target;
    const text = link.textContent.trim();

    // Update active state
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Reset other filters for clean navigation
    selectedFilters.brands = [];
    selectedFilters.categories = [];
    selectedFilters.badge = null;

    // Clear chips active state
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.brand-filter[data-brand="all"]')?.classList.add('active');

    switch (text) {
        case 'Sneakers':
            selectedFilters.categories = ['Sneakers'];
            // Sync chip
            document.querySelector('.brand-filter[data-brand="all"]')?.classList.remove('active');
            const sneakerChip = document.querySelector('.category-filter[data-category="Sneakers"]');
            if (sneakerChip) {
                document.querySelectorAll('.category-filter').forEach(c => c.classList.remove('active'));
                sneakerChip.classList.add('active');
            }
            break;
        case 'Apparel':
            selectedFilters.categories = ['Apparel'];
            // Sync chip
            document.querySelector('.brand-filter[data-brand="all"]')?.classList.remove('active');
            const apparelChip = document.querySelector('.category-filter[data-category="Apparel"]');
            if (apparelChip) {
                document.querySelectorAll('.category-filter').forEach(c => c.classList.remove('active'));
                apparelChip.classList.add('active');
            }
            break;
        case 'Trending':
            selectedFilters.collection = 'Trending';
            break;
        case 'Deals':
            selectedFilters.collection = 'Deals';
            break;
        case 'Men':
            selectedFilters.collection = 'Men';
            break;
        case 'Kids':
            selectedFilters.collection = 'Kids';
            break;
        case 'All':
        default:
            // Reset is default handled above by clearing selectedFilters
            break;
    }

    applyFilters();
}

function handleBrandFilterChip(e) {
    const chip = e.target;
    const brand = chip.dataset.brand;

    // Handle "All" chip
    if (brand === 'all') {
        selectedFilters.brands = [];
        document.querySelectorAll('.brand-filter').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
        return;
    }

    // Remove "All" active state
    document.querySelector('.brand-filter[data-brand="all"]')?.classList.remove('active');

    // Toggle chip
    chip.classList.toggle('active');

    if (chip.classList.contains('active')) {
        if (!selectedFilters.brands.includes(brand)) {
            selectedFilters.brands.push(brand);
        }
    } else {
        selectedFilters.brands = selectedFilters.brands.filter(b => b !== brand);
        // If no brands selected, activate "All"
        if (selectedFilters.brands.length === 0) {
            document.querySelector('.brand-filter[data-brand="all"]')?.classList.add('active');
        }
    }
    applyFilters();
}

function handleCategoryFilterChip(e) {
    const chip = e.target;
    const category = chip.dataset.category;

    // Toggle chip
    chip.classList.toggle('active');

    if (chip.classList.contains('active')) {
        if (!selectedFilters.categories.includes(category)) {
            selectedFilters.categories.push(category);
        }
    } else {
        selectedFilters.categories = selectedFilters.categories.filter(c => c !== category);
    }
    applyFilters();
}

function handlePriceFilter(e) {
    selectedFilters.maxPrice = parseInt(e.target.value);
    if (maxPriceLabel) {
        maxPriceLabel.textContent = selectedFilters.maxPrice >= 1000 ? '$1000+' : `$${selectedFilters.maxPrice}`;
    }
    applyFilters();
}

function handleBrandFilter(e) {
    const brand = e.target.value;
    if (e.target.checked) {
        selectedFilters.brands.push(brand);
    } else {
        selectedFilters.brands = selectedFilters.brands.filter(b => b !== brand);
    }
    applyFilters();
}

function handleCategoryFilter(e) {
    const category = e.target.value;
    if (e.target.checked) {
        selectedFilters.categories.push(category);
    } else {
        selectedFilters.categories = selectedFilters.categories.filter(c => c !== category);
    }
    applyFilters();
}

function handleSizeFilter(e) {
    const size = e.target.dataset.size;
    e.target.classList.toggle('active');

    if (e.target.classList.contains('active')) {
        selectedFilters.sizes.push(size);
    } else {
        selectedFilters.sizes = selectedFilters.sizes.filter(s => s !== size);
    }
    applyFilters();
}

function resetFilters() {
    selectedFilters = {
        brands: [],
        categories: [],
        sizes: [],
        maxPrice: 1000,
        searchQuery: '',
        badge: null,
        collection: null
    };

    // Reset UI
    searchInput.value = '';
    if (priceSlider) {
        priceSlider.value = 1000;
        if (maxPriceLabel) maxPriceLabel.textContent = '$1000+';
    }
    sortSelect.value = 'featured';

    // Reset filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    document.querySelector('.brand-filter[data-brand="all"]')?.classList.add('active');

    document.querySelectorAll('.brand-filter, .category-filter').forEach(checkbox => {
        checkbox.checked = checkbox.name === 'category' && checkbox.value === 'Sneakers';
    });

    document.querySelectorAll('.size-option').forEach(button => {
        button.classList.remove('active');
    });

    applyFilters();
}

// ============================================
// MODAL
// ============================================
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Populate modal
    modalImage.src = product.image;
    modalImage.alt = product.name;
    modalImage.onerror = () => {
        modalImage.src = `https://via.placeholder.com/600x600/1a1a1a/8B5CF6?text=${encodeURIComponent(product.name)}`;
    };
    if (modalCategory) modalCategory.textContent = product.category.toUpperCase();
    modalTitle.textContent = product.name;
    modalSku.textContent = `SKU: ${product.sku}`;
    modalColorway.textContent = product.colorway;
    modalPrice.textContent = `$${product.price.toFixed(2)}`;
    modalDescription.textContent = product.description;
    modalReleaseDate.textContent = product.releaseDate;

    // Badge
    if (product.badge) {
        modalBadge.textContent = product.badge;
        modalBadge.className = `modal-badge badge-${product.badge}`;
        modalBadge.style.display = 'inline-block';
    } else {
        modalBadge.style.display = 'none';
    }

    // Populate sizes
    modalSizeOptions.innerHTML = product.sizes.map(s => {
        const isSoldOut = s.stock === 0;
        return `
            <div class="size-option ${isSoldOut ? 'sold-out' : ''}" 
                 data-size="${s.size}" 
                 onclick="${isSoldOut ? '' : 'selectModalSize(this)'}">
                ${s.size}${isSoldOut ? ' - Sold Out' : ''}
            </div>
        `;
    }).join('');

    // Store product ID on modal
    productModal.dataset.productId = productId;

    // Show modal
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    productModal.classList.remove('active');
    document.body.style.overflow = '';
}

let selectedModalSizeValue = null;

function selectModalSize(element) {
    // Remove selected class from all options
    document.querySelectorAll('.modal .size-option').forEach(opt => opt.classList.remove('selected'));
    // Add selected class to clicked option
    element.classList.add('selected');
    selectedModalSizeValue = element.dataset.size;
}

function addToCartFromModal() {
    const productId = parseInt(productModal.dataset.productId);
    const selectedSize = selectedModalSizeValue;

    if (!selectedSize) {
        alert('Please select a size');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Advanced cart logic: prevent duplicates of same product + size
    const existingIndex = cart.findIndex(item => item.id === productId && item.size === selectedSize);

    if (existingIndex !== -1) {
        alert('This size is already in your cart');
        return;
    }

    // Get specific price for this size
    const sizeData = product.sizes.find(s => s.size === selectedSize);
    const price = sizeData ? sizeData.price : product.price;

    cart.push({
        id: productId,
        name: product.name,
        price: price,
        size: selectedSize,
        image: product.image,
        quantity: 1
    });

    saveCart();
    updateCartUI();
    closeModal();

    // Show cart briefly
    cartSidebar.classList.add('active');
    setTimeout(() => {
        if (cartSidebar.classList.contains('active')) {
            setTimeout(() => {
                cartSidebar.classList.remove('active');
            }, 3000);
        }
    }, 100);
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ============================================
// CART
// ============================================
function toggleCart() {
    cartSidebar.classList.toggle('active');
}

function updateCartUI() {
    // Safety guard for non-marketplace pages
    if (!cartCount || !cartItems || !cartTotal) return;

    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';

    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        cartTotal.textContent = '$0.00';
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/8B5CF6'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-size">Size: ${item.size}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${index})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

    // Update total
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}


// ============================================
// COMING SOON MODAL LOGIC
// ============================================
const comingSoonModal = document.getElementById('comingSoonModal');
const comingSoonTitle = document.getElementById('comingSoonTitle');
const comingSoonMessage = document.getElementById('comingSoonMessage');
const comingSoonClose = document.getElementById('comingSoonClose');
const comingSoonOverlay = document.getElementById('comingSoonOverlay');
const comingSoonAck = document.getElementById('comingSoonAck');
const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');

function showComingSoon(featureName = "") {
    if (featureName) {
        comingSoonTitle.textContent = `${featureName} Coming Soon`;
        comingSoonMessage.textContent = `The ${featureName.toLowerCase()} feature is currently being refined for our archive collection. stay tuned!`;
    } else {
        comingSoonTitle.textContent = "Coming Soon";
        comingSoonMessage.textContent = "This feature is currently being refined for our archive collection. Stay tuned!";
    }
    comingSoonModal.classList.add('active');
}

function closeComingSoon() {
    comingSoonModal.classList.remove('active');
}

if (comingSoonClose) comingSoonClose.onclick = closeComingSoon;
if (comingSoonOverlay) comingSoonOverlay.onclick = closeComingSoon;
if (comingSoonAck) comingSoonAck.onclick = closeComingSoon;

// Global listener for all elements with .coming-soon
document.addEventListener('click', (e) => {
    const target = e.target.closest('.coming-soon');
    if (target) {
        const feature = target.dataset.feature || "";
        showComingSoon(feature);
    }
});

if (cartCheckoutBtn) {
    cartCheckoutBtn.onclick = () => {
        window.location.href = 'checkout.html';
    };
}

// Make functions globally available
window.openProductModal = openProductModal;
window.showComingSoon = showComingSoon;
window.closeComingSoon = closeComingSoon;
window.removeFromCart = removeFromCart;
window.selectModalSize = selectModalSize;
