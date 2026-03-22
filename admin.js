// ============================================
// BACKDOOR ADMIN DASHBOARD - JAVASCRIPT
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const ADMIN_PASSWORD = 'admin123';
const STORAGE_KEYS = {
    AUTH: 'backdoor_admin_auth',
    ORDERS: 'backdoor_orders',
    CUSTOMERS: 'backdoor_customers',
    PRODUCTS: 'backdoor_products'
};
const IMPORT_HISTORY_KEY = 'backdoor_import_history';

// ============================================
// STATE MANAGEMENT
// ============================================
let orders = [];
let customers = [];
let currentSection = 'dashboard';
let currentOrder = null;
let currentProduct = null;
let selectedProductIds = new Set();

// Import products from main app
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
        stock: 25,
        image: "products/pharrell-jellyfish-blue.jpg",
        status: "active"
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
        stock: 18,
        image: "products/pharrell-jellyfish-grey.jpg",
        status: "active"
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
        stock: 12,
        image: "products/kobe-6-caitlin-clark.jpg",
        status: "active"
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
        stock: 8,
        image: "products/af1-cpfm-moss.jpg",
        status: "active"
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
        stock: 3,
        image: "products/jordan-1-fragment-travis.jpg",
        status: "active"
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
        stock: 15,
        image: "products/jordan-10-hoh.jpg",
        status: "active"
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
        stock: 22,
        image: "products/jordan-5-wolf-grey.jpg",
        status: "active"
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
        stock: 30,
        image: "products/jordan-10-shadow.jpg",
        status: "active"
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
        stock: 20,
        image: "products/jordan-5-psg.jpg",
        status: "active"
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
        stock: 14,
        image: "products/kobe-6-brunson.jpg",
        status: "active"
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
        stock: 35,
        image: "products/jordan-4-black-cat.jpg",
        status: "active"
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
        stock: 5,
        image: "products/kobe-6-reverse-grinch.jpg",
        status: "active"
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
        stock: 28,
        image: "products/jordan-3-for-the-love.jpg",
        status: "active"
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
        stock: 19,
        image: "products/jordan-14-black-blue.jpg",
        status: "active"
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
        stock: 10,
        image: "products/nocta-sunset-jacket.jpg",
        status: "active"
    }
];

const defaultProducts = products.map(product => ({ ...product }));

function debounce(fn, delay) {
    let timeoutId = null;

    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    };
}

function getEffectiveOutOfStock(product) {
    return Boolean(product?.isOutOfStock) || Number(product?.stock) <= 0;
}

function normalizeProduct(product) {
    const stock = Number.isFinite(Number(product.stock)) ? Math.max(0, Number(product.stock)) : 0;
    const isHidden = Boolean(product.isHidden);
    const isOutOfStock = getEffectiveOutOfStock({ ...product, stock });
    const isFeatured = Boolean(product.isFeatured);

    return {
        ...product,
        stock,
        status: isHidden ? 'hidden' : isOutOfStock ? 'out-of-stock' : 'active',
        isHidden,
        isOutOfStock,
        isFeatured
    };
}

function replaceProducts(nextProducts) {
    products.splice(0, products.length, ...nextProducts.map(normalizeProduct));
    syncSelectedProductIds();
}

function getNextProductId() {
    return products.reduce((maxId, product) => Math.max(maxId, Number(product.id) || 0), 0) + 1;
}

function syncSelectedProductIds() {
    selectedProductIds = new Set(
        [...selectedProductIds].filter(productId => products.some(product => product.id === productId))
    );
}

function loadProducts() {
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (savedProducts) {
        replaceProducts(JSON.parse(savedProducts));
        return;
    }

    replaceProducts(defaultProducts);
    saveProducts();
}

function saveProducts() {
    const normalizedProducts = products.map(normalizeProduct);
    products.splice(0, products.length, ...normalizedProducts);
    syncSelectedProductIds();

    localStorage.setItem(
        STORAGE_KEYS.PRODUCTS,
        JSON.stringify(normalizedProducts.map(product => {
            const { isHidden, isOutOfStock, ...rest } = product;
            return {
                ...rest,
                isHidden,
                isOutOfStock
            };
        }))
    );
}

function getProductInventoryState(product) {
    if (product.isHidden) {
        return { label: 'Hidden', className: 'hidden' };
    }

    if (getEffectiveOutOfStock(product)) {
        return { label: 'Out of Stock', className: 'out-of-stock' };
    }

    return { label: 'Live', className: 'active' };
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    checkAuth();
    setupEventListeners();
});

// ============================================
// AUTHENTICATION
// ============================================
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem(STORAGE_KEYS.AUTH) === 'true';

    if (isAuthenticated) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    switchSection('dashboard');
}

function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
        showDashboard();
    } else {
        alert('Incorrect password');
    }
}

function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    showLogin();
}

// ============================================
// DATA MANAGEMENT
// ============================================
function loadData() {
    loadProducts();

    // Load orders from localStorage
    const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
    } else {
        // Generate sample orders for demo
        orders = generateSampleOrders();
        saveOrders();
    }

    // Load customers from localStorage
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (savedCustomers) {
        customers = JSON.parse(savedCustomers);
    } else {
        // Generate sample customers
        customers = generateSampleCustomers();
        saveCustomers();
    }
}

function saveOrders() {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

function saveCustomers() {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

function generateSampleOrders() {
    const sampleOrders = [];
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    const customerNames = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown'];

    for (let i = 1; i <= 25; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomCustomer = customerNames[Math.floor(Math.random() * customerNames.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        sampleOrders.push({
            id: `ORD-${String(i).padStart(3, '0')}`,
            orderNumber: `BD-2025-${String(i).padStart(3, '0')}`,
            customer: {
                name: randomCustomer,
                email: randomCustomer.toLowerCase().replace(' ', '.') + '@example.com',
                phone: '+1234567890'
            },
            items: [
                {
                    productId: randomProduct.id,
                    name: randomProduct.name,
                    size: '10',
                    quantity: 1,
                    price: randomProduct.price,
                    image: randomProduct.image
                }
            ],
            subtotal: randomProduct.price,
            shipping: 15.00,
            tax: randomProduct.price * 0.09,
            total: randomProduct.price + 15.00 + (randomProduct.price * 0.09),
            status: randomStatus,
            shippingAddress: {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zip: '10001',
                country: 'USA'
            },
            paymentMethod: 'Credit Card',
            paymentStatus: 'paid',
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            notes: ''
        });
    }

    return sampleOrders;
}

function generateSampleCustomers() {
    const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown'];
    return names.map((name, i) => ({
        id: i + 1,
        name,
        email: name.toLowerCase().replace(' ', '.') + '@example.com',
        phone: '+1234567890',
        totalOrders: Math.floor(Math.random() * 10) + 1,
        totalSpent: (Math.random() * 2000 + 500).toFixed(2),
        lastOrder: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const debouncedOrderFilter = debounce(filterOrders, 180);
    const debouncedProductFilter = debounce(filterProducts, 180);
    const debouncedCustomerFilter = debounce(filterCustomers, 180);

    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });

    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
        });
    });

    // Modals
    document.getElementById('orderModalClose').addEventListener('click', () => closeModal('orderModal'));
    document.getElementById('productModalClose').addEventListener('click', () => closeModal('productModal'));
    document.getElementById('cancelProductBtn').addEventListener('click', () => closeModal('productModal'));

    // Product form
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Export buttons
    document.getElementById('exportOrdersBtn').addEventListener('click', () => exportToCSV(orders, 'orders'));
    document.getElementById('exportProductsBtn').addEventListener('click', () => exportToCSV(products, 'products'));
    document.getElementById('exportCustomersBtn').addEventListener('click', () => exportToCSV(customers, 'customers'));

    // Search and filters
    document.getElementById('orderSearch').addEventListener('input', debouncedOrderFilter);
    document.getElementById('orderStatusFilter').addEventListener('change', filterOrders);
    document.getElementById('productSearch').addEventListener('input', debouncedProductFilter);
    document.getElementById('productCategoryFilter').addEventListener('change', filterProducts);
    document.getElementById('productStatusFilter').addEventListener('change', filterProducts);
    document.getElementById('productBulkAction').addEventListener('change', renderBulkToolbar);
    document.getElementById('selectAllProducts').addEventListener('change', handleSelectAllProducts);
    document.getElementById('productsTableBody').addEventListener('change', handleProductTableSelection);
    document.getElementById('applyBulkActionBtn').addEventListener('click', applyBulkAction);
    document.getElementById('customerSearch').addEventListener('input', debouncedCustomerFilter);

    // Import functionality
    setupImportListeners();

    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEYS.PRODUCTS) {
            return;
        }

        loadProducts();

        if (currentSection === 'products') {
            filterProducts();
        } else if (currentSection === 'dashboard') {
            renderDashboard();
        } else if (currentSection === 'analytics') {
            renderAnalytics();
        }
    });
}

// ============================================
// NAVIGATION
// ============================================
function switchSection(section) {
    if (!section) {
        return;
    }

    currentSection = section;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === section + 'Section');
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        orders: 'Orders',
        products: 'Products',
        customers: 'Customers',
        import: 'Import Products',
        analytics: 'Analytics'
    };
    document.getElementById('sectionTitle').textContent = titles[section];

    // Render section
    switch (section) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'orders':
            renderOrders();
            break;
        case 'products':
            renderProducts();
            break;
        case 'customers':
            renderCustomers();
            break;
        case 'import':
            renderImportHistory();
            break;
        case 'analytics':
            renderAnalytics();
            break;
    }
}

// ============================================
// DASHBOARD RENDERING
// ============================================
function renderDashboard() {
    // Calculate stats
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
    const lowStockProducts = products.filter(p => !p.isHidden && !p.isOutOfStock && p.stock < 10);

    // Update stats
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('pendingOrders').textContent = pendingOrdersCount;
    document.getElementById('totalCustomers').textContent = customers.length;
    const pendingOrdersBadge = document.getElementById('pendingOrdersBadge');
    if (pendingOrdersBadge) {
        pendingOrdersBadge.textContent = String(pendingOrdersCount);
    }

    // Render recent orders
    const recentOrders = orders.slice(0, 5);
    document.getElementById('recentOrdersList').innerHTML = recentOrders.map(order => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-title">${order.orderNumber}</div>
                <div class="list-item-subtitle">${order.customer.name} • ${new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
            <span class="status-badge status-${order.status}">${order.status}</span>
        </div>
    `).join('');

    // Render low stock
    document.getElementById('lowStockList').innerHTML = lowStockProducts.length > 0
        ? lowStockProducts.slice(0, 5).map(product => `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${product.name}</div>
                    <div class="list-item-subtitle">SKU: ${product.sku}</div>
                </div>
                <div class="list-item-value">${product.stock} left</div>
            </div>
        `).join('')
        : '<div class="list-item"><div class="list-item-info"><div class="list-item-subtitle">All products are well stocked</div></div></div>';
}

// ============================================
// ORDERS RENDERING
// ============================================
function renderOrders(filteredOrders = orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = filteredOrders.map(order => `
        <tr>
            <td><strong>${order.orderNumber}</strong></td>
            <td>${order.customer.name}</td>
            <td>${order.items.length} item(s)</td>
            <td><strong>$${order.total.toFixed(2)}</strong></td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn view" onclick="viewOrder('${order.id}')">View</button>
                <button class="action-btn edit" onclick="updateOrderStatus('${order.id}')">Update</button>
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase();
    const statusFilter = document.getElementById('orderStatusFilter').value;

    let filtered = orders;

    if (searchTerm) {
        filtered = filtered.filter(order =>
            order.orderNumber.toLowerCase().includes(searchTerm) ||
            order.customer.name.toLowerCase().includes(searchTerm) ||
            order.customer.email.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(order => order.status === statusFilter);
    }

    renderOrders(filtered);
}

function viewOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('orderModalBody');

    modalBody.innerHTML = `
        <div style="display: grid; gap: 24px;">
            <div>
                <h3 style="margin-bottom: 16px;">Order Information</h3>
                <div style="display: grid; gap: 12px;">
                    <div><strong>Order Number:</strong> ${order.orderNumber}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></div>
                    <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
                    <div><strong>Payment:</strong> ${order.paymentMethod} (${order.paymentStatus})</div>
                </div>
            </div>
            
            <div>
                <h3 style="margin-bottom: 16px;">Customer</h3>
                <div style="display: grid; gap: 12px;">
                    <div><strong>Name:</strong> ${order.customer.name}</div>
                    <div><strong>Email:</strong> ${order.customer.email}</div>
                    <div><strong>Phone:</strong> ${order.customer.phone}</div>
                </div>
            </div>
            
            <div>
                <h3 style="margin-bottom: 16px;">Shipping Address</h3>
                <div>
                    ${order.shippingAddress.street}<br>
                    ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}<br>
                    ${order.shippingAddress.country}
                </div>
            </div>
            
            <div>
                <h3 style="margin-bottom: 16px;">Items</h3>
                ${order.items.map(item => `
                    <div style="display: flex; gap: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px;">
                        <img src="${item.image}" style="width: 60px; height: 60px; object-fit: contain; border-radius: 4px; background: white;">
                        <div style="flex: 1;">
                            <div><strong>${item.name}</strong></div>
                            <div style="font-size: 13px; color: #666;">Size: ${item.size} • Qty: ${item.quantity}</div>
                        </div>
                        <div style="font-weight: 700;">$${item.price.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
            
            <div>
                <h3 style="margin-bottom: 16px;">Order Total</h3>
                <div style="display: grid; gap: 8px;">
                    <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$${order.subtotal.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>Shipping:</span><span>$${order.shipping.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>Tax:</span><span>$${order.tax.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; padding-top: 8px; border-top: 2px solid #e0e0e0;"><span>Total:</span><span>$${order.total.toFixed(2)}</span></div>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function updateOrderStatus(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentIndex = statuses.indexOf(order.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    if (confirm(`Update order ${order.orderNumber} status to "${nextStatus}"?`)) {
        order.status = nextStatus;
        order.updatedAt = new Date().toISOString();
        saveOrders();
        renderOrders();
        renderDashboard();
    }
}

// ============================================
// PRODUCTS RENDERING
// ============================================
function renderProducts(filteredProducts = products) {
    const tbody = document.getElementById('productsTableBody');

    if (filteredProducts.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="9">
                <p class="empty-state">No products match the current filters.</p>
            </td>
        </tr>
    `;
        syncProductTableSelectionState(filteredProducts);
        return;
    }

    tbody.innerHTML = filteredProducts.map(product => {
        const inventoryState = getProductInventoryState(product);
        const isOutOfStock = inventoryState.className === 'out-of-stock';

        return `
        <tr>
            <td class="table-checkbox-cell">
                <input type="checkbox" class="product-select-checkbox" value="${product.id}" aria-label="Select ${product.name}" ${selectedProductIds.has(product.id) ? 'checked' : ''}>
            </td>
            <td><img src="${product.image}" class="product-thumb" alt="${product.name}"></td>
            <td>
                <div class="product-name-cell">
                    <strong>${product.name}</strong>
                    <div class="product-meta-pills">
                        ${product.isFeatured ? '<span class="table-pill featured">Featured</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${product.sku}</td>
            <td><strong>$${product.price.toFixed(2)}</strong></td>
            <td>${product.stock}</td>
            <td>${product.category}</td>
            <td><span class="status-badge status-${inventoryState.className}">${inventoryState.label}</span></td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editProduct(${product.id})">Edit</button>
                    <button class="action-btn featured" onclick="toggleProductFeatured(${product.id})">${product.isFeatured ? 'Unfeature' : 'Feature'}</button>
                    <button class="action-btn secondary" onclick="toggleProductVisibility(${product.id})">${product.isHidden ? 'Show' : 'Hide'}</button>
                    <button class="action-btn warning" onclick="toggleOutOfStock(${product.id})">${isOutOfStock ? 'In Stock' : 'Out of Stock'}</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    syncProductTableSelectionState(filteredProducts);
}

function getFilteredProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('productCategoryFilter').value;
    const statusFilter = document.getElementById('productStatusFilter').value;

    let filtered = [...products];

    if (searchTerm) {
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.sku.toLowerCase().includes(searchTerm) ||
            product.brand.toLowerCase().includes(searchTerm) ||
            (product.colorway || '').toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter !== 'all') {
        filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(product => getProductInventoryState(product).className === statusFilter);
    }

    return filtered;
}

function syncProductTableSelectionState(filteredProducts = getFilteredProducts()) {
    const selectAllProducts = document.getElementById('selectAllProducts');
    const visibleIds = filteredProducts.map(product => product.id);
    const selectedVisibleCount = visibleIds.filter(productId => selectedProductIds.has(productId)).length;

    selectAllProducts.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
    selectAllProducts.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
    renderBulkToolbar();
}

function renderBulkToolbar() {
    const selectionCount = document.getElementById('productSelectionCount');
    const bulkAction = document.getElementById('productBulkAction');
    const applyBulkActionBtn = document.getElementById('applyBulkActionBtn');
    const selectedCount = selectedProductIds.size;

    selectionCount.textContent = `${selectedCount} selected`;
    applyBulkActionBtn.disabled = selectedCount === 0 || !bulkAction.value;
}

function handleProductTableSelection(event) {
    const checkbox = event.target.closest('.product-select-checkbox');
    if (!checkbox) {
        return;
    }

    const productId = Number(checkbox.value);
    if (checkbox.checked) {
        selectedProductIds.add(productId);
    } else {
        selectedProductIds.delete(productId);
    }

    syncProductTableSelectionState();
}

function handleSelectAllProducts(event) {
    const filteredProducts = getFilteredProducts();

    filteredProducts.forEach(product => {
        if (event.target.checked) {
            selectedProductIds.add(product.id);
        } else {
            selectedProductIds.delete(product.id);
        }
    });

    renderProducts(filteredProducts);
}

function applyBulkAction() {
    const bulkAction = document.getElementById('productBulkAction');
    const action = bulkAction.value;

    if (!action || selectedProductIds.size === 0) {
        renderBulkToolbar();
        return;
    }

    products.forEach(product => {
        if (!selectedProductIds.has(product.id)) {
            return;
        }

        switch (action) {
            case 'show':
                Object.assign(product, normalizeProduct({ ...product, isHidden: false }));
                break;
            case 'hide':
                Object.assign(product, normalizeProduct({ ...product, isHidden: true }));
                break;
            case 'mark-in-stock':
                Object.assign(product, normalizeProduct({
                    ...product,
                    stock: Math.max(1, Number(product.stock) || 0),
                    isOutOfStock: false
                }));
                break;
            case 'mark-out-of-stock':
                Object.assign(product, normalizeProduct({
                    ...product,
                    isOutOfStock: true
                }));
                break;
            case 'feature':
                Object.assign(product, normalizeProduct({ ...product, isFeatured: true }));
                break;
            case 'unfeature':
                Object.assign(product, normalizeProduct({ ...product, isFeatured: false }));
                break;
            default:
                break;
        }
    });

    saveProducts();
    selectedProductIds.clear();
    bulkAction.value = '';
    filterProducts();
    renderDashboard();
}

function filterProducts() {
    renderProducts(getFilteredProducts());
}

function openProductModal(product = null) {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    title.textContent = product ? 'Edit Product' : 'Add Product';

    if (product) {
        document.getElementById('productName').value = product.name;
        document.getElementById('productSKU').value = product.sku;
        document.getElementById('productBrand').value = product.brand;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productHidden').checked = product.isHidden;
        document.getElementById('productOutOfStock').checked = getEffectiveOutOfStock(product);
        document.getElementById('productFeatured').checked = product.isFeatured;
        document.getElementById('productColorway').value = product.colorway || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productImage').value = product.image;
    } else {
        form.reset();
        document.getElementById('productHidden').checked = false;
        document.getElementById('productOutOfStock').checked = false;
        document.getElementById('productFeatured').checked = false;
    }

    modal.classList.add('active');
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        openProductModal(product);
    }
}

function handleProductSubmit(e) {
    e.preventDefault();

    const productData = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSKU').value,
        brand: document.getElementById('productBrand').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value, 10),
        isHidden: document.getElementById('productHidden').checked,
        isOutOfStock: document.getElementById('productOutOfStock').checked,
        isFeatured: document.getElementById('productFeatured').checked,
        colorway: document.getElementById('productColorway').value,
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value,
        status: 'active'
    };

    if (currentProduct) {
        // Update existing product
        Object.assign(currentProduct, normalizeProduct({
            ...currentProduct,
            ...productData
        }));
        alert('Product updated successfully!');
    } else {
        // Add new product
        productData.id = getNextProductId();
        productData.releaseDate = new Date().toLocaleDateString();
        products.push(normalizeProduct(productData));
        alert('Product added successfully!');
    }

    saveProducts();
    closeModal('productModal');
    filterProducts();
    renderDashboard();
}

function toggleProductVisibility(productId) {
    const product = products.find(candidate => candidate.id === productId);
    if (!product) return;

    Object.assign(product, normalizeProduct({
        ...product,
        isHidden: !product.isHidden
    }));
    saveProducts();
    filterProducts();
    renderDashboard();
}

function toggleProductFeatured(productId) {
    const product = products.find(candidate => candidate.id === productId);
    if (!product) return;

    Object.assign(product, normalizeProduct({
        ...product,
        isFeatured: !product.isFeatured
    }));
    saveProducts();
    filterProducts();
}

function toggleOutOfStock(productId) {
    const product = products.find(candidate => candidate.id === productId);
    if (!product) return;

    const nextOutOfStock = !getEffectiveOutOfStock(product);
    Object.assign(product, normalizeProduct({
        ...product,
        stock: nextOutOfStock ? product.stock : Math.max(1, Number(product.stock) || 0),
        isOutOfStock: nextOutOfStock
    }));
    saveProducts();
    filterProducts();
    renderDashboard();
}

// ============================================
// CUSTOMERS RENDERING
// ============================================
function renderCustomers(filteredCustomers = customers) {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = filteredCustomers.map(customer => `
        <tr>
            <td><strong>${customer.name}</strong></td>
            <td>${customer.email}</td>
            <td>${customer.totalOrders}</td>
            <td><strong>$${customer.totalSpent}</strong></td>
            <td>${new Date(customer.lastOrder).toLocaleDateString()}</td>
            <td>
                <button class="action-btn view">View</button>
            </td>
        </tr>
    `).join('');
}

function filterCustomers() {
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase();

    const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm)
    );

    renderCustomers(filtered);
}

// ============================================
// ANALYTICS RENDERING
// ============================================
function renderAnalytics() {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalRevenue / orders.length;

    document.getElementById('avgOrderValue').textContent = `$${avgOrderValue.toFixed(2)}`;
    document.getElementById('conversionRate').textContent = '3.2%';
    document.getElementById('customerLTV').textContent = `$${(totalRevenue / customers.length).toFixed(2)}`;

    // Top products
    const productSales = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.price * item.quantity;
        });
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    document.getElementById('topProductsList').innerHTML = topProducts.map(product => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-title">${product.name}</div>
                <div class="list-item-subtitle">${product.quantity} sold</div>
            </div>
            <div class="list-item-value">$${product.revenue.toFixed(2)}</div>
        </div>
    `).join('');
}

// ============================================
// UTILITIES
// ============================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function exportToCSV(data, filename) {
    if (data.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return typeof value === 'object' ? JSON.stringify(value) : value;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// PRODUCT IMPORT
// ============================================
let importHistory = JSON.parse(localStorage.getItem(IMPORT_HISTORY_KEY) || '[]');

function setupImportListeners() {
    document.getElementById('fetchProductBtn').addEventListener('click', fetchProductDetails);
    document.getElementById('cancelImportBtn').addEventListener('click', () => {
        document.getElementById('importPreview').classList.add('hidden');
        document.getElementById('productUrl').value = '';
        document.getElementById('previewHidden').checked = false;
        document.getElementById('previewOutOfStock').checked = false;
        document.getElementById('previewFeatured').checked = false;
    });
    document.getElementById('confirmImportBtn').addEventListener('click', confirmImport);
}

async function fetchProductDetails() {
    const url = document.getElementById('productUrl').value.trim();

    if (!url) {
        alert('Please enter a product URL');
        return;
    }

    if (!url.includes('kickwho.info')) {
        alert('Please enter a valid kickwho.info product URL');
        return;
    }

    // Show loading state
    const btn = document.getElementById('fetchProductBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> Fetching...';
    btn.disabled = true;

    try {
        // Parse product details from URL
        const productData = await parseKickwhoProduct(url);

        // Populate preview
        document.getElementById('previewImage').src = productData.image || 'https://via.placeholder.com/300';
        document.getElementById('previewName').value = productData.name;
        document.getElementById('previewBrand').value = productData.brand;
        document.getElementById('previewPrice').value = productData.price;
        document.getElementById('previewSKU').value = productData.sku;
        document.getElementById('previewStock').value = 10;
        document.getElementById('previewCategory').value = productData.category;
        document.getElementById('previewColorway').value = productData.colorway || '';
        document.getElementById('previewHidden').checked = false;
        document.getElementById('previewOutOfStock').checked = false;
        document.getElementById('previewFeatured').checked = false;

        // Show preview
        document.getElementById('importPreview').classList.remove('hidden');

    } catch (error) {
        alert('Could not fetch product details. Please fill in manually.');
        console.error(error);

        // Show preview with empty fields
        document.getElementById('previewImage').src = 'https://via.placeholder.com/300';
        document.getElementById('previewName').value = '';
        document.getElementById('previewBrand').value = 'Nike';
        document.getElementById('previewPrice').value = '';
        document.getElementById('previewSKU').value = '';
        document.getElementById('previewStock').value = 10;
        document.getElementById('previewCategory').value = 'Sneakers';
        document.getElementById('previewColorway').value = '';
        document.getElementById('previewHidden').checked = false;
        document.getElementById('previewOutOfStock').checked = false;
        document.getElementById('previewFeatured').checked = false;
        document.getElementById('importPreview').classList.remove('hidden');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function parseKickwhoProduct(url) {
    // Extract product name from URL
    const urlParts = url.split('/');
    const productSlug = urlParts[urlParts.length - 1].replace('.html', '').replace(/-/g, ' ');

    // Determine brand from URL or product name
    let brand = 'Nike';
    if (url.includes('jordan') || productSlug.toLowerCase().includes('jordan')) {
        brand = 'Jordan';
    } else if (url.includes('adidas') || url.includes('yeezy') || productSlug.toLowerCase().includes('yeezy')) {
        brand = 'Adidas';
    }

    // Generate SKU from product name
    const sku = productSlug.substring(0, 10).toUpperCase().replace(/\s/g, '');

    return {
        name: productSlug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        brand: brand,
        price: 249.00, // Default price
        sku: sku,
        category: 'Sneakers',
        colorway: '',
        image: '' // User will need to add image manually
    };
}

function confirmImport() {
    const productData = {
        id: getNextProductId(),
        name: document.getElementById('previewName').value,
        brand: document.getElementById('previewBrand').value,
        price: parseFloat(document.getElementById('previewPrice').value),
        sku: document.getElementById('previewSKU').value,
        stock: parseInt(document.getElementById('previewStock').value, 10),
        category: document.getElementById('previewCategory').value,
        colorway: document.getElementById('previewColorway').value,
        image: document.getElementById('previewImage').src,
        status: 'active',
        releaseDate: new Date().toLocaleDateString(),
        isHidden: document.getElementById('previewHidden').checked,
        isOutOfStock: document.getElementById('previewOutOfStock').checked,
        isFeatured: document.getElementById('previewFeatured').checked
    };

    // Add to products array
    products.push(normalizeProduct(productData));
    saveProducts();

    // Add to import history
    importHistory.unshift({
        ...productData,
        importedAt: new Date().toISOString()
    });

    // Keep only last 10 imports
    if (importHistory.length > 10) {
        importHistory = importHistory.slice(0, 10);
    }

    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(importHistory));

    // Update UI
    renderImportHistory();
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('productUrl').value = '';
    document.getElementById('previewHidden').checked = false;
    document.getElementById('previewOutOfStock').checked = false;
    document.getElementById('previewFeatured').checked = false;

    alert(`✓ Product "${productData.name}" added to inventory!`);

    // Refresh products table if on products section
    if (currentSection === 'products') {
        filterProducts();
    }
}

function renderImportHistory() {
    const historyList = document.getElementById('importHistory');

    if (importHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No products imported yet</p>';
        return;
    }

    historyList.innerHTML = importHistory.map(item => `
        <div class="history-item">
            <img src="${item.image}" alt="${item.name}" class="history-item-image">
            <div class="history-item-details">
                <div class="history-item-name">${item.name}</div>
                <div class="history-item-meta">
                    ${item.brand} • $${item.price.toFixed(2)} • ${new Date(item.importedAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

// Make functions globally available
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.editProduct = editProduct;
window.switchTab = switchSection;
window.toggleProductFeatured = toggleProductFeatured;
window.toggleProductVisibility = toggleProductVisibility;
window.toggleOutOfStock = toggleOutOfStock;
