const SOURCE_LABELS = {
    stockx: 'StockX',
    goat: 'GOAT',
    ebay: 'eBay'
};

const SOURCE_PATTERNS = {
    stockx: [
        /Buy\s+Now\s+for[\s\S]{0,40}?\$([\d,]+(?:\.\d+)?)/i,
        /Lowest\s+Ask[\s\S]{0,40}?\$([\d,]+(?:\.\d+)?)/i,
        /"lowestAsk"\s*:\s*"?([\d,]+(?:\.\d+)?)/i,
        /"lastSale"\s*:\s*"?([\d,]+(?:\.\d+)?)/i
    ],
    goat: [
        /Buy\s+New[\s\S]{0,40}?\$([\d,]+(?:\.\d+)?)/i,
        /Instant\s+Ship[\s\S]{0,40}?\$([\d,]+(?:\.\d+)?)/i,
        /"price"\s*:\s*"?([\d,]+(?:\.\d+)?)/i
    ],
    ebay: [
        /US\s+\$([\d,]+(?:\.\d+)?)/i,
        /Current\s+bid[\s\S]{0,20}?\$([\d,]+(?:\.\d+)?)/i,
        /"price"\s*:\s*"?([\d,]+(?:\.\d+)?)/i
    ]
};

function json(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        },
        body: JSON.stringify(payload)
    };
}

function normalizePrice(value) {
    const amount = Number(String(value || '').replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Number(amount.toFixed(2));
}

function readJsonLdBlocks(html) {
    return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
        .map((match) => match[1])
        .filter(Boolean);
}

function collectPricesFromJsonLd(value, bucket = []) {
    if (!value) return bucket;

    if (Array.isArray(value)) {
        value.forEach((entry) => collectPricesFromJsonLd(entry, bucket));
        return bucket;
    }

    if (typeof value === 'object') {
        ['price', 'lowPrice', 'highPrice'].forEach((key) => {
            const next = normalizePrice(value[key]);
            if (next) bucket.push(next);
        });

        Object.values(value).forEach((entry) => collectPricesFromJsonLd(entry, bucket));
    }

    return bucket;
}

function extractJsonLdPrices(html) {
    const prices = [];

    readJsonLdBlocks(html).forEach((raw) => {
        try {
            const parsed = JSON.parse(raw.trim());
            collectPricesFromJsonLd(parsed, prices);
        } catch (error) {
            // Ignore invalid JSON-LD blocks.
        }
    });

    return prices;
}

function extractMetaPrices(html) {
    return [...html.matchAll(/<meta[^>]+(?:property|name)=["'][^"']*price[^"']*["'][^>]+content=["']([\d,.]+)["'][^>]*>/gi)]
        .map((match) => normalizePrice(match[1]))
        .filter(Boolean);
}

function extractPatternPrices(html, sourceKey) {
    return (SOURCE_PATTERNS[sourceKey] || [])
        .map((pattern) => {
            const match = html.match(pattern);
            return normalizePrice(match?.[1]);
        })
        .filter(Boolean);
}

function detectEbayAuthenticity(html) {
    return /authenticity guarantee/i.test(html);
}

function dedupePrices(values) {
    return [...new Set(values.filter(Boolean).map((value) => Number(value.toFixed(2))))];
}

function pickBenchmarkPrice(sourceKey, values) {
    const prices = dedupePrices(values).sort((left, right) => left - right);
    if (!prices.length) return 0;

    if (sourceKey === 'stockx' || sourceKey === 'goat') {
        return prices[0];
    }

    return prices[0];
}

async function fetchSource(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BackdoorMarketBot/1.0; +https://backdoordmv.netlify.app)',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });

    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }

    return response.text();
}

async function fetchMarketSource(sourceKey, url) {
    if (!url) {
        return {
            url: '',
            price: 0,
            authenticated: sourceKey !== 'ebay',
            status: 'idle',
            message: 'No URL configured.'
        };
    }

    try {
        const html = await fetchSource(url);
        const candidates = [
            ...extractPatternPrices(html, sourceKey),
            ...extractMetaPrices(html),
            ...extractJsonLdPrices(html)
        ];

        const price = pickBenchmarkPrice(sourceKey, candidates);
        const authenticated = sourceKey === 'ebay' ? detectEbayAuthenticity(html) : true;

        if (!price) {
            return {
                url,
                price: 0,
                authenticated,
                status: 'error',
                message: 'Price could not be extracted from the source page.'
            };
        }

        if (sourceKey === 'ebay' && !authenticated) {
            return {
                url,
                price,
                authenticated: false,
                status: 'warning',
                message: 'Price found, but authenticity guarantee was not detected.'
            };
        }

        return {
            url,
            price,
            authenticated,
            status: 'live',
            message: `Live ${SOURCE_LABELS[sourceKey]} price captured.`
        };
    } catch (error) {
        return {
            url,
            price: 0,
            authenticated: sourceKey !== 'ebay',
            status: 'error',
            message: error.message || 'Unable to fetch source.'
        };
    }
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const inputSources = payload?.sources || {};

        const results = {};
        let benchmarkPrice = 0;
        let benchmarkSourceKey = '';
        let sourceCount = 0;

        for (const sourceKey of Object.keys(SOURCE_LABELS)) {
            const source = await fetchMarketSource(sourceKey, String(inputSources[sourceKey] || '').trim());
            results[sourceKey] = source;

            if (source.price > 0) {
                sourceCount += 1;
            }

            if (source.price > 0 && source.authenticated !== false) {
                if (!benchmarkPrice || source.price < benchmarkPrice) {
                    benchmarkPrice = source.price;
                    benchmarkSourceKey = sourceKey;
                }
            }
        }

        return json(200, {
            benchmarkPrice,
            benchmarkSourceKey,
            refreshedAt: new Date().toISOString(),
            sourceCount,
            sources: results
        });
    } catch (error) {
        console.error('market-price-snapshot failed', error);
        return json(400, { error: error.message || 'Unable to refresh market pricing.' });
    }
};
