// ============================================
// BACKDOOR MARKETPLACE
// ============================================

const products = [
    {
        id: 1,
        name: "Pharrell x VIRGINIA x Adistar Jellyfish 'Royal Blue'",
        brand: "Adidas",
        price: 249.0,
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
        price: 249.0,
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
        price: 249.0,
        sku: "IO3672 400",
        colorway: "Light Armory Blue/White/Baltic Blue",
        releaseDate: "11/12/25",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Features a white Cushlon midsole with large Zoom Air forefoot unit and micromesh upper with scaly-textured islands.",
        image: "products/kobe-6-caitlin-clark.jpg"
    },
    {
        id: 4,
        name: "Cactus Plant Flea Market x Air Force 1 Low Premium 'Moss'",
        brand: "Nike",
        price: 299.0,
        sku: "FQ7069 300",
        colorway: "Moss/Moss",
        releaseDate: "5/1/24",
        category: "Sneakers",
        badge: "new",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Tumbled leather upper with prominent logos inspired by the Air More Uptempo, plus Air and Sunshine wordmarks.",
        image: "products/af1-cpfm-moss.jpg"
    },
    {
        id: 5,
        name: "Fragment Design x Travis Scott x Jordan 1 Low OG SP 'Sail Military Blue'",
        brand: "Jordan",
        price: 899.0,
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
        price: 499.0,
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
        price: 260.0,
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
        price: 260.0,
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
        price: 250.0,
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
        price: 250.0,
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
        price: 250.0,
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
        price: 260.0,
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
        price: 190.0,
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
        price: 275.0,
        sku: "DH4121 041",
        colorway: "Black/University Blue",
        releaseDate: "2/15/25",
        category: "Sneakers",
        badge: "bestseller",
        sizes: ["M/US7", "M/US7.5", "M/US8", "M/US8.5", "M/US9", "M/US9.5", "M/US10", "M/US10.5", "M/US11", "M/US11.5", "M/US12", "M/US13"],
        description: "Matte black nubuck upper with University Blue vents inspired by MJ's love of luxury sports cars.",
        image: "products/jordan-14-black-blue.jpg"
    },
    {
        id: 15,
        name: "Nike x NOCTA 'Sunset' Puffer Jacket - Mica Green / Cyber",
        brand: "Nike",
        price: 420.0,
        sku: "FN8196-330",
        colorway: "Mica Green/Cyber",
        releaseDate: "11/1/24",
        category: "Apparel",
        badge: "new",
        sizes: ["Small", "Medium", "Large", "X-Large"],
        description: "Insulated down fill, metallic mica-green quilted shell, and minimal NOCTA branding.",
        image: "products/nocta-sunset-jacket.jpg"
    }
];

const defaultProducts = products.map(product => ({ ...product }));
const STORAGE_KEYS = {
    PRODUCTS: "backdoor_products"
};

let filteredProducts = [];
let cart = [];
let selectedModalSize = "";
let selectedFilters = {
    brands: [],
    categories: [],
    sizes: [],
    maxPrice: 1000,
    searchQuery: "",
    badge: null,
    sortBy: "featured"
};

const productCardNodes = new Map();

const productGrid = document.getElementById("productGrid");
const productCount = document.getElementById("productCount");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const priceSlider = document.getElementById("priceSlider");
const maxPriceLabel = document.getElementById("maxPrice");
const resetFiltersBtn = document.getElementById("resetFilters");

const productModal = document.getElementById("productModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalImage = document.getElementById("modalImage") || document.querySelector(".modal-image");
const modalCategory = document.getElementById("modalCategory") || document.querySelector(".modal-category");
const modalTitle = document.getElementById("modalTitle") || document.querySelector(".modal-name");
const modalPrice = document.getElementById("modalPrice") || document.querySelector(".modal-price");
const modalMeta = document.getElementById("modalMeta") || document.querySelector(".modal-lowest-ask");
const modalDescription = document.getElementById("modalDescription");
const modalSizeOptions = document.getElementById("modalSizeOptions") || document.querySelector(".size-options");
const modalAddToCart = document.getElementById("modalAddToCart");
const modalBadge = document.getElementById("modalBadge");

const cartButton = document.getElementById("cartButton") || document.querySelector(".cart-btn");
const cartSidebar = document.getElementById("cartSidebar");
const cartClose = document.getElementById("cartClose");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount") || document.querySelector(".cart-count");
const cartTotal = document.getElementById("cartTotal");

document.addEventListener("DOMContentLoaded", () => {
    loadProductsFromStorage();
    initializeFilterUI();
    setupEventListeners();
    applyFilters();
    updateCartUI();
});

function initializeFilterUI() {
    document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.add("active");

    if (sortSelect) {
        sortSelect.value = selectedFilters.sortBy;
    }
}

function debounce(fn, delay) {
    let timeoutId = null;

    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    };
}

function hydrateProduct(product, index) {
    const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 10;
    const isHidden = Boolean(product.isHidden);
    const isOutOfStock = Boolean(product.isOutOfStock) || stock <= 0;
    const isFeatured = Boolean(product.isFeatured);

    return {
        ...product,
        stock,
        isHidden,
        isOutOfStock,
        isFeatured,
        sortOrder: index,
        releaseTimestamp: Date.parse(product.releaseDate) || 0,
        searchText: [
            product.name,
            product.brand,
            product.colorway,
            product.sku,
            product.category
        ].join(" ").toLowerCase()
    };
}

function replaceProducts(nextProducts) {
    products.splice(0, products.length, ...nextProducts.map((product, index) => hydrateProduct(product, index)));
    filteredProducts = [...products];
    productCardNodes.clear();
}

function loadProductsFromStorage() {
    try {
        const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        const source = savedProducts ? JSON.parse(savedProducts) : defaultProducts;
        replaceProducts(source);
    } catch (error) {
        console.error("Unable to load saved products. Falling back to defaults.", error);
        replaceProducts(defaultProducts);
    }
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener("input", debounce(handleSearch, 180));
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", handleSort);
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", resetFilters);
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", handleNavLink);
    });

    document.querySelectorAll(".brand-filter").forEach(chip => {
        chip.addEventListener("click", handleBrandFilterChip);
    });

    document.querySelectorAll(".category-filter").forEach(chip => {
        chip.addEventListener("click", handleCategoryFilterChip);
    });

    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modalOverlay) modalOverlay.addEventListener("click", closeModal);
    if (modalAddToCart) modalAddToCart.addEventListener("click", addToCartFromModal);
    if (modalSizeOptions) modalSizeOptions.addEventListener("click", handleModalSizeSelection);

    if (cartButton) cartButton.addEventListener("click", toggleCart);
    if (cartClose) cartClose.addEventListener("click", toggleCart);
    if (cartItems) cartItems.addEventListener("click", handleCartAction);
    if (productGrid) productGrid.addEventListener("click", handleProductGridClick);

    window.addEventListener("storage", handleStorageSync);
}

function handleStorageSync(event) {
    if (event.key !== STORAGE_KEYS.PRODUCTS) {
        return;
    }

    loadProductsFromStorage();
    applyFilters();
}

function handleProductGridClick(event) {
    const heartIcon = event.target.closest(".card-heart-icon");
    if (heartIcon) {
        event.preventDefault();
        heartIcon.classList.toggle("liked");
        return;
    }

    const openTarget = event.target.closest("[data-action=\"open-modal\"]");
    if (!openTarget) {
        return;
    }

    const card = openTarget.closest(".product-card");
    if (!card) {
        return;
    }

    openProductModal(Number(card.dataset.productId));
}

function handleCartAction(event) {
    const removeButton = event.target.closest(".cart-item-remove");
    if (!removeButton) {
        return;
    }

    removeFromCart(Number(removeButton.dataset.index));
}

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = `product-card${product.isOutOfStock ? " product-card--out-of-stock" : ""}`;
    card.dataset.productId = String(product.id);

    const statusLabel = product.isOutOfStock
        ? "Out of Stock"
        : product.isFeatured
            ? "Featured"
            : "";

    const statusBadge = statusLabel
        ? `<div class="product-status-pill${product.isFeatured && !product.isOutOfStock ? " product-status-pill--featured" : ""}">${statusLabel}</div>`
        : "";

    card.innerHTML = `
      <button class="card-heart-icon" type="button" aria-label="Save product">&#9825;</button>
      <div class="product-image-container" data-action="open-modal">
        ${statusBadge}
        <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" decoding="async">
      </div>
      <div class="product-info" data-action="open-modal">
        <div class="product-name">${product.name}</div>
        <div class="product-category">${product.category}</div>
        <div class="product-price">$${product.price.toFixed(0)}</div>
        <div class="product-lowest-ask">${product.isOutOfStock ? "Currently unavailable" : product.isFeatured ? "Featured pick" : "Lowest Ask"}</div>
      </div>
      <button class="quick-view-btn" type="button" data-action="open-modal">
        ${product.isOutOfStock ? "Details" : "View"}
      </button>
    `;

    return card;
}

function renderProducts() {
    if (!productGrid) {
        return;
    }

    if (productCount) {
        productCount.textContent = String(filteredProducts.length);
    }

    if (filteredProducts.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "product-empty-state";
        emptyState.innerHTML = `
          <h3>No products found</h3>
          <p>Try adjusting your filters or search query.</p>
        `;
        productGrid.replaceChildren(emptyState);
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredProducts.forEach(product => {
        let card = productCardNodes.get(product.id);
        if (!card) {
            card = createProductCard(product);
            productCardNodes.set(product.id, card);
        }

        fragment.appendChild(card);
    });

    productGrid.replaceChildren(fragment);
}

function sortFilteredProducts() {
    switch (selectedFilters.sortBy) {
        case "price-low":
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case "price-high":
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case "newest":
            filteredProducts.sort((a, b) => b.releaseTimestamp - a.releaseTimestamp);
            break;
        case "featured":
        default:
            filteredProducts.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder);
            break;
    }
}

function applyFilters() {
    const query = selectedFilters.searchQuery.trim().toLowerCase();

    filteredProducts = products.filter(product => {
        if (product.isHidden) {
            return false;
        }

        if (selectedFilters.brands.length > 0 && !selectedFilters.brands.includes(product.brand)) {
            return false;
        }

        if (selectedFilters.categories.length > 0 && !selectedFilters.categories.includes(product.category)) {
            return false;
        }

        if (selectedFilters.badge && product.badge !== selectedFilters.badge) {
            return false;
        }

        if (product.price > selectedFilters.maxPrice) {
            return false;
        }

        if (selectedFilters.sizes.length > 0) {
            const hasSize = selectedFilters.sizes.some(size =>
                product.sizes.some(productSize => productSize.includes(size))
            );

            if (!hasSize) {
                return false;
            }
        }

        if (query && !product.searchText.includes(query)) {
            return false;
        }

        return true;
    });

    sortFilteredProducts();
    renderProducts();
}

function handleSearch(event) {
    selectedFilters.searchQuery = event.target.value;
    applyFilters();
}

function handleSort(event) {
    selectedFilters.sortBy = event.target.value;
    sortFilteredProducts();
    renderProducts();
}

function handleNavLink(event) {
    event.preventDefault();
    const link = event.currentTarget;
    const text = link.textContent.trim();

    document.querySelectorAll(".nav-link").forEach(navLink => navLink.classList.remove("active"));
    link.classList.add("active");

    selectedFilters.brands = [];
    selectedFilters.categories = [];
    selectedFilters.badge = null;

    document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.remove("active"));
    document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.add("active");

    switch (text) {
        case "Sneakers":
            selectedFilters.categories = ["Sneakers"];
            document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.remove("active");
            document.querySelector(".category-filter[data-category=\"Sneakers\"]")?.classList.add("active");
            break;
        case "Apparel":
            selectedFilters.categories = ["Apparel"];
            document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.remove("active");
            document.querySelector(".category-filter[data-category=\"Apparel\"]")?.classList.add("active");
            break;
        case "New Releases":
            selectedFilters.badge = "new";
            break;
        case "Trending":
            selectedFilters.badge = "bestseller";
            break;
        default:
            break;
    }

    applyFilters();
}

function handleBrandFilterChip(event) {
    const chip = event.currentTarget;
    const brand = chip.dataset.brand;

    if (brand === "all") {
        selectedFilters.brands = [];
        document.querySelectorAll(".brand-filter").forEach(filterChip => filterChip.classList.remove("active"));
        chip.classList.add("active");
        applyFilters();
        return;
    }

    document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.remove("active");
    chip.classList.toggle("active");

    if (chip.classList.contains("active")) {
        if (!selectedFilters.brands.includes(brand)) {
            selectedFilters.brands.push(brand);
        }
    } else {
        selectedFilters.brands = selectedFilters.brands.filter(activeBrand => activeBrand !== brand);
        if (selectedFilters.brands.length === 0) {
            document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.add("active");
        }
    }

    applyFilters();
}

function handleCategoryFilterChip(event) {
    const chip = event.currentTarget;
    const category = chip.dataset.category;

    chip.classList.toggle("active");

    if (chip.classList.contains("active")) {
        if (!selectedFilters.categories.includes(category)) {
            selectedFilters.categories.push(category);
        }
    } else {
        selectedFilters.categories = selectedFilters.categories.filter(activeCategory => activeCategory !== category);
    }

    applyFilters();
}

function resetFilters() {
    selectedFilters = {
        brands: [],
        categories: [],
        sizes: [],
        maxPrice: 1000,
        searchQuery: "",
        badge: null,
        sortBy: "featured"
    };

    if (searchInput) {
        searchInput.value = "";
    }

    if (priceSlider) {
        priceSlider.value = "1000";
    }

    if (maxPriceLabel) {
        maxPriceLabel.textContent = "$1000+";
    }

    if (sortSelect) {
        sortSelect.value = selectedFilters.sortBy;
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.textContent.trim() === "All");
    });

    document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.remove("active"));
    document.querySelector(".brand-filter[data-brand=\"all\"]")?.classList.add("active");

    if (modalSizeOptions) {
        modalSizeOptions.querySelectorAll(".size-option").forEach(button => button.classList.remove("selected"));
    }

    applyFilters();
}

function openProductModal(productId) {
    const product = products.find(candidate => candidate.id === productId);
    if (!product || !productModal) {
        return;
    }

    selectedModalSize = "";

    if (modalImage) {
        modalImage.src = product.image;
        modalImage.alt = product.name;
        modalImage.onerror = () => {
            modalImage.src = `https://via.placeholder.com/600x600/f6f8f3/666?text=${encodeURIComponent(product.brand)}`;
        };
    }

    if (modalCategory) {
        modalCategory.textContent = product.category;
    }

    if (modalTitle) {
        modalTitle.textContent = product.name;
    }

    if (modalPrice) {
        modalPrice.textContent = `$${product.price.toFixed(2)}`;
    }

    if (modalMeta) {
        modalMeta.textContent = `${product.sku} | ${product.colorway} | ${product.releaseDate}`;
    }

    if (modalDescription) {
        modalDescription.textContent = product.description || "Premium marketplace listing for authentic product inventory.";
    }

    if (modalBadge) {
        if (product.isOutOfStock) {
            modalBadge.textContent = "Out of Stock";
            modalBadge.hidden = false;
        } else if (product.isFeatured) {
            modalBadge.textContent = "Featured";
            modalBadge.hidden = false;
        } else if (product.badge) {
            modalBadge.textContent = product.badge.replace(/^\w/, character => character.toUpperCase());
            modalBadge.hidden = false;
        } else {
            modalBadge.hidden = true;
        }
    }

    if (modalSizeOptions) {
        const fragment = document.createDocumentFragment();

        product.sizes.forEach(size => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "size-option";
            button.dataset.size = size;
            button.textContent = size;
            button.disabled = product.isOutOfStock;
            fragment.appendChild(button);
        });

        modalSizeOptions.replaceChildren(fragment);
    }

    if (modalAddToCart) {
        modalAddToCart.disabled = true;
        modalAddToCart.textContent = product.isOutOfStock ? "Out of Stock" : "Select Size";
    }

    productModal.dataset.productId = String(productId);
    productModal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    if (!productModal) {
        return;
    }

    productModal.classList.remove("active");
    document.body.style.overflow = "";
}

function handleModalSizeSelection(event) {
    const sizeButton = event.target.closest(".size-option");
    if (!sizeButton || sizeButton.disabled || !modalSizeOptions) {
        return;
    }

    selectedModalSize = sizeButton.dataset.size || "";

    modalSizeOptions.querySelectorAll(".size-option").forEach(button => {
        button.classList.toggle("selected", button === sizeButton);
    });

    if (modalAddToCart) {
        modalAddToCart.disabled = false;
        modalAddToCart.textContent = "Add to Cart";
    }
}

function addToCartFromModal() {
    const productId = Number(productModal?.dataset.productId);
    const product = products.find(candidate => candidate.id === productId);

    if (!product || product.isOutOfStock) {
        return;
    }

    if (!selectedModalSize) {
        alert("Please select a size");
        return;
    }

    const existingItem = cart.find(item => item.id === productId && item.size === selectedModalSize);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            size: selectedModalSize,
            image: product.image,
            quantity: 1
        });
    }

    updateCartUI();
    closeModal();

    if (cartSidebar) {
        cartSidebar.classList.add("active");
    }
}

function toggleCart() {
    if (cartSidebar) {
        cartSidebar.classList.toggle("active");
    }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cartCount) {
        cartCount.textContent = String(totalItems);
        cartCount.style.display = totalItems > 0 ? "flex" : "none";
    }

    if (!cartItems || !cartTotal) {
        return;
    }

    if (cart.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "cart-empty";
        emptyState.textContent = "Your cart is empty";
        cartItems.replaceChildren(emptyState);
        cartTotal.textContent = "$0.00";
        return;
    }

    const fragment = document.createDocumentFragment();

    cart.forEach((item, index) => {
        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";
        cartItem.innerHTML = `
          <img src="${item.image}" alt="${item.name}" class="cart-item-image">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-size">Size: ${item.size}</div>
            <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
          </div>
          <button class="cart-item-remove" type="button" data-index="${index}" aria-label="Remove ${item.name}">
            Remove
          </button>
        `;
        fragment.appendChild(cartItem);
    });

    cartItems.replaceChildren(fragment);

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) {
        return;
    }

    cart.splice(index, 1);
    updateCartUI();
}

window.openProductModal = openProductModal;
window.toggleCart = toggleCart;
