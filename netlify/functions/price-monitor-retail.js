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
const http = require('http');
const https = require('https');

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PriceMonitor/1.0; +https://backdoorco.xyz)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── SSRF guard ────────────────────────────────────────────────────────────
// The endpoint is publicly reachable with no auth, so the target host must
// never resolve to a private, loopback, or link-local address (which could
// otherwise probe cloud metadata, local services, or internal subnets).
// The request is PINNED to the verified IP: we resolve once, validate, then
// connect to that exact address (sending the original Host header + TLS SNI),
// so a DNS-rebinding attacker who answers the first lookup with a public IP
// and a later lookup with 169.254.169.254 can never win - there is no second
// resolution at connect time. Every redirect hop is re-validated the same way.

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

// Extract the embedded IPv4 from an IPv4-mapped/NAT64/IPv4-compatible IPv6
// literal, or null. Accepts dotted-quad (::ffff:127.0.0.1), 2x16-bit
// (::ffff:7f00:1), the zero-padded 3-group (::ffff:0:7f00:1), single 32-bit
// (::ffff:7f000001), and the deprecated IPv4-compatible forms (::127.0.0.1 /
// ::0:7f00:1); returns the dotted-quad string so the caller can reuse
// isPrivateIp. A bare "::" prefix is only treated as embedded IPv4 when it
// is a dotted-quad or the strict 3-group ::0:xxxx:xxxx shape - anything else
// is an ordinary IPv6 address, not an IPv4 in disguise.
function extractMappedIpv4(low) {
  let rest = null;
  let compat = false; // deprecated IPv4-compatible ::a.b.c.d / ::0:xxxx:xxxx
  if (low.startsWith('::ffff:')) rest = low.slice('::ffff:'.length);
  else if (low.startsWith('64:ff9b::')) rest = low.slice('64:ff9b::'.length);
  else if (low.startsWith('::')) { rest = low.slice('::'.length); compat = true; }
  if (!rest) return null;

  if (rest.includes('.')) return net.isIPv4(rest) ? rest : null;

  const groups = rest.split(':').filter(Boolean).map((g) => parseInt(g, 16));
  if (!groups.length || groups.some((n) => !Number.isFinite(n))) return null;

  // Strictly only ::0:xxxx:xxxx (3 groups, first must be 0) counts as
  // IPv4-compatible; ::1:2:3:4:5:6... is a real IPv6 address, not embedded v4.
  if (compat && groups.length !== 3) return null;

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

// Resolve the target host ONCE and return the IP to pin the connection to.
// Fail-closed: if ANY answer is private, the whole request is refused. The
// caller connects to the returned literal IP, so DNS is never re-queried at
// connect time (no TOCTOU window for a rebinding attacker).
function resolveSafeIp(target) {
  return new Promise((resolve, reject) => {
    const hostname = target.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return reject(new Error('Host resolution failed'));
      if (!addresses || !addresses.length) return reject(new Error('No addresses for host'));
      for (const entry of addresses) {
        if (isPrivateIp(entry.address)) {
          return reject(new Error(`Blocked private/internal address ${entry.address}`));
        }
      }
      resolve(addresses[0].address); // pin: connect to this exact IP only
    });
  });
}

// GET a URL by connecting to a specific pinned IP. Sends the original Host
// header (and, for https, the hostname as TLS servername so SNI + certificate
// verification still target the intended site). No DNS resolution happens
// here - the verified IP is used as-is.
function requestWithPinnedIp(target, ip) {
  return new Promise((resolve, reject) => {
    const isHttps = target.protocol === 'https:';
    const mod = isHttps ? https : http;
    const options = {
      protocol: target.protocol,
      hostname: ip,                // pinned verified address - never re-resolved
      port: target.port || (isHttps ? 443 : 80),
      path: (target.pathname || '/') + (target.search || ''),
      method: 'GET',
      headers: { ...REQUEST_HEADERS, Host: target.host },
      timeout: 15000,
    };
    if (isHttps) options.servername = target.hostname;

    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          url: target.href,
          text: async () => Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
    req.end();
  });
}

// Follow redirects manually (max 5 hops). Every hop is resolved once,
// validated, and pinned - a redirect can never bounce to an internal host.
async function fetchSafely(target) {
  let current = target;
  for (let hop = 0; hop < 5; hop++) {
    const ip = await resolveSafeIp(current);
    const res = await requestWithPinnedIp(current, ip);
    if (res.status >= 300 && res.status < 400) {
      let location = res.headers.location;
      if (Array.isArray(location)) location = location[0];
      if (!location) return res;
      current = new URL(location, current);
      // Redirects may point anywhere - only follow http(s) targets, never
      // ftp:, file:, etc. (which requestWithPinnedIp would mis-handle).
      if (current.protocol !== 'http:' && current.protocol !== 'https:') {
        throw new Error(`Blocked redirect to ${current.protocol}`);
      }
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

// Exported for unit tests (Netlify only invokes exports.handler).
exports.isPrivateIp = isPrivateIp;
exports.extractMappedIpv4 = extractMappedIpv4;
exports.resolveSafeIp = resolveSafeIp;
exports.fetchSafely = fetchSafely;
exports.extractFromJsonLd = extractFromJsonLd;
exports.extractFromOpenGraph = extractFromOpenGraph;
exports.extractFromHeuristic = extractFromHeuristic;
exports.parsePrice = parsePrice;
