// ============================================
// BACKDOOR MARKETPLACE - JAVASCRIPT
// ============================================

// ============================================
// PRODUCT DATA
// ============================================
const products = [
    {
        id: 1,
        name: "Pharrell x VIRGINIA x Adistar Jellyfish 'Royal Blue'",
        brand: "Adidas",
        price: 249.00,
        sku: "JP9263",
        colorway: "Royal Blue/Core Black/Focus Olive",
        releaseDate: "10/25/25",
        category: "Sneakers",
        badge: "new",
        sizes: ["Y/US4", "Y/US4.5", "Y/US5", "Y/US5.5", "Y/US6", "Y/US6.5", "M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9"],
        description: "The Pharrell x VIRGINIA x Adistar Jellyfish features a unique design with royal blue accents and innovative materials.",
        image: "products/pharrell-jellyfish-blue.jpg"
    },
    {
        id: 2,
        name: "Pharrell x VIRGINIA x Adistar Jellyfish 'Solid Grey Black'",
        brand: "Adidas",
        price: 249.00,
        sku: "JP9265",
        colorway: "Mgh Solid Grey/Core Black/Clear Onix",
        releaseDate: "10/11/25",
        category: "Sneakers",
        badge: "new",
        sizes: ["Y/US4", "Y/US4.5", "Y/US5", "Y/US5.5", "Y/US6", "Y/US6.5", "M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9"],
        description: "A sleek colorway of the Pharrell collaboration featuring solid grey and black tones.",
        image: "products/pharrell-jellyfish-grey.jpg"
    },
    {
        id: 3,
        name: "Caitlin Clark x Zoom Kobe 6 Protro 'Light Armory Blue'",
        brand: "Nike",
        price: 249.00,
        sku: "IO3672 400",
        colorway: "Light Armory Blue/White/Baltic Blue",
        releaseDate: "11/12/25",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Features a white Cushlon midsole with large Zoom Air forefoot unit and micromesh upper with scaly-textured 'islands'.",
        image: "products/kobe-6-caitlin-clark.jpg"
    },
    {
        id: 4,
        name: "Cactus Plant Flea Market x Air Force 1 Low Premium 'Moss'",
        brand: "Nike",
        price: 299.00,
        sku: "FQ7069 300",
        colorway: "Moss/Moss",
        releaseDate: "5/1/24",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Tumbled leather upper with prominent logos inspired by the Air More Uptempo; 'Air' and 'Sunshine' wordmarks.",
        image: "products/af1-cpfm-moss.jpg"
    },
    {
        id: 5,
        name: "Fragment Design x Travis Scott x Jordan 1 Low OG SP 'Sail Military Blue'",
        brand: "Jordan",
        price: 899.00,
        sku: "DM7866 140",
        colorway: "Sail/Black/Muslin/Military Blue",
        releaseDate: "7/29/21",
        category: "Sneakers",
        badge: "bestseller",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "White leather base, black forefoot overlay, and Travis's signature reverse Swoosh in royal blue.",
        image: "products/jordan-1-fragment-travis.jpg"
    },
    {
        id: 6,
        name: "Steve Wiebe x Jordan 10 Retro 'HOH'",
        brand: "Jordan",
        price: 499.00,
        sku: "DD0587 002",
        colorway: "Light Graphite/White/Wolf Grey",
        releaseDate: "1/10/26",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Exclusive House of Hoops collaboration featuring premium materials and unique colorway.",
        image: "products/jordan-10-hoh.jpg"
    },
    {
        id: 7,
        name: "Jordan 5 Retro 'Wolf Grey' 2026 GS",
        brand: "Jordan",
        price: 260.00,
        sku: "DD0587 002",
        colorway: "Light Graphite/White/Wolf Grey",
        releaseDate: "1/10/26",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Grey layered nubuck upper with white contrast stitching and silver reflective tongue.",
        image: "products/jordan-5-wolf-grey.jpg"
    },
    {
        id: 8,
        name: "Jordan 10 Retro 'Shadow' 2025",
        brand: "Jordan",
        price: 260.00,
        sku: "HJ6779 001",
        colorway: "Charred Grey/True Red/Black",
        releaseDate: "11/19/25",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Classic Jordan 10 silhouette in the iconic Shadow colorway with premium materials.",
        image: "products/jordan-10-shadow.jpg"
    },
    {
        id: 9,
        name: "Paris Saint-Germain x Jordan 5 Retro 'Off Noir'",
        brand: "Jordan",
        price: 250.00,
        sku: "HQ3004 001",
        colorway: "Off Noir/Particle Rose/Anthracite/Pearl Pink/Sail",
        releaseDate: "12/3/25",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "PSG collaboration featuring team colors and premium construction.",
        image: "products/jordan-5-psg.jpg"
    },
    {
        id: 10,
        name: "Jalen Brunson x Zoom Kobe 6 Protro 'Statue of Liberty'",
        brand: "Nike",
        price: 250.00,
        sku: "IQ5774 300",
        colorway: "Hyper Turquoise/Metallic Copper",
        releaseDate: "12/15/24",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US12.5", "M/US13", "M/US14", "M/US15"],
        description: "Jalen Brunson PE featuring Statue of Liberty inspired colorway with turquoise and copper accents.",
        image: "products/kobe-6-brunson.jpg"
    },
    {
        id: 11,
        name: "Jordan 4 Retro 'Black Cat' 2025",
        brand: "Jordan",
        price: 250.00,
        sku: "FV5029 010",
        colorway: "Black/Black/Light Graphite",
        releaseDate: "11/28/25",
        category: "Sneakers",
        badge: "bestseller",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13", "M/US14"],
        description: "The iconic all-black Jordan 4 returns with premium nubuck construction.",
        image: "products/jordan-4-black-cat.jpg"
    },
    {
        id: 12,
        name: "Zoom Kobe 6 Protro 'Reverse Grinch'",
        brand: "Nike",
        price: 260.00,
        sku: "FV4921 600",
        colorway: "Bright Crimson/Black/Electric Green",
        releaseDate: "12/15/23",
        category: "Sneakers",
        badge: "sale",
        sizes: ["M/US8", "M/US8.5", "M/US14"],
        description: "Limited edition Reverse Grinch colorway with bright crimson and electric green.",
        image: "products/kobe-6-reverse-grinch.jpg"
    },
    {
        id: 13,
        name: "Air Jordan 3 Retro OG SP 'For The Love'",
        brand: "Jordan",
        price: 190.00,
        sku: "HV8571 100",
        colorway: "White/Diffused Blue/Anthracite/Muslin",
        releaseDate: "4/15/25",
        category: "Sneakers",
        badge: "bestseller",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13", "M/US14"],
        description: "Special edition Jordan 3 celebrating the love of the game with unique colorway.",
        image: "products/jordan-3-for-the-love.jpg"
    },
    {
        id: 14,
        name: "Jordan 14 'Black University Blue'",
        brand: "Jordan",
        price: 275.00,
        sku: "DH4121 041",
        colorway: "Black/University Blue",
        releaseDate: "2/15/25",
        category: "Sneakers",
        badge: "bestseller",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Matte black nubuck upper with University Blue vents; inspired by MJ's love of luxury sports cars.",
        image: "products/jordan-14-black-blue.jpg"
    },
    {
        id: 15,
        name: "Nike x NOCTA 'Sunset' Puffer Jacket – Mica Green / Cyber",
        brand: "Nike",
        price: 420.00,
        sku: "FN8196-330",
        colorway: "Mica Green/Cyber",
        releaseDate: "11/1/24",
        category: "Apparel",
        badge: "new",
        sizes: ["Small", "Medium", "Large", "X-Large"],
        description: "Insulated down fill, metallic mica-green quilted shell, and minimal NOCTA branding.",
        image: "products/nocta-sunset-jacket.jpg"
    },
    {
        id: 16,
        name: "Godkiller Virgil Abloh Archive™ x Air Jordan 1 High OG \"Alaska\" Retro",
        brand: "Jordan",
        price: 1647.20,
        sku: "AA3834-100",
        colorway: "White/White",
        releaseDate: "3/3/18",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13", "M/US14"],
        description: "The elusive Off-White x Air Jordan 1 'Alaska' (White) featuring deconstructed leather and Virgil Abloh's signature typography.",
        image: "products/jordan-1-ow-alaska.jpg"
    }
];

// ============================================
// STATE MANAGEMENT
// ============================================
let filteredProducts = [...products];
let cart = [];
let selectedFilters = {
    brands: [],
    categories: [],
    sizes: [],
    maxPrice: 1000,
    searchQuery: ''
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
const modalTitle = document.getElementById('modalTitle');
const modalSku = document.getElementById('modalSku');
const modalColorway = document.getElementById('modalColorway');
const modalPrice = document.getElementById('modalPrice');
const modalDescription = document.getElementById('modalDescription');
const modalReleaseDate = document.getElementById('modalReleaseDate');
const modalSizeSelect = document.getElementById('modalSizeSelect');
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
        <div class="product-price">$${product.price.toFixed(0)}</div>
        <div class="product-lowest-ask">Lowest Ask</div>
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
            document.querySelector('.category-filter[data-category="Sneakers"]')?.classList.add('active');
            break;
        case 'Apparel':
            selectedFilters.categories = ['Apparel'];
            // Sync chip
            document.querySelector('.brand-filter[data-brand="all"]')?.classList.remove('active');
            document.querySelector('.category-filter[data-category="Apparel"]')?.classList.add('active');
            break;
        case 'New Releases':
            selectedFilters.badge = 'new';
            break;
        case 'Trending':
            selectedFilters.badge = 'bestseller';
            break;
        case 'All':
        default:
            // Reset is default
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
        searchQuery: ''
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
    modalSizeSelect.innerHTML = '<option value="">Choose a size</option>' +
        product.sizes.map(size => `<option value="${size}">${size}</option>`).join('');

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

function addToCartFromModal() {
    const productId = parseInt(productModal.dataset.productId);
    const selectedSize = modalSizeSelect.value;

    if (!selectedSize) {
        alert('Please select a size');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if item already in cart
    const existingItem = cart.find(item => item.id === productId && item.size === selectedSize);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            size: selectedSize,
            image: product.image,
            quantity: 1
        });
    }

    updateCartUI();
    closeModal();

    // Show cart briefly
    cartSidebar.classList.add('active');
    setTimeout(() => {
        if (cartSidebar.classList.contains('active')) {
            // Auto-close after 3 seconds if user doesn't interact
            setTimeout(() => {
                cartSidebar.classList.remove('active');
            }, 3000);
        }
    }, 100);
}

// ============================================
// CART
// ============================================
function toggleCart() {
    cartSidebar.classList.toggle('active');
}

function updateCartUI() {
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
        <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
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
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}


// Make functions globally available
window.openProductModal = openProductModal;
window.removeFromCart = removeFromCart;
