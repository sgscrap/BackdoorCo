import { db, auth } from './admin/firebase-config.js';
import {
    collection,
    doc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
    applyProductOverrides,
    getSeededProducts,
    getProductImages,
    getProductSizes,
    getBackorderLeadTime,
    getTotalStock,
    hasBackorderSizes,
    hasInStockSizes,
    isBackorder,
    isBackorderOnly,
    isFeatured,
    isOutOfStock
} from './product-data.js';
import {
    mergeVisibleReviews,
    reviewMatchesProduct
} from './reviews-data.js';

let currentProduct = null;
let selectedSize = '';
let selectedSizeBackorder = false;
let cart = loadCartFromStorage();
let productImages = [];
let currentImageIndex = 0;
let unsubscribeReviews = null;
let unsubscribeProduct = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function toHistoryDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);

    const raw = String(value).trim();
    if (!raw) return null;

    const shortDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (shortDate) {
        const [, month, day, yearRaw] = shortDate;
        const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
        const parsed = new Date(year, Number(month) - 1, Number(day));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeProductPriceHistory(product) {
    const history = Array.isArray(product?.priceHistory) ? product.priceHistory : [];
    const entries = history
        .map((entry) => {
            const price = Number(entry?.price);
            const date = toHistoryDate(entry?.changedAt || entry?.date || entry?.createdAt);
            if (!price || !date) return null;
            return {
                price,
                date,
                label: String(entry?.label || '').trim(),
                source: String(entry?.source || '').trim()
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.date - right.date);

    const collapsed = [];
    entries.forEach((entry) => {
        const last = collapsed[collapsed.length - 1];
        if (last && last.price === entry.price) {
            if (entry.date > last.date) {
                last.date = entry.date;
                last.label = entry.label || last.label;
                last.source = entry.source || last.source;
            }
            return;
        }
        collapsed.push({ ...entry });
    });

    const currentPrice = Number(product?.price) || 0;
    const fallbackDate = toHistoryDate(product?.updatedAt || product?.createdAt || product?.releaseDate) || new Date();

    if (!collapsed.length && currentPrice > 0) {
        collapsed.push({
            price: currentPrice,
            date: fallbackDate,
            label: 'Tracking started',
            source: 'current'
        });
        return collapsed;
    }

    if (currentPrice > 0) {
        const last = collapsed[collapsed.length - 1];
        if (!last || last.price !== currentPrice) {
            collapsed.push({
                price: currentPrice,
                date: fallbackDate > (last?.date || 0) ? fallbackDate : new Date(),
                label: 'Current ask',
                source: 'current'
            });
        }
    }

    return collapsed.slice(-24);
}

function formatHistoryAxisLabel(date) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function renderProductPriceHistory(product) {
    const section = document.getElementById('productPriceHistorySection');
    const chart = document.getElementById('productPriceHistoryChart');
    const axis = document.getElementById('productPriceHistoryAxis');
    const range = document.getElementById('productPriceHistoryRange');
    const change = document.getElementById('productPriceHistoryChange');
    const note = document.getElementById('productPriceHistoryNote');

    if (!section || !chart || !axis || !range || !change || !note) return;

    const history = normalizeProductPriceHistory(product);
    if (!history.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const prices = history.map((entry) => entry.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spread = Math.max(maxPrice - minPrice, Math.max(maxPrice * 0.08, 20));
    const paddedMin = Math.max(0, minPrice - spread * 0.25);
    const paddedMax = maxPrice + spread * 0.15;
    const width = 560;
    const height = 220;
    const padX = 18;
    const padTop = 18;
    const padBottom = 28;
    const plotWidth = width - padX * 2;
    const plotHeight = height - padTop - padBottom;

    const points = history.map((entry, index) => {
        const x = history.length === 1 ? width / 2 : padX + (plotWidth * index) / (history.length - 1);
        const ratio = (entry.price - paddedMin) / Math.max(paddedMax - paddedMin, 1);
        const y = padTop + plotHeight - ratio * plotHeight;
        return { ...entry, x, y };
    });

    const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
    const areaPolyline = [`${points[0].x},${height - padBottom}`, ...points.map((point) => `${point.x},${point.y}`), `${points[points.length - 1].x},${height - padBottom}`].join(' ');
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padTop + plotHeight * ratio;
        const labelValue = Math.round(paddedMax - (paddedMax - paddedMin) * ratio);
        return `
            <g>
                <line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 8" />
                <text x="${width - padX}" y="${Math.max(14, y - 6)}" text-anchor="end" fill="rgba(255,255,255,0.45)" font-size="10" letter-spacing="1">${'$' + labelValue}</text>
            </g>
        `;
    }).join('');

    chart.innerHTML = `
        <defs>
            <linearGradient id="productPriceHistoryGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(200,246,93,0.28)"></stop>
                <stop offset="100%" stop-color="rgba(200,246,93,0)"></stop>
            </linearGradient>
        </defs>
        ${gridLines}
        <polyline points="${areaPolyline}" fill="url(#productPriceHistoryGradient)" stroke="none"></polyline>
        <polyline points="${polyline}" fill="none" stroke="rgba(200,246,93,0.92)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${points.map((point, index) => `
            <g>
                <circle cx="${point.x}" cy="${point.y}" r="${index === points.length - 1 ? 5.5 : 4}" fill="${index === points.length - 1 ? 'var(--accent)' : '#0f1115'}" stroke="rgba(200,246,93,0.92)" stroke-width="2"></circle>
                <title>${formatHistoryAxisLabel(point.date)} · $${point.price}</title>
            </g>
        `).join('')}
    `;

    const axisIndexes = [...new Set([0, Math.floor((history.length - 1) / 2), history.length - 1])];
    axis.innerHTML = axisIndexes.map((index) => `<span>${formatHistoryAxisLabel(history[index].date)}</span>`).join('');

    const first = history[0];
    const last = history[history.length - 1];
    const delta = last.price - first.price;
    const deltaPrefix = delta > 0 ? '+' : '';
    change.textContent = `${deltaPrefix}$${Math.abs(Math.round(delta))}`;
    change.className = delta > 0 ? 'up' : delta < 0 ? 'down' : '';
    range.textContent = history.length > 1
        ? `${history.length} tracked updates`
        : 'Tracking started';
    note.textContent = history.length > 1
        ? `Started at $${Math.round(first.price)} and is now $${Math.round(last.price)}. New price edits on Backdoor appear here automatically.`
        : 'This product just started live price tracking. Future price edits will plot on this chart automatically.';
}

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

    const seededProduct = getSeededProducts().find((product) => product.id === productId);

    try {
        unsubscribeProduct?.();
        unsubscribeProduct = onSnapshot(doc(db, 'products', productId), (snapshot) => {
            if (snapshot.exists()) {
                currentProduct = applyProductOverrides({ id: snapshot.id, ...snapshot.data() });
            } else if (seededProduct) {
                currentProduct = seededProduct;
            } else {
                renderMissingProduct();
                return;
            }

            renderProduct(currentProduct);
            initProductReviews(currentProduct);
        }, (error) => {
            console.error(error);
            if (seededProduct) {
                currentProduct = seededProduct;
                renderProduct(currentProduct);
                initProductReviews(currentProduct);
                return;
            }
            renderMissingProduct('Unable to load this product right now.');
        });
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
    document.getElementById('productOfferBtn')?.addEventListener('click', openOfferModal);
    document.getElementById('offerModalClose')?.addEventListener('click', closeOfferModal);
    document.getElementById('offerModalOverlay')?.addEventListener('click', closeOfferModal);
    document.getElementById('offerForm')?.addEventListener('submit', handleOfferSubmit);
    
    ['productWishlistBtn', 'productWishlistBtnSecondary'].forEach((id) => {
        document.getElementById(id)?.addEventListener('click', () => {
            if (currentProduct) {
                window.toggleWishlist(currentProduct.id);
                updateWishlistBtnUI();
            }
        });
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            cartSidebar?.classList.remove('active');
            closeOfferModal();
        }
        if (event.key === 'ArrowLeft') changeProductImage(-1);
        if (event.key === 'ArrowRight') changeProductImage(1);
    });
}

window.updateWishlistBtnUI = function() {
    const buttons = ['productWishlistBtn', 'productWishlistBtnSecondary']
        .map((id) => document.getElementById(id))
        .filter(Boolean);
    if (!buttons.length || !currentProduct) return;
    const isInWishlist = window.globalWishlist?.includes(currentProduct.id);
    buttons.forEach((btn) => {
        const icon = btn.querySelector('i');
        if (!icon) return;
        icon.className = isInWishlist ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        icon.style.color = isInWishlist ? 'var(--accent)' : '';
    });
}

function renderMissingProduct(message = 'Product not found.') {
    document.getElementById('productPageLayout').innerHTML = `
        <div class="product-page-empty">
            <h1>Product unavailable</h1>
            <p>${message}</p>
            <a class="btn-hero-primary" href="shop-all.html">Back to Shop</a>
        </div>
    `;
}

function getProductShippingPromise(product) {
    if (isBackorderOnly(product)) {
        return `${getBackorderLeadTime(product)} for this pair.`;
    }

    if (hasInStockSizes(product) && hasBackorderSizes(product)) {
        return `In-stock sizes ship fast. Other sizes ${getBackorderLeadTime(product).toLowerCase()}.`;
    }

    if (hasInStockSizes(product)) {
        return 'In-stock sizes ship fast with tracking after fulfillment.';
    }

    return getBackorderLeadTime(product);
}

function renderProduct(product) {
    document.title = `${product.name} | Backdoor`;
    const soldOut = isOutOfStock(product);
    const backorder = isBackorderOnly(product);
    document.getElementById('productBreadcrumbLabel').textContent = product.name;
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productCategoryLabel').textContent = product.category || 'Product';
    document.getElementById('productBrandLine').textContent = formatBrandLine(product);
    document.getElementById('productPrice').textContent = `$${(Number(product.price) || 0).toFixed(0)}`;
    document.getElementById('productDescription').textContent = backorder
        ? `${product.description || 'Premium authenticated product from Backdoor.'}\n\n${product.backorderLeadTime || 'Ships in 1.5-2 weeks'}.`
        : (product.description || 'Premium authenticated product from Backdoor.');
    renderProductPriceHistory(product);
    document.getElementById('productSku').textContent = product.sku || 'N/A';
    document.getElementById('productColorway').textContent = product.colorway || 'N/A';
    document.getElementById('productReleaseDate').textContent = product.releaseDate || 'TBD';
    const shippingPromise = document.getElementById('productShippingPromise');
    if (shippingPromise) {
        shippingPromise.textContent = getProductShippingPromise(product);
    }
    document.getElementById('productStockLabel').textContent = soldOut
        ? 'Out of stock'
        : backorder
            ? getBackorderLeadTime(product)
            : hasInStockSizes(product) && hasBackorderSizes(product)
                ? `${getTotalStock(product)} item${getTotalStock(product) !== 1 ? 's' : ''} in stock | other sizes ${getBackorderLeadTime(product).toLowerCase()}`
                : `${getTotalStock(product)} items available`;

    const badge = document.getElementById('productStatusBadge');
    if (backorder) {
        badge.textContent = 'Backorder';
        badge.className = 'modal-badge modal-badge--featured';
        badge.style.display = 'inline-block';
    } else if (soldOut) {
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
        const sizeBackorder = isBackorder(product, entry) && entry.stock <= 0;
        const sizeSoldOut = entry.stock <= 0 && !sizeBackorder;
        return `
            <button type="button" class="size-option ${sizeSoldOut ? 'out-of-stock' : ''} ${sizeBackorder ? 'backorder' : ''}" ${sizeSoldOut ? 'disabled' : ''} data-size="${entry.size}" data-backorder="${sizeBackorder}" onclick="selectProductSize(this)">
                ${entry.size}${sizeBackorder ? '<span class="size-option-tag">BO</span>' : ''}
            </button>
        `;
    }).join('');

    const addToCartButton = document.getElementById('productAddToCart');
    addToCartButton.disabled = soldOut;
    addToCartButton.textContent = soldOut ? 'Out of Stock' : backorder ? 'Select Size for Backorder' : sizes.length > 0 ? 'Select Size' : 'Add to Cart';
    if (!soldOut && sizes.length === 0) {
        selectedSize = 'One Size';
        selectedSizeBackorder = backorder;
    }

    document.querySelector('.product-back-link')?.setAttribute('href', buildBackHref(product));
    syncOfferForm(product);
    updateWishlistBtnUI();
}

function initProductReviews(product) {
    if (unsubscribeReviews) unsubscribeReviews();

    unsubscribeReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
        const dynamicReviews = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        const matched = mergeVisibleReviews(dynamicReviews).filter((review) => reviewMatchesProduct(review, product));
        renderProductReviews(matched);
    }, () => {
        renderProductReviews(mergeVisibleReviews([]).filter((review) => reviewMatchesProduct(review, product)));
    });
}

function renderProductReviews(reviews) {
    const section = document.getElementById('productReviewSection');
    const list = document.getElementById('productReviewList');
    if (!section || !list) return;

    if (!reviews.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = reviews.map((review) => `
        <article class="product-review-card">
            <div class="product-review-card-head">
                <div>
                    <div class="product-review-name">${escapeHtml(review.name)}</div>
                    <div class="product-review-stars">${'&#9733;'.repeat(review.rating)}</div>
                </div>
                <div class="product-review-meta">${escapeHtml(review.createdAtLabel || 'Live review')}</div>
            </div>
            <p class="product-review-comment">${escapeHtml(review.comment)}</p>
            <div class="product-review-gallery">
                ${review.images.map((image, index) => `
                    <button class="product-review-thumb" type="button" onclick="openLightbox('${escapeHtml(image)}')">
                        <img src="${escapeHtml(image)}" alt="${escapeHtml(review.name)} review image ${index + 1}" oncontextmenu="return false;" draggable="false" style="pointer-events: none;">
                    </button>
                `).join('')}
            </div>
        </article>
    `).join('');
}


function formatBrandLine(product) {
    const brand = String(product?.brand || '').trim();
    const colorway = String(product?.colorway || '').trim();

    if (brand && colorway) return `${brand} | ${colorway}`;
    return brand || colorway || '';
}

function buildBackHref(product) {
    if (product.category === 'Kids') return 'kids.html';
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
    selectedSizeBackorder = button.dataset.backorder === 'true';
    document.getElementById('productAddToCart').textContent = selectedSizeBackorder ? 'Add Backorder' : 'Add to Cart';

    const offerSize = document.getElementById('offerSize');
    if (offerSize) offerSize.value = selectedSize;
};

document.getElementById('productAddToCart')?.addEventListener('click', () => {
    if (!currentProduct || isOutOfStock(currentProduct)) return;
    if (!selectedSize) {
        showToast('Select a size first.', 'info');
        return;
    }

    const existing = cart.find((item) => item.id === currentProduct.id && item.size === selectedSize);
    if (existing) {
        const sizeEntry = getProductSizes(currentProduct).find((entry) => entry.size === selectedSize);
        const backorder = Boolean(selectedSizeBackorder || (sizeEntry && isBackorder(currentProduct, sizeEntry)));
        existing.qty += 1;
        existing.backorder = backorder;
        existing.backorderLeadTime = backorder ? getBackorderLeadTime(currentProduct, sizeEntry) : '';
    }
    else {
        const sizeEntry = getProductSizes(currentProduct).find((entry) => entry.size === selectedSize);
        const backorder = Boolean(selectedSizeBackorder || (sizeEntry && isBackorder(currentProduct, sizeEntry)));
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            brand: currentProduct.brand || '',
            price: Number(currentProduct.price) || 0,
            image: getProductImages(currentProduct)[0] || currentProduct.image || '',
            size: selectedSize,
            backorder,
            backorderLeadTime: backorder ? getBackorderLeadTime(currentProduct, sizeEntry) : '',
            qty: 1
        });
    }

    localStorage.setItem('backdoor-cart', JSON.stringify(cart.map(normalizeCartItem).filter((item) => item.name)));
    updateCartUI();
    showToast(`${currentProduct.name} added to cart.`);
});

function loadCartFromStorage() {
    try {
        const stored = JSON.parse(localStorage.getItem('backdoor-cart')) || [];
        return Array.isArray(stored) ? stored.map(normalizeCartItem).filter((item) => item.name) : [];
    } catch {
        return [];
    }
}

function normalizeCartItem(item) {
    return {
        id: item?.id || item?.productId || '',
        name: String(item?.name || '').trim(),
        brand: String(item?.brand || '').trim(),
        price: Number(item?.price) || 0,
        image: String(item?.image || '').trim(),
        size: String(item?.size || 'One Size').trim() || 'One Size',
        backorder: Boolean(item?.backorder),
        backorderLeadTime: String(item?.backorderLeadTime || '').trim(),
        qty: Math.max(1, Number(item?.qty) || Number(item?.quantity) || 1)
    };
}

function updateCartUI() {
    cart = cart.map(normalizeCartItem).filter((item) => item.name);
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCount) {
        cartCount.textContent = totalQty;
        cartCount.style.display = totalQty > 0 ? 'flex' : 'none';
    }

    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = `$${totalPrice.toFixed(2)}`;
    const checkoutButton = document.querySelector('#cartSidebar .cart-checkout');
    if (checkoutButton) checkoutButton.disabled = cart.length === 0;
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart-msg">
                <i class="fa-solid fa-bag-shopping"></i>
                <h4>Your bag is empty.</h4>
                <p>Add some heat and come back to checkout.</p>
            </div>
        `;
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-img">
                ${item.image
                    ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                    : ''}
                <span class="cart-item-fallback" ${item.image ? 'style="display:none"' : ''}><i class="fa-solid fa-shoe-prints"></i></span>
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">
                    <span>Size ${item.size}</span>
                    ${item.brand ? `<span>${item.brand}</span>` : ''}
                    ${item.backorder ? `<span>Backorder${item.backorderLeadTime ? ` | ${item.backorderLeadTime}` : ''}</span>` : ''}
                </div>
                <div class="cart-item-bottom">
                    <div class="qty-control">
                        <button class="qty-btn" type="button" onclick="updateCartQty(${index}, -1)" aria-label="Decrease quantity">−</button>
                        <div class="qty-val">${item.qty}</div>
                        <button class="qty-btn" type="button" onclick="updateCartQty(${index}, 1)" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
                </div>
                <button class="cart-item-remove" type="button" onclick="removeFromCart(${index})">
                    <i class="fa-solid fa-trash-can"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('backdoor-cart', JSON.stringify(cart.map(normalizeCartItem).filter((item) => item.name)));
    updateCartUI();
};

window.updateCartQty = (index, delta) => {
    const item = cart[index];
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    localStorage.setItem('backdoor-cart', JSON.stringify(cart.map(normalizeCartItem).filter((entry) => entry.name)));
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

// --- OFFER LOGIC ---

function syncOfferForm(product) {
    const askPrice = document.getElementById('offerAskPrice');
    const sizeSelect = document.getElementById('offerSize');
    const offerAmount = document.getElementById('offerAmount');
    const offerButton = document.getElementById('productOfferBtn');
    if (!product || !sizeSelect) return;

    const sizes = getProductSizes(product);
    const options = sizes.length > 0
        ? sizes.map((entry) => {
            const sizeBackorder = isBackorder(product, entry) && entry.stock <= 0;
            const sizeSoldOut = entry.stock <= 0 && !sizeBackorder;
            return `<option value="${escapeHtml(entry.size)}">${escapeHtml(entry.size)}${sizeBackorder ? ' (backorder)' : sizeSoldOut ? ' (out of stock)' : ''}</option>`;
        }).join('')
        : '<option value="One Size">One Size</option>';

    sizeSelect.innerHTML = options;
    sizeSelect.value = selectedSize || sizeSelect.options[0]?.value || 'One Size';

    if (askPrice) askPrice.textContent = `$${(Number(product.price) || 0).toFixed(0)}`;
    if (offerAmount) offerAmount.value = String(Math.max(1, Math.round((Number(product.price) || 0) * 0.9)));
    if (offerButton) offerButton.disabled = false;
}

function openOfferModal() {
    if (!currentProduct) return;
    syncOfferForm(currentProduct);

    // Auto-fill for authenticated users
    if (auth.currentUser) {
        const nameField = document.getElementById('offerCustomerName');
        const emailField = document.getElementById('offerCustomerEmail');
        if (nameField && !nameField.value) {
            nameField.value = auth.currentUser.displayName || '';
        }
        if (emailField && !emailField.value) {
            emailField.value = auth.currentUser.email || '';
        }
    }

    document.getElementById('offerModal')?.classList.add('active');
}

function closeOfferModal() {
    document.getElementById('offerModal')?.classList.remove('active');
}

async function handleOfferSubmit(event) {
    event.preventDefault();
    if (!currentProduct) return;

    const submitButton = document.getElementById('offerSubmitBtn');
    const originalLabel = submitButton?.textContent || 'Submit Offer';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
    }

    const size = document.getElementById('offerSize')?.value || selectedSize || 'One Size';
    const offerAmount = Math.max(1, Number.parseFloat(document.getElementById('offerAmount')?.value || '0') || 0);
    const offerData = {
        productId: currentProduct.id,
        productName: currentProduct.name,
        productSku: currentProduct.sku || '',
        productImage: getProductImages(currentProduct)[0] || currentProduct.image || '',
        size,
        brand: currentProduct.brand || '',
        askingPrice: Number(currentProduct.price) || 0,
        offerAmount,
        customerName: String(document.getElementById('offerCustomerName')?.value || '').trim(),
        customerEmail: String(document.getElementById('offerCustomerEmail')?.value || '').trim(),
        customerPhone: String(document.getElementById('offerCustomerPhone')?.value || '').trim(),
        message: String(document.getElementById('offerMessage')?.value || '').trim(),
        status: 'pending',
        source: 'product-page'
    };

    // Validation improvements
    if (offerAmount >= (Number(currentProduct.price) || 0)) {
        showToast('Offer must be lower than the current asking price.', 'warn');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
        return;
    }

    if (offerAmount < (Number(currentProduct.price) || 0) * 0.4) {
        showToast('Your offer is too low. Please enter a more competitive amount.', 'warn');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
        return;
    }

    if (!offerData.customerName || !offerData.customerEmail || !size || !offerAmount) {
        showToast('Name, email, size, and offer amount are required.', 'error');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/create-offer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(offerData)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result?.error || 'Offer submission failed.');
        }

        document.getElementById('offerForm')?.reset();
        syncOfferForm(currentProduct);
        closeOfferModal();
        showToast('Offer submitted. We will review it and follow up.');
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Offer submission failed.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
    }
}
