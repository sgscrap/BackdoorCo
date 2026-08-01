// netlify/functions/price-monitor-retail.js
// Generic retailer price scraper. Pulls `title + retailPrice + currency` from
// any retail product page that emits either a JSON-LD Product schema or the
// OpenGraph product:price:* meta tags (Lyst, Farfetch, END., SSENSE, Mr Porter,
// Nordstrom, Net-A-Porter, etc.). Failures return a clear error so callers
// can fall back to manual entry — Kickwho and other JS-only SPAs will
// naturally return 404 here because the shell HTML has no product metadata.
//
// Usage:
//   GET /.netlify/functions/price-monitor-retail?url=<encoded-url>
//   -> 200 { ok, source, title, retailPrice, currency, url, image? }
//   -> 400 { ok:false, error } on bad URL
//   -> 404 { ok:false, error:'No product metadata found' } on unparseable page
//   -> 502 { ok:false, error:'Upstream NN' } on upstream 4xx/5xx
//   -> 500 { ok:false, error } on internal failure

const dns = require('dns');
const net = require('net');

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PriceMonitor/1.0; +https://backdoorco.xyz)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── SSRF guard ────────────────────────────────────────────────────────────
// The endpoint is publicly reachable with no auth, so the target host must
// never resolve to a private, loopback, or link-local address (which could
// otherwise probe cloud metadata, local services, or internal subnets).

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10) return true;                              // 10.0.0.0/8
    if (p[0] === 127) return true;                             // 127.0.0.0/8 loopback
    if (p[0] === 169 && p[1] === 254) return true;             // 169.254.0.0/16 link-local
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16.0.0/12
    if (p[0] === 192 && p[1] === 168) return true;             // 192.168.0.0/16
    if (p[0] === 0) return true;                               // 0.0.0.0/8
    if (p[0] >= 224) return true;                              // multicast + reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === '::' || low === '::1') return true;                          // unspecified/loopback
    if (low.startsWith('fc') || low.startsWith('fd')) return true;           // fc00::/7 ULA
    if (low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true; // fe80::/10 link-local
    // IPv4-mapped IPv6 (::ffff:1.2.3.4) and NAT64 (64:ff9b::1.2.3.4) embed a
    // real IPv4 address - re-check it against the IPv4 ranges. Handles both
    // dotted-quad (::ffff:127.0.0.1) and hex-group (::ffff:7f00:1) forms.
    const mapped = extractMappedIpv4(low);
    if (mapped && isPrivateIp(mapped)) return true;
    return false;
  }
  return true; // unknown form -> block
}

// Extract the embedded IPv4 from an IPv4-mapped/NAT64 IPv6 literal, or null.
// Accepts dotted-quad (::ffff:127.0.0.1), 2x16-bit (::ffff:7f00:1), the
// zero-padded 3-group (::ffff:0:7f00:1), and single 32-bit (::ffff:7f000001)
// forms; returns the dotted-quad string so the caller can reuse isPrivateIp.
function extractMappedIpv4(low) {
  let rest = null;
  if (low.startsWith('::ffff:')) rest = low.slice('::ffff:'.length);
  else if (low.startsWith('64:ff9b::')) rest = low.slice('64:ff9b::'.length);
  if (!rest) return null;

  if (rest.includes('.')) return net.isIPv4(rest) ? rest : null;

  const groups = rest.split(':').filter(Boolean).map((g) => parseInt(g, 16));
  if (!groups.length || groups.some((n) => !Number.isFinite(n))) return null;

  let a, b, c, d;
  if (groups.length === 1) {
    const v = groups[0];
    if (v > 0xffffffff) return null;
    a = (v >>> 24) & 0xff; b = (v >>> 16) & 0xff; c = (v >>> 8) & 0xff; d = v & 0xff;
  } else if (groups.length === 2) {
    const [h1, h2] = groups;
    if (h1 > 0xffff || h2 > 0xffff) return null;
    a = (h1 >>> 8) & 0xff; b = h1 & 0xff; c = (h2 >>> 8) & 0xff; d = h2 & 0xff;
  } else {
    const [g1, h1, h2] = groups;
    if (g1 !== 0 || h1 > 0xffff || h2 > 0xffff) return null;
    a = (h1 >>> 8) & 0xff; b = h1 & 0xff; c = (h2 >>> 8) & 0xff; d = h2 & 0xff;
  }
  return `${a}.${b}.${c}.${d}`;
}

function assertSafeHost(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return reject(new Error('Host resolution failed'));
      if (!addresses || !addresses.length) return reject(new Error('No addresses for host'));
      for (const entry of addresses) {
        if (isPrivateIp(entry.address)) {
          return reject(new Error(`Blocked private/internal address ${entry.address}`));
        }
      }
      resolve();
    });
  });
}

// Follow redirects manually (max 5 hops) so every intermediate host is
// re-validated against the SSRF guard instead of fetch() following blindly.
async function fetchSafely(target) {
  let current = target;
  for (let hop = 0; hop < 5; hop++) {
    await assertSafeHost(current.hostname);
    const res = await fetch(current, { headers: REQUEST_HEADERS, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      current = new URL(location, current);
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

exports.handler = async function (event) {
  const rawUrl = (event.queryStringParameters && event.queryStringParameters.url) || '';
  const url = rawUrl.trim();
  if (!url) {
    return json(400, { ok: false, error: 'Missing ?url=' });
  }

  let target;
  try { target = new URL(url); }
  catch { return json(400, { ok: false, error: 'Invalid URL' }); }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return json(400, { ok: false, error: 'Only http(s) URLs accepted' });
  }

  try {
    const res = await fetchSafely(target);
    if (!res.ok) {
      return json(502, { ok: false, error: `Upstream ${res.status} ${res.statusText || ''}`.trim() });
    }
    const html = await res.text();
    const finalUrl = res.url || target.href;

    // 1) JSON-LD Product schema
    const ld = extractFromJsonLd(html);
    if (ld) return json(200, { ...ld, url: finalUrl });

    // 2) OpenGraph meta tags
    const og = extractFromOpenGraph(html);
    if (og) return json(200, { ...og, url: finalUrl });

    // 3) Heuristic fallback: page <title> + price-pattern scan
    const heur = extractFromHeuristic(html);
    if (heur) return json(200, { ...heur, url: finalUrl });

    return json(404, { ok: false, error: 'No product metadata found (site may be JS-rendered)' });
  } catch (err) {
    return json(500, { ok: false, error: err.message || 'fetch failed' });
  }
};

// ── Strategy 1: JSON-LD Product ───────────────────────────────────────────

function extractFromJsonLd(html) {
  const blockRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(blockRe)) {
    let parsed;
    try { parsed = JSON.parse(m[1]); }
    catch { continue; }

    const pool = [parsed];
    if (parsed && Array.isArray(parsed['@graph'])) pool.push(...parsed['@graph']);
    for (const node of pool) {
      const p = findProduct(node);
      if (p) {
        return { ok: true, source: 'jsonld', ...p };
      }
    }
  }
  return null;
}

function findProduct(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  const t = node['@type'];
  const isProduct = t === 'Product' || (Array.isArray(t) && t.includes('Product'));
  if (isProduct && node.name) {
    const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
    const raw = offers && (offers.price ?? offers.lowPrice);
    const numeric = parsePrice(raw);
    if (numeric != null) {
      return {
        title: String(node.name).trim(),
        retailPrice: numeric,
        currency: offers.priceCurrency || 'USD',
        image: pickImage(node.image),
      };
    }
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) {
      for (const c of v) {
        const r = findProduct(c, depth + 1);
        if (r) return r;
      }
    } else if (v && typeof v === 'object') {
      const r = findProduct(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function pickImage(img) {
  if (!img) return undefined;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return pickImage(img[0]);
  if (typeof img === 'object') return pickImage(img.url || img.contentUrl);
  return undefined;
}

// ── Strategy 2: OpenGraph product:price meta tags ─────────────────────────

function extractFromOpenGraph(html) {
  const title = meta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
             || meta(html, /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)/i);
  const amount = meta(html, /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)/i);
  const currency = meta(html, /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)/i)
                || meta(html, /<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)/i)
                || 'USD';
  if (!title || !amount) return null;
  const numeric = parsePrice(amount);
  if (numeric == null) return null;
  return { ok: true, source: 'og', title, retailPrice: numeric, currency };
}

// ── Strategy 3: Heuristic <title> + price-pattern scan ────────────────────

function extractFromHeuristic(html) {
  const title = meta(html, /<title[^>]*>([^<]+)/i);
  if (!title) return null;
  const seen = [];
  const re = /([$£€])\s?([0-9][0-9,]*(?:\.[0-9]{2})?)/g;
  // strip <script> and <style> blocks: analytics + JSON-config blobs
  // frequently carry placeholder $999.99 markers that would otherwise
  // win the heuristic over the visible product price.
  const textHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const m of textHtml.matchAll(re)) {
    const sym = m[1];
    const n = parsePrice(m[2]);
    if (n == null || n < 20 || n > 250000) continue;       // filter markup noise
    seen.push({ sym, n });
    if (seen.length >= 40) break;
  }
  if (!seen.length) return null;
  seen.sort((a, b) => a.n - b.n);
  const pick = seen[0];
  return {
    ok: true,
    source: 'heuristic',
    title: title.replace(/\s*[|·\-—]\s.*$/, '').trim(),  // strip " | Brand" suffix
    retailPrice: pick.n,
    currency: pick.sym === '£' ? 'GBP' : pick.sym === '€' ? 'EUR' : 'USD',
  };
}

// ── helpers ───────────────────────────────────────────────────────────────

function parsePrice(input) {
  if (input == null || input === '') return null;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  const cleaned = String(input).replace(/[$£€,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function meta(html, re) {
  const m = html.match(re);
  if (!m) return null;
  return decodeEntities(m[1].trim());
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
