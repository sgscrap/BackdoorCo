const fetch = globalThis.fetch || require('node-fetch');

exports.handler = async function (event) {
  try {
    const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
    if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'Missing q parameter' }) };

    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PriceMonitor/1.0)' } });
    if (!resp.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch eBay' }) };
    const html = await resp.text();

    // Find price-like strings (e.g., $123.45)
    const priceRegex = /[$£€]\s?[0-9,]+(?:\.[0-9]{2})?/g;
    const matches = html.match(priceRegex) || [];
    const nums = matches.map(s => parseFloat(s.replace(/[^0-9\.]/g, '').replace(/,/g, ''))).filter(n => !isNaN(n));

    const min = nums.length ? Math.min(...nums) : null;

    return {
      statusCode: 200,
      body: JSON.stringify({ query: q, found: nums.length, minPrice: min, samples: nums.slice(0, 10) })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
