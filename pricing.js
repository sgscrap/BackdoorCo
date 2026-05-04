/* ══════════════════════════════════════════
   BACKDOOR — SMART PRICING ENGINE JS
══════════════════════════════════════════ */

/* ── STATE ── */
import {
    BLACK_CAT_IMAGES,
    buildProductHref,
    getProductCardImage,
    getProductSizes,
    getSeededProducts,
    mergeCatalogProducts
} from './product-data.js';

let currentStrategy = 'competitive';
let currentMargin = 20;
let currentProduct = null;
let catalogProducts = [];
let trackedPricingRows = [];
let productsUnsubscribe = null;
const applyingProductIds = new Set();

let autoRules = [
    { id: 1, name: 'Beat Lowest Ask', condition: 'Market drops > 5%', action: 'Lower price to match', active: true },
    { id: 2, name: 'Protect Margin', condition: 'Margin < 15%', action: 'Raise to maintain 15%', active: true },
    { id: 3, name: 'Weekend Boost', condition: 'Fri–Sun', action: 'Lower price by 8%', active: false },
    { id: 4, name: 'Hype Surge', condition: 'Demand spike +30%', action: 'Raise price by 10%', active: true },
    { id: 5, name: 'Stale Inventory', condition: 'Listed > 30 days', action: 'Lower price by 5%', active: false },
];

/* ══════════════════════════════════════════
   SIMULATED MARKET DATA
   In production: replace with real API calls
══════════════════════════════════════════ */
const MARKET_DB = {
    'jordan 1 retro high og chicago': {
        name: 'Air Jordan 1 Retro High OG "Chicago"', brand: 'Jordan', sku: '555088-101', retail: 170, emoji: '👟',
        sizes: [
            { size: '7', goat: 620, stockx: 595, yours: 580 },
            { size: '7.5', goat: 640, stockx: 610, yours: 600 },
            { size: '8', goat: 680, stockx: 655, yours: 650 },
            { size: '8.5', goat: 700, stockx: 670, yours: 680 },
            { size: '9', goat: 720, stockx: 695, yours: 710 },
            { size: '9.5', goat: 750, stockx: 720, yours: 700 },
            { size: '10', goat: 800, stockx: 770, yours: 760 },
            { size: '10.5', goat: 780, stockx: 755, yours: 750 },
            { size: '11', goat: 830, stockx: 800, yours: 810 },
            { size: '12', goat: 900, stockx: 860, yours: 840 },
        ],
        history: [
            { month: 'Jul', price: 920 }, { month: 'Aug', price: 880 }, { month: 'Sep', price: 850 },
            { month: 'Oct', price: 800 }, { month: 'Nov', price: 780 }, { month: 'Dec', price: 750 },
            { month: 'Jan', price: 720 },
        ],
    },
    'yeezy 350 v2 zebra': {
        name: 'Adidas Yeezy Boost 350 V2 "Zebra"', brand: 'Adidas', sku: 'CP9654', retail: 220, emoji: '🦓',
        sizes: [
            { size: '7', goat: 290, stockx: 275, yours: 280 },
            { size: '8', goat: 310, stockx: 295, yours: 285 },
            { size: '9', goat: 330, stockx: 315, yours: 320 },
            { size: '10', goat: 340, stockx: 325, yours: 300 },
            { size: '11', goat: 360, stockx: 345, yours: 355 },
            { size: '12', goat: 390, stockx: 370, yours: 380 },
        ],
        history: [
            { month: 'Jul', price: 380 }, { month: 'Aug', price: 350 }, { month: 'Sep', price: 330 },
            { month: 'Oct', price: 310 }, { month: 'Nov', price: 320 }, { month: 'Dec', price: 330 },
            { month: 'Jan', price: 310 },
        ],
    },
    'nike dunk low panda': {
        name: 'Nike Dunk Low Retro "Panda"', brand: 'Nike', sku: 'DD1391-100', retail: 110, emoji: '🐼',
        sizes: [
            { size: '7', goat: 145, stockx: 138, yours: 135 },
            { size: '8', goat: 155, stockx: 148, yours: 150 },
            { size: '9', goat: 165, stockx: 158, yours: 155 },
            { size: '10', goat: 180, stockx: 170, yours: 168 },
            { size: '11', goat: 190, stockx: 180, yours: 185 },
            { size: '12', goat: 210, stockx: 198, yours: 195 },
        ],
        history: [
            { month: 'Jul', price: 210 }, { month: 'Aug', price: 195 }, { month: 'Sep', price: 180 },
            { month: 'Oct', price: 170 }, { month: 'Nov', price: 165 }, { month: 'Dec', price: 155 },
            { month: 'Jan', price: 150 },
        ],
    },
    'travis scott nike dunk low': {
        name: 'Travis Scott x Nike Dunk Low "Jackboys"', brand: 'Nike x Travis Scott', sku: 'DR0188-300', retail: 150, emoji: '🤠',
        sizes: [
            { size: '8', goat: 1200, stockx: 1150, yours: 1100 },
            { size: '9', goat: 1300, stockx: 1250, yours: 1200 },
            { size: '10', goat: 1400, stockx: 1350, yours: 1380 },
            { size: '11', goat: 1500, stockx: 1450, yours: 1420 },
            { size: '12', goat: 1600, stockx: 1550, yours: 1520 },
        ],
        history: [
            { month: 'Jul', price: 1800 }, { month: 'Aug', price: 1700 }, { month: 'Sep', price: 1600 },
            { month: 'Oct', price: 1500 }, { month: 'Nov', price: 1400 }, { month: 'Dec', price: 1350 },
            { month: 'Jan', price: 1300 },
        ],
    },
    'new balance 550 white green': {
        name: 'New Balance 550 "White Green"', brand: 'New Balance', sku: 'BB550WT1', retail: 110, emoji: '💚',
        sizes: [
            { size: '7', goat: 130, stockx: 125, yours: 128 },
            { size: '8', goat: 140, stockx: 135, yours: 132 },
            { size: '9', goat: 150, stockx: 145, yours: 148 },
            { size: '10', goat: 160, stockx: 155, yours: 150 },
            { size: '11', goat: 170, stockx: 165, yours: 168 },
            { size: '12', goat: 190, stockx: 182, yours: 185 },
        ],
        history: [
            { month: 'Jul', price: 180 }, { month: 'Aug', price: 170 }, { month: 'Sep', price: 160 },
            { month: 'Oct', price: 155 }, { month: 'Nov', price: 148 }, { month: 'Dec', price: 140 },
            { month: 'Jan', price: 135 },
        ],
    },
};

const DEMO_INVENTORY = [
    { name: 'Jordan 1 Retro High OG Chicago', sku: '555088-101', yours: 760, market: 737, emoji: '👟' },
    { name: 'Yeezy 350 V2 Zebra', sku: 'CP9654', yours: 320, market: 310, emoji: '🦓' },
    { name: 'Nike Dunk Low Panda', sku: 'DD1391-100', yours: 168, market: 159, emoji: '🐼' },
    { name: 'Travis Scott Dunk Low', sku: 'DR0188-300', yours: 1380, market: 1275, emoji: '🤠' },
    { name: 'New Balance 550 White', sku: 'BB550WT1', yours: 150, market: 148, emoji: '💚' },
    { name: 'Jordan 4 Retro Military Blue', sku: '408452-105', yours: 310, market: 340, emoji: '👟' },
    { name: 'Nike Air Max 1 "86 OG Big Bubble"', sku: 'DO9844-101', yours: 185, market: 180, emoji: '💨' },
];

const MARKET_BENCHMARK_DATE = 'March 24, 2026';
const PRICE_VARIANCE_THRESHOLD = 15;
const TRACKED_MARKET_WATCH = [
    {
        key: 'black-cat',
        benchmarkPrice: 750,
        benchmarkSourceLabel: 'StockX Buy Now',
        benchmarkSourceUrl: 'https://stockx.com/air-jordan-4-retro-black-cat-2020',
        match(product) {
            const name = String(product?.name || '').toLowerCase();
            const sku = String(product?.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return (name.includes('black cat') && name.includes('jordan 4')) || sku === 'cu1110010' || sku === 'fv5029010';
        },
        fallbackProduct: {
            id: '3BnEYfFRQGN1zhIrqQgv',
            name: "Jordan 4 Retro 'Black Cat' 2020",
            brand: 'Jordan',
            category: 'Sneakers',
            price: 290,
            image: BLACK_CAT_IMAGES[0]
        }
    },
    {
        key: 'adult-black-phantom',
        benchmarkPrice: 841,
        benchmarkSourceLabel: 'StockX Buy Now',
        benchmarkSourceUrl: 'https://stockx.com/air-jordan-1-retro-low-og-sp-travis-scott-black-phantom',
        match(product) {
            const id = String(product?.id || '').toLowerCase();
            const name = String(product?.name || '').toLowerCase();
            const sku = String(product?.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return id === 'seed-men-travis-black-phantom' || sku === 'dm7866001' || (name.includes('black phantom') && !name.includes(' ps ') && !name.includes('td'));
        }
    },
    {
        key: 'velvet-brown',
        benchmarkPrice: 400,
        benchmarkSourceLabel: 'StockX Buy Now',
        benchmarkSourceUrl: 'https://stockx.com/es-es/air-jordan-1-retro-low-og-sp-travis-scott-velvet-brown',
        match(product) {
            const id = String(product?.id || '').toLowerCase();
            const name = String(product?.name || '').toLowerCase();
            const sku = String(product?.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return id === 'seed-men-travis-velvet-brown' || sku === 'dm7866202' || name.includes('velvet brown');
        }
    },
    {
        key: 'yeezy-slide-onyx',
        benchmarkPrice: 134,
        benchmarkSourceLabel: 'StockX Buy Now',
        benchmarkSourceUrl: 'https://stockx.com/en-gb/adidas-yeezy-slide-black-onyx?size=10',
        match(product) {
            const id = String(product?.id || '').toLowerCase();
            const name = String(product?.name || '').toLowerCase();
            const sku = String(product?.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return id === 'seed-yeezy-slide-onyx' || sku === 'hq6448' || (name.includes('yeezy slide') && name.includes('onyx'));
        }
    },
    {
        key: 'kobe-bruce-lee',
        benchmarkPrice: 400,
        benchmarkSourceLabel: 'GOAT Buy New',
        benchmarkSourceUrl: 'https://www.goat.com/sneakers/nike-zoom-kobe-5-protro-bruce-lee-alt-cd4991-101',
        match(product) {
            const id = String(product?.id || '').toLowerCase();
            const name = String(product?.name || '').toLowerCase();
            const sku = String(product?.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return id === 'seed-kobe-5-alternate-bruce-lee' || sku === 'cd4991101' || name.includes('alternate bruce lee');
        }
    },
    {
        key: 'new-balance-sea-salt',
        benchmarkPrice: 87,
        benchmarkSourceLabel: 'StockX Buy Now',
        benchmarkSourceUrl: 'https://stockx.com/en-gb/new-balance-m2002-protection-pack-sea-salt',
        match(product) {
            const id = String(product?.id || '').toLowerCase();
            const name = String(product?.name || '').toLowerCase();
            return id === 'seed-nb-2002r-protection-pack-sea-salt' || name.includes('protection pack sea salt');
        }
    },
    {
        key: 'off-white-the-ten',
        benchmarkPrice: 1350,
        benchmarkSourceLabel: 'StockX Lowest Ask',
        benchmarkSourceUrl: 'https://stockx.com/nike-air-force-1-low-off-white',
        match(product) {
            const id = String(product?.id || '').toLowerCase();
            const name = String(product?.name || '').toLowerCase();
            const sku = String(product?.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return id === 'seed-off-white-nike-air-force-1-low-the-ten' || sku === 'ao4606100' || (name.includes('air force 1') && name.includes('the ten'));
        },
        fallbackProduct: {
            id: 'seed-off-white-nike-air-force-1-low-the-ten',
            name: "Off-White x Nike Air Force 1 Low 'The Ten'",
            brand: 'Nike x Off-White',
            category: 'Sneakers',
            price: 1300,
            image: 'https://mysportsshoe.com/wp-content/uploads/2018/06/802491_01.jpg'
        }
    }
];

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-xmark' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(110%)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function formatMoney(value) {
    const amount = Number(value) || 0;
    return `$${Math.round(amount)}`;
}

function roundToNearestFive(value) {
    return Math.round((Number(value) || 0) / 5) * 5;
}

function isFootwearProduct(product) {
    const category = String(product?.category || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return ['sneakers', 'shoes', 'kids'].includes(category)
        || name.includes('jordan')
        || name.includes('nike')
        || name.includes('yeezy')
        || name.includes('kobe')
        || name.includes('new balance')
        || name.includes('off-white');
}

function getCurrentProductPrice(product) {
    const directPrice = Number(product?.price);
    if (directPrice > 0) return directPrice;

    const sizes = getProductSizes(product);
    if (!sizes.length) return 0;

    return avg(sizes.map((entry) => Number(entry.price) || 0).filter(Boolean));
}

function buildSuggestedBenchmarkPrice(benchmarkPrice) {
    const benchmark = Number(benchmarkPrice) || 0;
    if (!benchmark) return 0;
    const discount = Math.min(100, benchmark * 0.2);
    return Math.max(0, roundToNearestFive(benchmark - discount));
}

function createFallbackHref(product) {
    if (!product?.id || !product?.name) return '#';
    return buildProductHref(product);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTrackedRowById(productId) {
    return trackedPricingRows.find((row) => row.id === productId) || null;
}

function buildPriceUpdatePayload(product, newPrice) {
    const normalizedPrice = Number(newPrice) || 0;
    const payload = {
        ...product,
        price: normalizedPrice,
        updatedAt: window.firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString(),
        lastSuggestedPrice: normalizedPrice,
        lastPricedFrom: 'pricing-watch'
    };

    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
        payload.sizes = product.sizes.map((entry) => ({
            ...entry,
            price: normalizedPrice
        }));
    }

    if (!product?.createdAt && window.firebase?.firestore?.FieldValue?.serverTimestamp) {
        payload.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
    }

    return payload;
}

async function applyTrackedPriceById(productId) {
    const row = getTrackedRowById(productId);
    if (!row) {
        showToast('Tracked product not found.', 'error');
        return;
    }

    if (applyingProductIds.has(productId)) {
        return;
    }

    if (!window.firebase?.firestore) {
        showToast('Live pricing write unavailable on this page.', 'error');
        return;
    }

    const sourceProduct = row.sourceProduct || catalogProducts.find((product) => product.id === productId);
    if (!sourceProduct) {
        showToast('Unable to resolve the product record for pricing.', 'error');
        return;
    }

    applyingProductIds.add(productId);
    renderTrackedPricingBoard();
    renderBulkTable();

    try {
        const db = window.firebase.firestore();
        const payload = buildPriceUpdatePayload(sourceProduct, row.suggestedPrice);
        await db.collection('products').doc(productId).set(payload, { merge: true });

        const existingIndex = catalogProducts.findIndex((product) => product.id === productId);
        if (existingIndex >= 0) {
            catalogProducts = catalogProducts.map((product) => {
                if (product.id !== productId) return product;
                return {
                    ...product,
                    ...payload
                };
            });
        } else {
            catalogProducts = [...catalogProducts, { ...sourceProduct, ...payload }];
        }
        refreshTrackedPricingFromCatalog(catalogProducts);
        showToast(`${row.name}: price updated to ${formatMoney(row.suggestedPrice)}`);
    } catch (error) {
        console.error('Tracked pricing update failed', error);
        const isPermissionError = String(error?.code || '').includes('permission');
        showToast(
            isPermissionError
                ? 'Pricing write blocked. Sign in with the admin account first.'
                : 'Unable to update the product price right now.',
            'error'
        );
    } finally {
        applyingProductIds.delete(productId);
        renderTrackedPricingBoard();
        renderBulkTable();
    }
}

function buildTrackedPricingRow(product, config) {
    const benchmarkPrice = Number(config?.benchmarkPrice) || 0;
    const currentPrice = getCurrentProductPrice(product);
    if (!benchmarkPrice || !currentPrice) return null;

    const suggestedPrice = buildSuggestedBenchmarkPrice(benchmarkPrice);
    const delta = roundToNearestFive(suggestedPrice - currentPrice);
    const status = delta >= 0 ? 'under' : 'over';
    const absDelta = Math.abs(delta);

    if (absDelta < PRICE_VARIANCE_THRESHOLD) {
        return null;
    }

    const href = product?.href || createFallbackHref(product);
    const image = String(product?.cardImage || product?.image || '').trim() || BLACK_CAT_IMAGES[0];
    return {
        key: config.key,
        id: product?.id || config.key,
        brand: String(product?.brand || '').trim() || 'Tracked',
        name: String(product?.name || '').trim() || 'Tracked product',
        sku: String(product?.sku || '').trim(),
        href,
        image,
        currentPrice,
        benchmarkPrice,
        suggestedPrice,
        delta,
        absDelta,
        status,
        sourceProduct: product,
        benchmarkSourceLabel: config.benchmarkSourceLabel,
        benchmarkSourceUrl: config.benchmarkSourceUrl
    };
}

function getTrackedCatalogProducts(products) {
    const baseProducts = [...products];
    const rows = [];

    TRACKED_MARKET_WATCH.forEach((config) => {
        const matchedProduct = baseProducts.find((product) => config.match(product));
        const product = matchedProduct || config.fallbackProduct;
        if (!product) return;

        const normalizedProduct = {
            ...product,
            image: product.image || getProductCardImage(product),
            cardImage: getProductCardImage(product)
        };
        const row = buildTrackedPricingRow(normalizedProduct, config);
        if (row) {
            rows.push(row);
        }
    });

    return rows.sort((left, right) => right.absDelta - left.absDelta);
}

function renderOpportunityCards(targetId, items, status) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (!items.length) {
        target.innerHTML = `
            <div class="empty-state small">
                <i class="fa-solid ${status === 'under' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} empty-icon small"></i>
                No ${status === 'under' ? 'underpriced' : 'overpriced'} tracked shoes right now.
            </div>
        `;
        return;
    }

    target.innerHTML = items.map((item) => `
        <article class="opportunity-card opportunity-card--${status}">
            <div class="opportunity-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="opportunity-body">
                <div class="opportunity-kicker">
                    <span class="opportunity-status opportunity-status--${status}">
                        ${status === 'under' ? 'Underpriced' : 'Overpriced'}
                    </span>
                    <span class="opportunity-gap opportunity-gap--${status}">
                        ${status === 'under' ? '+' : '-'}${formatMoney(item.absDelta)}
                    </span>
                </div>
                <div>
                    <div class="opportunity-brand">${item.brand}</div>
                    <div class="opportunity-name">${item.name}</div>
                </div>
                <div class="opportunity-prices">
                    <div class="opportunity-price-cell">
                        <span class="opportunity-price-label">Current</span>
                        <div class="opportunity-price-value opportunity-price-value--current">${formatMoney(item.currentPrice)}</div>
                    </div>
                    <div class="opportunity-price-cell">
                        <span class="opportunity-price-label">Market</span>
                        <div class="opportunity-price-value opportunity-price-value--market">${formatMoney(item.benchmarkPrice)}</div>
                    </div>
                    <div class="opportunity-price-cell">
                        <span class="opportunity-price-label">Suggested</span>
                        <div class="opportunity-price-value opportunity-price-value--suggested">${formatMoney(item.suggestedPrice)}</div>
                    </div>
                </div>
                <div class="opportunity-source">
                    <span>${item.benchmarkSourceLabel} benchmark on ${MARKET_BENCHMARK_DATE}</span>
                    <a href="${item.benchmarkSourceUrl}" target="_blank" rel="noreferrer">View source</a>
                </div>
                <div class="opportunity-actions">
                    <button
                        class="opportunity-link opportunity-link--primary"
                        onclick='applyTrackedPriceById(${JSON.stringify(item.id)})'
                        ${applyingProductIds.has(item.id) ? 'disabled' : ''}
                    >
                        ${applyingProductIds.has(item.id) ? 'Applying...' : `Set ${formatMoney(item.suggestedPrice)}`}
                    </button>
                    <a class="opportunity-link" href="${item.href}">View product</a>
                </div>
            </div>
        </article>
    `).join('');
}

function renderTrackedPricingBoard() {
    const rows = [...trackedPricingRows];
    const underpriced = rows.filter((item) => item.status === 'under');
    const overpriced = rows.filter((item) => item.status === 'over');

    document.getElementById('underpricedCount').textContent = `${underpriced.length} tracked`;
    document.getElementById('overpricedCount').textContent = `${overpriced.length} tracked`;

    const meta = document.getElementById('pricingBoardMeta');
    if (meta) {
        meta.textContent = rows.length
            ? `Benchmarks observed on ${MARKET_BENCHMARK_DATE}. Suggested prices target about 20% off market, capped at $100.`
            : `Add tracked shoe comps to compare live catalog pricing against market benchmarks.`;
    }

    renderOpportunityCards('underpricedGrid', underpriced, 'under');
    renderOpportunityCards('overpricedGrid', overpriced, 'over');
}

function buildBulkRows() {
    if (trackedPricingRows.length) {
        return trackedPricingRows.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku || item.key.toUpperCase(),
            yours: item.currentPrice,
            market: item.benchmarkPrice,
            suggested: item.suggestedPrice,
            href: item.href,
            image: item.image,
            status: item.status
        }));
    }

    return DEMO_INVENTORY.map((item) => ({
        ...item,
        suggested: calcSuggestedPrice(item.market * 1.04, item.market * 0.96, currentStrategy, item.market * 0.6, currentMargin)
    }));
}

function updateTrackedStats() {
    const rows = buildBulkRows();
    if (!rows.length) {
        animateCounter('statAvgYours', '$0');
        animateCounter('statAvgMarket', '$0');
        animateCounter('statUnder', '0');
        animateCounter('statOver', '0');
        animateCounter('statGain', '$0');
        return;
    }

    const avgYours = avg(rows.map((row) => row.yours));
    const avgMarket = avg(rows.map((row) => row.market));
    const under = rows.filter((row) => row.yours < row.suggested - PRICE_VARIANCE_THRESHOLD).length;
    const over = rows.filter((row) => row.yours > row.suggested + PRICE_VARIANCE_THRESHOLD).length;
    const totalGain = rows.reduce((sum, row) => sum + (row.suggested - row.yours), 0);

    animateCounter('statAvgYours', formatMoney(avgYours));
    animateCounter('statAvgMarket', formatMoney(avgMarket));
    animateCounter('statUnder', String(under));
    animateCounter('statOver', String(over));
    animateCounter('statGain', `${totalGain >= 0 ? '+' : '-'}${formatMoney(Math.abs(totalGain))}`);
}

function refreshTrackedPricingFromCatalog(nextProducts) {
    catalogProducts = nextProducts;
    trackedPricingRows = getTrackedCatalogProducts(catalogProducts);
    renderTrackedPricingBoard();
    renderBulkTable();
    updateTrackedStats();
}

function subscribeToProducts() {
    const seededProducts = mergeCatalogProducts(getSeededProducts());
    refreshTrackedPricingFromCatalog(seededProducts);

    if (!window.firebase?.firestore) {
        return;
    }

    try {
        const db = window.firebase.firestore();
        productsUnsubscribe?.();
        productsUnsubscribe = db.collection('products').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            const liveProducts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            refreshTrackedPricingFromCatalog(mergeCatalogProducts(liveProducts));
        }, (error) => {
            console.error('Pricing products sync failed', error);
            showToast('Live pricing sync unavailable. Using tracked catalog defaults.', 'warn');
        });
    } catch (error) {
        console.error('Unable to start pricing product sync', error);
    }
}

/* ══════════════════════════════════════════
   PRICING LOGIC
══════════════════════════════════════════ */
function calcSuggestedPrice(goat, stockx, strategy, retail, margin) {
    const marketAvg = (goat + stockx) / 2;
    const lowestAsk = Math.min(goat, stockx);
    const minPrice = retail * (1 + margin / 100);

    let suggested;
    switch (strategy) {
        case 'competitive': suggested = marketAvg * 0.95; break;
        case 'premium': suggested = marketAvg * 1.10; break;
        case 'match': suggested = lowestAsk; break;
        case 'aggressive': suggested = marketAvg * 0.85; break;
        default: suggested = marketAvg * 0.95;
    }

    suggested = Math.max(suggested, minPrice);
    return Math.round(suggested / 5) * 5;
}

function getPositionLabel(yours, marketAvg) {
    const diff = ((yours - marketAvg) / marketAvg) * 100;
    if (diff < -10) return { label: 'Great Deal', class: 'best', icon: '🔥' };
    if (diff < -3) return { label: 'Competitive', class: 'cheaper', icon: '✅' };
    if (diff < 3) return { label: 'Fair Price', class: 'same', icon: '⚖️' };
    if (diff < 10) return { label: 'Above Market', class: 'pricier', icon: '⚠️' };
    return { label: 'Overpriced', class: 'pricier', icon: '❌' };
}

function getGaugeAngle(yours, marketAvg) {
    const diff = ((yours - marketAvg) / marketAvg) * 100;
    const clamped = Math.max(-30, Math.min(30, diff));
    return (clamped / 30) * 90;
}

/* ══════════════════════════════════════════
   FETCH MARKET DATA (Simulated)
══════════════════════════════════════════ */
async function fetchMarketData() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!query) { showToast('Enter a product name or SKU', 'error'); return; }

    setSearchLoading(true);
    await delay(1200);

    const key = Object.keys(MARKET_DB).find(k =>
        k.includes(query) || query.includes(k.split(' ')[0])
    );

    const data = MARKET_DB[key];

    if (!data) {
        showToast('Product not found — try another search', 'error');
        setSearchLoading(false);
        document.getElementById('resultArea').innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-xmark" style="font-size:36px;color:var(--red);margin-bottom:12px;display:block"></i>
        No market data found for "<strong style="color:var(--text2)">${query}</strong>"<br/>
        <span style="font-size:12px;margin-top:8px;display:block">Try: Jordan 1 Chicago, Yeezy 350 Zebra, Dunk Low Panda</span>
      </div>
    `;
        return;
    }

    currentProduct = data;
    setSearchLoading(false);
    renderProductResult(data);
    renderPriceTable(data);
    renderPriceHistory(data);
    renderRecommendation(data);
    renderAlerts(data);
    updateGauge(data);
    showToast(`✓ Market data loaded for ${data.name}`);
}

function quickSearch(term) {
    document.getElementById('searchInput').value = term;
    fetchMarketData();
}

function setSearchLoading(loading) {
    const btn = document.getElementById('searchBtn');
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner"></div> Fetching...';
        document.getElementById('resultArea').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:10px 0">
        <div class="skeleton" style="height:80px"></div>
        <div class="skeleton" style="height:20px;width:60%"></div>
        <div class="skeleton" style="height:20px;width:40%"></div>
      </div>
    `;
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-chart-line"></i> Get Prices';
    }
}

/* ══════════════════════════════════════════
   RENDER FUNCTIONS
══════════════════════════════════════════ */
function renderProductResult(data) {
    const avgGoat = avg(data.sizes.map(s => s.goat));
    const avgStockX = avg(data.sizes.map(s => s.stockx));
    const avgYours = avg(data.sizes.map(s => s.yours));
    const marketAvg = (avgGoat + avgStockX) / 2;
    const pos = getPositionLabel(avgYours, marketAvg);
    const premium = ((avgYours - data.retail) / data.retail * 100).toFixed(0);

    document.getElementById('resultArea').innerHTML = `
    <div class="product-result">
      <div class="product-thumb">${data.emoji}</div>
      <div class="product-meta">
        <div class="product-name">${data.name}</div>
        <div class="product-sku">${data.brand} · SKU: ${data.sku}</div>
        <div class="product-tags">
          <span class="tag">Retail: $${data.retail}</span>
          <span class="tag">GOAT Avg: $${Math.round(avgGoat)}</span>
          <span class="tag">StockX Avg: $${Math.round(avgStockX)}</span>
          <span class="tag">${premium}% above retail</span>
          <span class="price-vs-market ${pos.class}">${pos.icon} ${pos.label}</span>
        </div>
      </div>
      <div class="product-price-col">
        <div class="product-price-label">YOUR AVG</div>
        <div class="product-price-large">$${Math.round(avgYours)}</div>
        <div class="product-price-sub">Market: $${Math.round(marketAvg)}</div>
      </div>
    </div>
  `;
}

function renderPriceTable(data) {
    const card = document.getElementById('comparisonCard');
    const tbody = document.getElementById('priceTableBody');
    card.classList.remove('hidden');

    const floor = parseFloat(document.getElementById('priceFloor').value) || 0;
    const ceiling = parseFloat(document.getElementById('priceCeiling').value) || 99999;

    tbody.innerHTML = data.sizes.map(s => {
        const marketAvg = (s.goat + s.stockx) / 2;
        const suggested = Math.min(ceiling, Math.max(floor,
            calcSuggestedPrice(s.goat, s.stockx, currentStrategy, data.retail, currentMargin)
        ));
        const pos = getPositionLabel(s.yours, marketAvg);
        const diff = s.yours - marketAvg;
        const diffPct = ((diff / marketAvg) * 100).toFixed(1);
        const diffStr = diff >= 0 ? `+$${Math.round(diff)}` : `-$${Math.round(Math.abs(diff))}`;

        return `
      <tr>
        <td><strong>${s.size}</strong></td>
        <td><div class="price-cell accent">$${s.yours}</div></td>
        <td><div style="font-weight:600;color:var(--text2)">$${s.goat}</div><div style="font-size:10px;color:var(--text3)">GOAT</div></td>
        <td><div style="font-weight:600;color:var(--text2)">$${s.stockx}</div><div style="font-size:10px;color:var(--text3)">StockX</div></td>
        <td><div style="font-weight:700">$${Math.round(marketAvg)}</div><div style="font-size:10px;color:var(--text3)">${diffStr} (${diffPct}%)</div></td>
        <td><span class="price-vs-market ${pos.class}">${pos.icon} ${pos.label}</span></td>
        <td><div class="price-cell green" style="font-size:20px">$${suggested}</div></td>
        <td><button class="apply-size-btn" onclick="applyPrice(${s.yours}, ${suggested}, 'US ${s.size}')">Apply</button></td>
      </tr>
    `;
    }).join('');
}

function renderPriceHistory(data) {
    const card = document.getElementById('historyCard');
    const chart = document.getElementById('historyChart');
    const title = document.getElementById('historyTitle');

    card.classList.remove('hidden');
    title.textContent = data.name;

    const prices = data.history.map(h => h.price);
    const maxP = Math.max(...prices);
    const minP = Math.min(...prices);

    chart.innerHTML = data.history.map((h, i) => {
        const heightPct = ((h.price - minP) / (maxP - minP + 1)) * 100;
        const isLast = i === data.history.length - 1;
        const color = isLast ? 'var(--accent)' : 'var(--border2)';

        return `
      <div class="h-bar-wrap">
        <div class="h-bar" style="height:${Math.max(heightPct, 8)}%;background:${color}" data-tip="${h.month}: $${h.price}"></div>
        <span class="h-label">${h.month}</span>
      </div>
    `;
    }).join('');
}

function renderRecommendation(data) {
    const avgGoat = avg(data.sizes.map(s => s.goat));
    const avgStockX = avg(data.sizes.map(s => s.stockx));
    const marketAvg = (avgGoat + avgStockX) / 2;
    const suggested = calcSuggestedPrice(avgGoat, avgStockX, currentStrategy, data.retail, currentMargin);
    const avgYours = avg(data.sizes.map(s => s.yours));
    const diff = suggested - avgYours;
    const diffStr = diff >= 0
        ? `<span style="color:var(--green)">+$${Math.round(diff)} increase</span>`
        : `<span style="color:var(--red)">-$${Math.round(Math.abs(diff))} decrease</span>`;

    const strategyDesc = {
        competitive: 'Priced 5% below market average to attract buyers quickly.',
        premium: 'Priced 10% above market to maximize profit per unit.',
        match: 'Matched to the current lowest ask on major platforms.',
        aggressive: 'Priced 15% below market to move inventory fast.',
    };

    const profitPerUnit = suggested - data.retail;
    const marginPct = ((profitPerUnit / data.retail) * 100).toFixed(0);
    const lowestAsk = Math.min(avgGoat, avgStockX);
    const vsLowest = ((suggested - lowestAsk) / lowestAsk * 100).toFixed(1);

    document.getElementById('recContent').innerHTML = `
    <div class="rec-box">
      <h3>⚡ SUGGESTED PRICE</h3>
      <div class="rec-price">$${suggested}</div>
      <div class="rec-reason">
        ${strategyDesc[currentStrategy]}<br/>
        Market avg: <strong>$${Math.round(marketAvg)}</strong> ·
        Your current avg: <strong>$${Math.round(avgYours)}</strong><br/>
        Change: ${diffStr} per unit
      </div>
    </div>

    <div class="rec-stat-grid">
      <div class="rec-stat-box">
        <div class="rec-stat-label">PROFIT / UNIT</div>
        <div class="rec-stat-value green">$${Math.round(profitPerUnit)}</div>
      </div>
      <div class="rec-stat-box">
        <div class="rec-stat-label">MARGIN</div>
        <div class="rec-stat-value accent">${marginPct}%</div>
      </div>
      <div class="rec-stat-box">
        <div class="rec-stat-label">VS LOWEST ASK</div>
        <div class="rec-stat-value">${vsLowest > 0 ? '+' : ''}${vsLowest}%</div>
      </div>
      <div class="rec-stat-box">
        <div class="rec-stat-label">TREND</div>
        <div class="rec-stat-value red">📉 Declining</div>
      </div>
    </div>

    <button class="apply-btn" onclick="applyAllPrices()">
      <i class="fa-solid fa-check"></i> APPLY SUGGESTED PRICES
    </button>
    <button class="add-rule-btn" style="width:100%;margin-top:8px;text-align:center" onclick="showToast('Price exported to CSV', 'info')">
      <i class="fa-solid fa-download"></i> Export Price Report
    </button>
  `;
}

function renderAlerts(data) {
    const avgGoat = avg(data.sizes.map(s => s.goat));
    const avgStockX = avg(data.sizes.map(s => s.stockx));
    const avgYours = avg(data.sizes.map(s => s.yours));
    const marketAvg = (avgGoat + avgStockX) / 2;
    const diffPct = ((avgYours - marketAvg) / marketAvg * 100).toFixed(1);

    const alerts = [];

    // Price trend alert
    const history = data.history;
    const recent = history[history.length - 1].price;
    const earlier = history[0].price;
    const trendPct = ((recent - earlier) / earlier * 100).toFixed(0);

    if (trendPct < -10) {
        alerts.push({ type: 'alert-red', icon: 'fa-arrow-trend-down', msg: `Price dropped ${Math.abs(trendPct)}% over ${history.length} months — consider lowering to match.` });
    } else if (trendPct < -3) {
        alerts.push({ type: 'alert-orange', icon: 'fa-arrow-trend-down', msg: `Gradual decline of ${Math.abs(trendPct)}% — monitor closely.` });
    }

    // Position alerts
    if (diffPct > 5) {
        alerts.push({ type: 'alert-red', icon: 'fa-triangle-exclamation', msg: `Your price is ${diffPct}% above market average — may slow sales.` });
    } else if (diffPct < -8) {
        alerts.push({ type: 'alert-green', icon: 'fa-arrow-up', msg: `You're ${Math.abs(diffPct)}% below market — room to increase price by ~$${Math.round(marketAvg - avgYours)}.` });
    } else {
        alerts.push({ type: 'alert-accent', icon: 'fa-check', msg: `Your pricing is competitive — within 5% of market average.` });
    }

    // Margin alert
    const margin = ((avgYours - data.retail) / data.retail * 100);
    if (margin < 20) {
        alerts.push({ type: 'alert-orange', icon: 'fa-percent', msg: `Profit margin is ${margin.toFixed(0)}% — below recommended 20% minimum.` });
    }

    // Size-specific alerts
    const underpriced = data.sizes.filter(s => {
        const mkt = (s.goat + s.stockx) / 2;
        return ((s.yours - mkt) / mkt * 100) < -8;
    });

    if (underpriced.length > 0) {
        const szList = underpriced.map(s => s.size).join(', ');
        alerts.push({ type: 'alert-green', icon: 'fa-tags', msg: `Sizes ${szList} are significantly underpriced — opportunity to increase.` });
    }

    document.getElementById('alertsList').innerHTML = alerts.map(a =>
        `<div class="alert ${a.type}"><i class="fa-solid ${a.icon}"></i><span>${a.msg}</span></div>`
    ).join('');
}

function updateGauge(data) {
    const avgGoat = avg(data.sizes.map(s => s.goat));
    const avgStockX = avg(data.sizes.map(s => s.stockx));
    const avgYours = avg(data.sizes.map(s => s.yours));
    const marketAvg = (avgGoat + avgStockX) / 2;

    const angle = getGaugeAngle(avgYours, marketAvg);
    const pos = getPositionLabel(avgYours, marketAvg);

    document.getElementById('gaugeNeedle').style.transform = `translateX(-50%) rotate(${angle}deg)`;
    document.getElementById('gaugeLabel').textContent = pos.label;
    document.getElementById('gaugeLabel').style.color = angle < -15 ? 'var(--green)' : angle > 15 ? 'var(--red)' : 'var(--accent)';
    document.getElementById('gaugeSub').textContent = `Your avg: $${Math.round(avgYours)} vs Market: $${Math.round(marketAvg)}`;

    // Market bar needle
    const barPct = Math.max(5, Math.min(95, 50 + (angle / 90) * 50));
    const needle = document.getElementById('marketNeedle');
    needle.style.left = barPct + '%';
    needle.dataset.label = `$${Math.round(avgYours)}`;
}

/* ══════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════ */
function applyPrice(oldPrice, newPrice, sizeLabel) {
    showToast(`${sizeLabel}: $${oldPrice} → $${newPrice} applied`);
}

function applyAllPrices() {
    if (!currentProduct) { showToast('Search a product first', 'error'); return; }
    showToast(`All sizes updated for ${currentProduct.name}`);
}

function setStrategy(strategy, btnEl) {
    currentStrategy = strategy;
    document.querySelectorAll('.strategy-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');

    if (currentProduct) {
        renderPriceTable(currentProduct);
        renderRecommendation(currentProduct);
    }

    showToast(`Strategy set to "${strategy}"`, 'info');
}

function updateMargin(val) {
    currentMargin = parseInt(val);
    document.getElementById('marginVal').textContent = val + '%';

    if (currentProduct) {
        renderPriceTable(currentProduct);
        renderRecommendation(currentProduct);
    }
}

function runAutoPrice() {
    showToast('Auto-pricing all products based on current rules...');
    setTimeout(() => {
        showToast('✓ 7 products re-priced automatically');
        renderBulkTable();
    }, 1500);
}

/* ══════════════════════════════════════════
   RULES TABLE
══════════════════════════════════════════ */
function renderRulesTable() {
    document.getElementById('rulesTable').innerHTML = autoRules.map(r => `
    <tr>
      <td style="font-weight:600;color:var(--text)">${r.name}</td>
      <td>${r.condition}</td>
      <td>${r.action}</td>
      <td>
                <div class="toggle-wrap">
                    <button type="button" class="toggle ${r.active ? 'on' : ''}" onclick="toggleRule(${r.id})" aria-pressed="${r.active ? 'true' : 'false'}"></button>
                    <span style="font-size:11px;color:${r.active ? 'var(--accent)' : 'var(--text3)'}">${r.active ? 'Active' : 'Off'}</span>
                </div>
      </td>
    </tr>
  `).join('');
}

function toggleRule(id) {
    const rule = autoRules.find(r => r.id === id);
    if (rule) {
        rule.active = !rule.active;
        renderRulesTable();
        showToast(`Rule "${rule.name}" ${rule.active ? 'enabled' : 'disabled'}`, 'info');
    }
}

function addRule() {
    const id = autoRules.length + 1;
    autoRules.push({
        id,
        name: `Custom Rule ${id}`,
        condition: 'Set condition...',
        action: 'Set action...',
        active: false,
    });
    renderRulesTable();
    showToast('New rule added — configure it above', 'info');
}

/* ══════════════════════════════════════════
   BULK TABLE
══════════════════════════════════════════ */
function renderBulkTable() {
    document.getElementById('bulkTableBody').innerHTML = buildBulkRows().map(item => {
        const diff = item.yours - item.market;
        const diffPct = ((diff / item.market) * 100).toFixed(1);
        const pos = getPositionLabel(item.yours, item.market);
        const suggested = Number(item.suggested) || calcSuggestedPrice(
            item.market * 1.04, item.market * 0.96,
            currentStrategy, item.market * 0.6, currentMargin
        );
        const isApplying = item.id ? applyingProductIds.has(item.id) : false;

        return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${item.image
                ? `<img src="${item.image}" alt="${item.name}" style="width:44px;height:44px;border-radius:10px;background:#fff;object-fit:contain;padding:3px;flex-shrink:0;">`
                : `<span style="font-size:20px">${item.emoji || '👟'}</span>`}
            <div>
              <div style="font-weight:700;color:var(--text)">${item.name}</div>
              <div style="font-size:11px;color:var(--text3);font-family:monospace">${item.sku}</div>
            </div>
          </div>
        </td>
        <td><div class="price-cell accent">$${item.yours}</div></td>
        <td><div class="price-cell" style="color:var(--text2)">$${item.market}</div></td>
        <td>
          <div style="font-weight:700;color:${diff > 0 ? 'var(--red)' : 'var(--green)'}">
            ${diff >= 0 ? '+' : ''}$${diff} (${diffPct}%)
          </div>
        </td>
        <td><span class="price-vs-market ${pos.class}">${pos.icon} ${pos.label}</span></td>
        <td><div class="price-cell green" style="font-size:20px">$${suggested}</div></td>
        <td>
          <div class="pricing-action-stack">
            ${item.id
                ? `<button class="apply-size-btn apply-size-btn--primary" onclick='applyTrackedPriceById(${JSON.stringify(item.id)})' ${isApplying ? 'disabled' : ''}>${isApplying ? 'Applying...' : `Set $${suggested}`}</button>`
                : `<button class="apply-size-btn apply-size-btn--primary" onclick="applyPrice(${item.yours}, ${suggested}, '${escapeHtml(item.name)}')">Set $${suggested}</button>`}
            ${item.href
                ? `<a class="apply-size-btn apply-size-btn--ghost" href="${item.href}" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">View</a>`
                : ''}
          </div>
        </td>
      </tr>
    `;
    }).join('');
}

/* ══════════════════════════════════════════
   TOP STATS
══════════════════════════════════════════ */
function updateTopStats() {
    updateTrackedStats();
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    el.textContent = target;
    el.style.transform = 'scale(1.05)';
    setTimeout(() => el.style.transform = 'scale(1)', 300);
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    renderRulesTable();
    renderBulkTable();
    updateTopStats();
    renderTrackedPricingBoard();
    subscribeToProducts();
});

Object.assign(window, {
    addRule,
    applyAllPrices,
    applyPrice,
    applyTrackedPriceById,
    fetchMarketData,
    quickSearch,
    runAutoPrice,
    setStrategy,
    toggleRule,
    updateMargin
});
