// cart.js - Must be loaded after any page that uses cart.
(function() {
    // Cart storage functions (mirror your existing definitions)
    window.loadCartFromStorage = () => {
        try {
            return JSON.parse(localStorage.getItem('backdoor-cart') || '[]');
        } catch { return []; }
    };
    window.saveCartToStorage = (cart) => {
        localStorage.setItem('backdoor-cart', JSON.stringify(cart));
    };

    window.cart = window.loadCartFromStorage();

    // Create sidebar HTML
    const sidebarHTML = `
        <div id="cart-sidebar" style="position:fixed; top:0; right:-400px; width:400px; height:100%; background:white; box-shadow:-2px 0 10px rgba(0,0,0,0.1); transition: right 0.3s; z-index:1000; display:flex; flex-direction:column;">
            <div style="padding:1rem; background:#f5f5f5; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">Your Cart (<span id="cart-count">0</span>)</h3>
                <button id="close-cart" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <div id="cart-items" style="flex:1; overflow-y:auto; padding:1rem;"></div>
            <div style="padding:1rem; border-top:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <strong>Total</strong>
                    <strong id="cart-total">$0.00</strong>
                </div>
                <button id="checkout-btn" style="width:100%; padding:0.75rem; background:black; color:white; border:none; border-radius:4px;">Checkout</button>
            </div>
        </div>
        <!-- Toggle button (floating) -->
        <button id="cart-toggle" style="position:fixed; bottom:2rem; right:2rem; background:black; color:white; border:none; border-radius:50%; width:60px; height:60px; font-size:1.5rem; z-index:999; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.2);">
            🛒<span id="cart-badge" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:12px;">0</span>
        </button>
    `;

    document.body.insertAdjacentHTML('beforeend', sidebarHTML);

    const sidebar = document.getElementById('cart-sidebar');
    const toggleBtn = document.getElementById('cart-toggle');
    const closeBtn = document.getElementById('close-cart');
    const itemsContainer = document.getElementById('cart-items');
    const cartCountSpan = document.getElementById('cart-count');
    const cartBadge = document.getElementById('cart-badge');
    const cartTotalEl = document.getElementById('cart-total');

    function renderCart() {
        const cart = window.cart;
        if (cart.length === 0) {
            itemsContainer.innerHTML = '<p style="text-align:center; color:#888;">Your cart is empty</p>';
        } else {
            itemsContainer.innerHTML = cart.map((item, index) => `
                <div style="display:flex; gap:1rem; border-bottom:1px solid #eee; padding:0.5rem 0;">
                    <img src="${item.image || ''}" alt="" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                    <div style="flex:1;">
                        <strong>${item.name}</strong><br>
                        <small>Size: ${item.size}</small><br>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
                            <button class="qty-btn" data-index="${index}" data-action="dec">−</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" data-index="${index}" data-action="inc">+</button>
                        </div>
                    </div>
                    <div style="align-self:center;">
                        $${(item.price * item.quantity).toFixed(2)}
                        <button class="remove-item" data-index="${index}" style="background:none; border:none; color:red; cursor:pointer; margin-left:0.5rem;">🗑</button>
                    </div>
                </div>
            `).join('');
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cartTotalEl.textContent = `$${total.toFixed(2)}`;
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Event delegation for quantity and remove
    itemsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.dataset.index);
        if (isNaN(index)) return;

        if (btn.classList.contains('qty-btn')) {
            const action = btn.dataset.action;
            if (action === 'inc') window.cart[index].quantity++;
            else if (action === 'dec' && window.cart[index].quantity > 1) window.cart[index].quantity--;
            else if (action === 'dec' && window.cart[index].quantity === 1) window.cart.splice(index, 1);
        } else if (btn.classList.contains('remove-item')) {
            window.cart.splice(index, 1);
        }

        window.saveCartToStorage(window.cart);
        renderCart();
    });

    // Checkout button (redirect to checkout page)
    document.getElementById('checkout-btn').addEventListener('click', () => {
        window.location.href = '/checkout.html';
    });

    // Toggle sidebar
    toggleBtn.addEventListener('click', () => {
        sidebar.style.right = '0';
    });
    closeBtn.addEventListener('click', () => {
        sidebar.style.right = '-400px';
    });

    // Listen for cart updates from other scripts
    window.addEventListener('cart-updated', () => {
        window.cart = window.loadCartFromStorage();
        renderCart();
    });

    // Initial render
    renderCart();
})();