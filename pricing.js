/* ══════════════════════════════════════════
   BACKDOOR — SMART PRICING ENGINE JS
══════════════════════════════════════════ */

/* ── STATE ── */
let currentStrategy = 'competitive';
let currentMargin = 20;
let currentProduct = null;

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

/* Sample inventory for bulk table */
const INVENTORY = [
    { name: 'Jordan 1 Retro High OG Chicago', sku: '555088-101', yours: 760, market: 737, emoji: '👟' },
    { name: 'Yeezy 350 V2 Zebra', sku: 'CP9654', yours: 320, market: 310, emoji: '🦓' },
    { name: 'Nike Dunk Low Panda', sku: 'DD1391-100', yours: 168, market: 159, emoji: '🐼' },
    { name: 'Travis Scott Dunk Low', sku: 'DR0188-300', yours: 1380, market: 1275, emoji: '🤠' },
    { name: 'New Balance 550 White', sku: 'BB550WT1', yours: 150, market: 148, emoji: '💚' },
    { name: 'Jordan 4 Retro Military Blue', sku: '408452-105', yours: 310, market: 340, emoji: '👟' },
    { name: 'Nike Air Max 1 "86 OG Big Bubble"', sku: 'DO9844-101', yours: 185, market: 180, emoji: '💨' },
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
          <div class="toggle ${r.active ? 'on' : ''}" onclick="toggleRule(${r.id})"></div>
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
    document.getElementById('bulkTableBody').innerHTML = INVENTORY.map(item => {
        const diff = item.yours - item.market;
        const diffPct = ((diff / item.market) * 100).toFixed(1);
        const pos = getPositionLabel(item.yours, item.market);
        const suggested = calcSuggestedPrice(
            item.market * 1.04, item.market * 0.96,
            currentStrategy, item.market * 0.6, currentMargin
        );

        return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">${item.emoji}</span>
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
        <td><button class="apply-size-btn" onclick="applyPrice(${item.yours}, ${suggested}, '${item.name}')">Apply</button></td>
      </tr>
    `;
    }).join('');
}

/* ══════════════════════════════════════════
   TOP STATS
══════════════════════════════════════════ */
function updateTopStats() {
    const avgYours = avg(INVENTORY.map(i => i.yours));
    const avgMarket = avg(INVENTORY.map(i => i.market));

    const under = INVENTORY.filter(i => i.yours < i.market * 0.95).length;
    const over = INVENTORY.filter(i => i.yours > i.market * 1.05).length;

    let totalGain = 0;
    INVENTORY.forEach(i => {
        const suggested = calcSuggestedPrice(
            i.market * 1.04, i.market * 0.96,
            currentStrategy, i.market * 0.6, currentMargin
        );
        totalGain += suggested - i.yours;
    });

    animateCounter('statAvgYours', '$' + Math.round(avgYours));
    animateCounter('statAvgMarket', '$' + Math.round(avgMarket));
    animateCounter('statUnder', under.toString());
    animateCounter('statOver', over.toString());
    animateCounter('statGain', (totalGain >= 0 ? '+$' : '-$') + Math.abs(Math.round(totalGain)));
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
});
