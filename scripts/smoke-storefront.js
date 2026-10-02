#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Storefront smoke test.
//
// Loads every storefront page in a real headless Chrome and fails
// if any page throws an uncaught JavaScript exception. It exists
// because the pages share a lot of hand-written DOM code, and a
// null-deref on one page (e.g. a shared script looking up an
// element that only some pages render) is otherwise only caught
// by a human clicking through the site.
//
// It also asserts the shape of each page: exactly one navbar and
// footer where the design expects them, paired @@chrome markers
// with no unresolved %%nav:…%% tokens left behind, and every
// same-origin stylesheet and image resolving.
//
// Zero dependencies: it drives Chrome directly over the DevTools
// protocol using Node's built-in fetch + WebSocket, and serves the
// repo over a small local static server. If no Chrome/Chromium can
// be found it prints a note and exits 0, so it degrades gracefully
// on machines without a browser.
//
//   node scripts/smoke-storefront.js
//   SMOKE_BASE_URL=http://localhost:5001 node scripts/smoke-storefront.js
//   CHROME_PATH=/path/to/chrome node scripts/smoke-storefront.js
// ─────────────────────────────────────────────────────────────
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const { HEADCSS_PAGES, NAV_PAGES, FOOTER_PAGES, SCRIPT_PAGES } = require('./build-chrome.js');

const ROOT = path.resolve(__dirname, '..');
// SMOKE_PAGES lets you smoke a subset (or a throwaway page) while iterating:
//   SMOKE_PAGES=index.html,about.html node scripts/smoke-storefront.js
const PAGES = (process.env.SMOKE_PAGES
  ? process.env.SMOKE_PAGES.split(',').map((p) => p.trim()).filter(Boolean)
  : [...HEADCSS_PAGES].sort());

// product-detail.html is the legacy product shell: without an ?id= its script
// sends you straight home, so it used to be smoked as whatever page it bounced
// to. It needs a *live* Firestore id (its script reads only `products/<id>`, not
// the seeded catalogue), and a hand-written id rots the moment that document is
// renamed — the page then degrades to a "redirected away" warning and looks
// covered while asserting nothing. So main() asks the live storefront for an id
// first; this constant is the fallback when the catalogue is unreachable, and
// SMOKE_PRODUCT_ID pins a specific id and skips discovery.
const FALLBACK_PRODUCT_ID = process.env.SMOKE_PRODUCT_ID || '6ND5OkYAlwqKKkJsOHdk';

// Runs in page context on a real storefront page: it imports the storefront's
// own Firebase config and queries the exact collection the shop queries, so the
// id it returns is a product customers can actually open. Falls back to the
// product links the page already rendered (those come from the same collection,
// minus the local `seed-…` catalogue, which Firestore does not contain).
const DISCOVER_PRODUCT_ID = `(async () => {
  try {
    const { db } = await import('/admin/firebase-config.js');
    const { collection, getDocs, limit, query, where } = await import(
      'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js'
    );
    const snapshot = await getDocs(query(
      collection(db, 'products'),
      where('status', '==', 'active'),
      limit(1)
    ));
    if (!snapshot.empty) return snapshot.docs[0].id;
  } catch {
    /* an unreachable catalogue must not fail the run */
  }
  for (const link of document.querySelectorAll('a[href*="product.html?id="]')) {
    try {
      const id = new URL(link.getAttribute('href'), location.origin).searchParams.get('id');
      if (id && !id.startsWith('seed-')) return id;
    } catch {
      /* skip malformed links */
    }
  }
  return null;
})()`;

// Settle time after `load` so deferred scripts and DOMContentLoaded
// handlers get a chance to run (and throw) before we move on.
const SETTLE_MS = 800;
const NAV_TIMEOUT_MS = 20000;
const VERBOSE = Boolean(process.env.SMOKE_VERBOSE);

// Uncaught exceptions we do not fail on. These are third-party /
// network-flavoured and would make the test flaky offline; they are
// still reported as warnings so nothing is silently swallowed.
const IGNORE = [
  /\(in promise\)/, // unhandled promise rejection (usually fetch/Firebase)
  /firebase/i,
  /auth\/network-request-failed/,
  /Failed to fetch/i,
  /NetworkError/i,
  /ResizeObserver loop/i,
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Static server ────────────────────────────────────────────
function startStaticServer() {
  const server = http.createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      rel = req.url;
    }
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// ── Browser discovery ────────────────────────────────────────
function globVersionDirs(base, prefix) {
  let entries;
  try {
    entries = fs.readdirSync(base);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.startsWith(prefix + '-'))
    .sort((a, b) => {
      const na = Number(a.slice(prefix.length + 1)) || 0;
      const nb = Number(b.slice(prefix.length + 1)) || 0;
      return nb - na;
    })
    .map((name) => path.join(base, name));
}

function findBrowser() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);

  const pw = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const dir of globVersionDirs(pw, 'chromium_headless_shell')) {
    candidates.push(path.join(dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'));
    candidates.push(path.join(dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    candidates.push(path.join(dir, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'));
  }
  for (const dir of globVersionDirs(pw, 'chromium')) {
    candidates.push(path.join(dir, 'chrome-win64', 'chrome.exe'));
    candidates.push(path.join(dir, 'chrome-win', 'chrome.exe'));
    candidates.push(path.join(dir, 'chrome-linux', 'chrome'));
    candidates.push(path.join(dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
  }

  candidates.push(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  );

  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

// ── Minimal CDP client ───────────────────────────────────────
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.id != null) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else if (msg.method) {
        const callbacks = this.listeners.get(msg.method);
        if (callbacks) for (const cb of callbacks) cb(msg.params || {}, msg.sessionId);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(cb);
  }

  waitFor(method, timeoutMs) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const list = this.listeners.get(method) || [];
        const i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
        resolve(null);
      }, timeoutMs);
      const handler = (params) => {
        clearTimeout(timer);
        const list = this.listeners.get(method) || [];
        const i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
        resolve(params);
      };
      this.on(method, handler);
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const onError = () => reject(new Error('could not connect to Chrome DevTools socket'));
    ws.addEventListener('open', () => {
      ws.removeEventListener('error', onError);
      resolve(ws);
    });
    ws.addEventListener('error', onError);
  });
}

function launchBrowser(binary) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storefront-smoke-'));
  const args = [
    '--remote-debugging-port=0',
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'about:blank',
  ];
  if (!/headless-shell/i.test(path.basename(binary))) args.unshift('--headless=new');

  const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const endpoint = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not report a DevTools endpoint in time')), 20000);
    let buf = '';
    const scan = (chunk) => {
      buf += chunk.toString();
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    };
    proc.stderr.on('data', scan);
    proc.stdout.on('data', scan);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (code ${code})`));
    });
  });

  return { proc, userDataDir, endpoint };
}

async function cleanup(browser) {
  if (!browser) return;
  try {
    browser.proc.removeAllListeners('exit');
    browser.proc.kill('SIGKILL');
  } catch {
    /* already gone */
  }
  await sleep(200);
  try {
    fs.rmSync(browser.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    /* temp dir cleanup is best-effort */
  }
}

// ── Interactions ─────────────────────────────────────────────
// The shared chrome behaves differently from page to page: only pages with a
// navbar have the hamburger and the brands dropdown, and only some pages
// render a cart drawer (eleven use the shared #cartSidebar, checkout has its
// own #cartDrawer, and the rest have none). So every interaction is driven by
// what the page actually renders — a missing trigger is a reported skip, never
// a silent pass. Triggers are clicked with real mouse events sent over CDP,
// and only after a hit test proves a user could actually reach them, so
// nothing here can pass by clicking an element that is display:none.

// The hamburger only appears under 768px, so the tap is checked at the widths
// real phones actually use. Every width is probed on every page: the navbar's
// phone layout is a set of breakpoints, so a regression can break the tap
// target at 320px while 430px still looks perfectly healthy.
const PHONE_WIDTHS = [320, 360, 390, 430];
const phoneViewport = (width) => ({ width, height: 844, deviceScaleFactor: 1, mobile: false });
const INTERACTION_MS = 500; // the longest chrome transition is 0.35s
const CART_TRIGGERS = ['#cartButton', '.cart-btn']; // shared navbar button, then checkout's own
const CART_CLOSES = ['#cartClose', '.cart-close'];

// ── Structural assertions ────────────────────────────────────
// The interactions above prove the chrome *works*; these prove it is all
// actually there. Every page is built by inlining the partials between marker
// comments, so the things that go wrong are structural: a page that ends up
// with two navbars (or none where the design expects one), a half-written
// marker pair, a `%%nav:…%%` token the builder forgot to resolve, or a
// stylesheet/image link that 404s. All of it is checked against the live DOM
// and the real network, not the source files.
const CHROME_REGIONS = ['nav', 'footer', 'scripts', 'headcss'];

// Everything the structural pass needs, gathered in one round trip.
const STRUCTURE_PROBE = `(() => {
  const html = document.documentElement.innerHTML;
  const countOccurrences = (needle) => html.split(needle).length - 1;
  const markers = {};
  for (const region of ['nav', 'footer', 'scripts', 'headcss']) {
    markers[region] = {
      start: countOccurrences('<!-- @@chrome:' + region + ':start -->'),
      end: countOccurrences('<!-- @@chrome:' + region + ':end -->'),
    };
  }
  const unknownMarkers = [...new Set((html.match(/@@chrome:[a-z]+:(?:start|end)/g) || [])
    .filter((marker) => !/:(?:nav|footer|scripts|headcss):/.test(marker)))];
  const tokens = [...new Set(html.match(/%%[a-z]+:[a-z]+%%/g) || [])];
  const origin = location.origin;
  const sameOrigin = (url) => {
    try { return new URL(url, origin).origin === origin; } catch { return false; }
  };
  const sheets = [...document.styleSheets].map((sheet) => {
    let rules = null;
    try { rules = sheet.cssRules ? sheet.cssRules.length : 0; } catch { rules = null; }
    return { href: sheet.href || '(inline)', same: !sheet.href || sameOrigin(sheet.href), rules };
  });
  const images = [...document.images].map((img) => {
    const src = img.currentSrc || img.src || '(no src)';
    return { src, same: sameOrigin(src), complete: img.complete, naturalWidth: img.naturalWidth };
  });
  return {
    navbars: document.querySelectorAll('nav.navbar').length,
    sharedNavbars: document.querySelectorAll('nav#navbar').length,
    footers: document.querySelectorAll('footer').length,
    markers,
    unknownMarkers,
    tokens,
    sheets,
    images,
  };
})()`;

async function evaluateIn(cdp, sessionId, expression) {
  const res = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true, userGesture: true },
    sessionId
  );
  if (res.exceptionDetails) {
    const ex = res.exceptionDetails;
    throw new Error((ex.exception && ex.exception.description) || ex.text || 'evaluate failed');
  }
  return res.result ? res.result.value : undefined;
}

// Bounding box plus hit test, so we know whether a real user could reach the
// element at the current viewport (and not merely that it exists in the DOM).
function probeExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { state: 'missing' };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) {
      return { state: 'hidden' };
    }
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (x < 0 || y < 0 || x > vw || y > vh) return { state: 'offscreen', x, y };
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) return { state: 'obscured', x, y };
    return { state: 'ok', x, y };
  })()`;
}

async function moveMouse(cdp, sessionId, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' }, sessionId);
}

async function clickSelector(cdp, sessionId, selector) {
  const probe = await evaluateIn(cdp, sessionId, probeExpression(selector));
  if (!probe || probe.state !== 'ok') return probe || { state: 'missing' };
  const click = { x: probe.x, y: probe.y, button: 'left', clickCount: 1 };
  await moveMouse(cdp, sessionId, probe.x, probe.y);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...click }, sessionId);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...click }, sessionId);
  return probe;
}

async function hoverSelector(cdp, sessionId, selector) {
  const probe = await evaluateIn(cdp, sessionId, probeExpression(selector));
  if (!probe || probe.state !== 'ok') return probe || { state: 'missing' };
  await moveMouse(cdp, sessionId, probe.x, probe.y);
  return probe;
}

// First selector in the list that is reachable, so a page with its own cart
// control (checkout) can be driven the same way as the shared navbar button.
async function firstReachable(cdp, sessionId, selectors) {
  for (const selector of selectors) {
    const probe = await evaluateIn(cdp, sessionId, probeExpression(selector));
    if (probe && probe.state === 'ok') return { selector, probe };
    if (probe && probe.state !== 'missing') return { selector, probe };
  }
  return null;
}

const MOBILE_MENU_STATE = `(() => {
  const menu = document.getElementById('navMobileMenu');
  if (!menu) return { present: false };
  const button = document.getElementById('navHamburger');
  const cs = getComputedStyle(menu);
  return {
    present: true,
    open: menu.classList.contains('open'),
    shown: cs.display !== 'none' && cs.visibility !== 'hidden',
    buttonOpen: !!(button && button.classList.contains('open')),
  };
})()`;

const CART_STATE = `(() => {
  const el = document.getElementById('cartSidebar') || document.getElementById('cartDrawer');
  if (!el) return { present: false };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  // Measure the visible slice against the *layout* viewport (clientWidth, which
  // excludes the scrollbar) rather than window.innerWidth: a closed drawer sits
  // at left === clientWidth, and comparing to innerWidth would call it on-screen.
  const vw = document.documentElement.clientWidth;
  const visible = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  return {
    present: true,
    id: el.id,
    shown: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0,
    // Both drawers are a right-hand panel slid out with translateX(100%), so
    // "open" means at least half the panel is inside the viewport.
    open: r.width > 0 && visible / r.width > 0.5,
  };
})()`;

function describe(probe) {
  if (!probe) return 'missing';
  if (probe.state === 'missing') return 'not present on this page';
  if (probe.state === 'hidden') return 'present but hidden (display:none) at this viewport';
  if (probe.state === 'offscreen') return 'present but outside the viewport';
  if (probe.state === 'obscured') return 'present but covered by another element';
  return probe.state;
}

async function runInteractions(cdp, sessionId, page) {
  const out = [];
  const record = (name, outcome, detail) => out.push({ name, outcome, detail });

  // ── 1. Mobile menu ── the hamburger is display:none above 768px, so this
  // runs at every phone width a real user might tap it. The navbar's phone
  // layout is a set of breakpoints, so a page that taps fine at 430px can
  // still overflow the viewport at 320px; a page only passes once the tap
  // works at each width.
  const menuProbes = [];
  for (const width of PHONE_WIDTHS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', phoneViewport(width), sessionId);
    await sleep(150);
    const probe = await evaluateIn(cdp, sessionId, probeExpression('#navHamburger'));
    menuProbes.push({ width, probe });
    // The button's presence is width-independent (a navbar page has it at every
    // phone width, a navbar-less page at none), so one missing probe ends the
    // sweep and the page reports a single n/a below.
    if (!probe || probe.state === 'missing') break;
  }
  if (!menuProbes.some(({ probe }) => probe && probe.state !== 'missing')) {
    record('mobile menu', 'skipped', 'no navbar on this page');
  } else {
    for (const { width, probe } of menuProbes) {
      const label = `mobile menu @${width}px`;
      if (!probe || probe.state !== 'ok') {
        // Under 768px the hamburger is the only way into the menu, so a tap
        // target a user cannot reach is a broken phone navbar, not a nitpick.
        record(label, 'failed', `hamburger ${describe(probe)} — a user cannot tap it`);
        continue;
      }
      const tap = await clickSelector(cdp, sessionId, '#navHamburger');
      if (tap.state !== 'ok') {
        record(label, 'failed', `hamburger ${describe(tap)} between the hit test and the click`);
        continue;
      }
      await sleep(INTERACTION_MS);
      const opened = await evaluateIn(cdp, sessionId, MOBILE_MENU_STATE);
      if (!opened.present || !opened.open || !opened.shown) {
        record(label, 'failed', `#navMobileMenu did not open (open=${opened.open} shown=${opened.shown})`);
        continue;
      }
      record(label, 'passed', `#navHamburger opens #navMobileMenu at ${width}px`);
      // Closing again: the open menu can sit over the button, so fall back to a
      // synthetic click — the point here is the handler's symmetry, not
      // hit-testability (which the opening click already proved).
      const reclicked = await clickSelector(cdp, sessionId, '#navHamburger');
      if (reclicked.state !== 'ok') {
        await evaluateIn(cdp, sessionId, "(() => { const b = document.getElementById('navHamburger'); if (b) b.click(); return true; })()");
      }
      await sleep(INTERACTION_MS);
      const closed = await evaluateIn(cdp, sessionId, MOBILE_MENU_STATE);
      if (closed.present && closed.open) {
        record(label, 'failed', 'hamburger did not close #navMobileMenu again');
      }
    }
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  await sleep(150);

  // ── 2. Brands dropdown ── desktop only (.nav-center is display:none under
  // 768px). It is pure CSS, revealed by :hover, so drive it with a real mouse
  // move and assert the menu is actually displayed.
  const hover = await hoverSelector(cdp, sessionId, '.nav-dropdown-toggle');
  if (hover.state === 'missing') {
    record('brands dropdown', 'skipped', 'no navbar on this page');
  } else if (hover.state !== 'ok') {
    record('brands dropdown', 'skipped', `.nav-dropdown-toggle ${describe(hover)}`);
  } else {
    await sleep(INTERACTION_MS);
    const revealed = await evaluateIn(
      cdp,
      sessionId,
      `(() => {
        const menu = document.querySelector('.nav-dropdown-menu');
        if (!menu) return null;
        const cs = getComputedStyle(menu);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      })()`
    );
    if (revealed === true) record('brands dropdown', 'passed', 'hover reveals .nav-dropdown-menu');
    else if (revealed === null) record('brands dropdown', 'failed', '.nav-dropdown-menu is missing');
    else record('brands dropdown', 'failed', '.nav-dropdown-menu stayed display:none on hover');
  }
  await moveMouse(cdp, sessionId, 2, 2); // leave the hover state behind

  // ── 3. Cart drawer ── opened by the shared navbar button (or, on checkout,
  // its own control) and closed again through the drawer's close button.
  const trigger = await firstReachable(cdp, sessionId, CART_TRIGGERS);
  if (!trigger) {
    record('cart drawer', 'skipped', 'no cart trigger on this page');
  } else if (trigger.probe.state !== 'ok') {
    record('cart drawer', 'skipped', `${trigger.selector} ${describe(trigger.probe)}`);
  } else {
    const before = await evaluateIn(cdp, sessionId, CART_STATE);
    const clicked = await clickSelector(cdp, sessionId, trigger.selector);
    await sleep(INTERACTION_MS);
    const after = await evaluateIn(cdp, sessionId, CART_STATE);
    if (clicked.state !== 'ok') {
      record('cart drawer', 'skipped', `${trigger.selector} ${describe(clicked)}`);
    } else if (!before.present) {
      // The navbar button is shared, but only some pages render a drawer, so
      // the click has to be a safe no-op rather than an uncaught crash.
      record('cart drawer', 'passed', `${trigger.selector} click is a safe no-op (no drawer on this page)`);
    } else if (after.present && after.shown && after.open) {
      record('cart drawer', 'passed', `${trigger.selector} opens ${after.id}`);
      const close = await firstReachable(cdp, sessionId, CART_CLOSES);
      if (close && close.probe.state === 'ok') {
        await clickSelector(cdp, sessionId, close.selector);
        await sleep(INTERACTION_MS);
        const closed = await evaluateIn(cdp, sessionId, CART_STATE);
        if (closed.open) record('cart drawer', 'failed', `${close.selector} did not close ${closed.id}`);
      } else {
        record('cart drawer', 'skipped', 'opened, but no reachable close control to verify closing');
      }
    } else {
      record('cart drawer', 'failed', `${trigger.selector} did not open ${before.id}`);
    }
  }

  return out;
}

// Which chrome regions a page is built with comes straight from build-chrome's
// tables, so the expectation can never drift from the builder. Pages that
// deliberately carry no shared navbar (404, checkout, pricing, product-detail)
// expect zero; checkout.html renders its own one-off navbar, which is why the
// duplicate guard counts nav.navbar separately from the shared nav#navbar.
function expectedChrome(page) {
  return {
    nav: Object.prototype.hasOwnProperty.call(NAV_PAGES, page),
    footer: Object.prototype.hasOwnProperty.call(FOOTER_PAGES, page),
    scripts: SCRIPT_PAGES.has(page),
    headcss: HEADCSS_PAGES.has(page),
  };
}

async function runStructure(cdp, sessionId, page, network) {
  const out = [];
  const record = (name, outcome, detail) => out.push({ name, outcome, detail });
  const facts = await evaluateIn(cdp, sessionId, STRUCTURE_PROBE);
  const want = expectedChrome(page);

  // 1. Exactly one navbar and footer where the page is meant to have them.
  const wantNav = want.nav ? 1 : 0;
  const wantFooter = want.footer ? 1 : 0;
  const countProblems = [];
  if (facts.sharedNavbars !== wantNav) {
    countProblems.push(`shared navbar: expected ${wantNav}, found ${facts.sharedNavbars} (#navbar)`);
  }
  if (facts.navbars > 1) {
    countProblems.push(`found ${facts.navbars} navbars (nav.navbar) — a page must not render more than one`);
  }
  if (facts.footers !== wantFooter) {
    countProblems.push(`footer: expected ${wantFooter}, found ${facts.footers}`);
  }
  if (countProblems.length) {
    record('one navbar and footer', 'failed', countProblems.join('; '));
  } else {
    record(
      'one navbar and footer',
      'passed',
      `navbar ${facts.navbars} (shared ${facts.sharedNavbars}/${wantNav}), footer ${facts.footers}/${wantFooter}`
    );
  }

  // 2. Marker pairs plus any token the builder left unresolved.
  const markerProblems = [];
  for (const region of CHROME_REGIONS) {
    const m = facts.markers[region];
    const expected = want[region] ? 1 : 0;
    if (m.start !== m.end) {
      markerProblems.push(`${region} markers are unpaired (${m.start} start, ${m.end} end)`);
    } else if (m.start !== expected) {
      markerProblems.push(`${region} markers: expected ${expected}, found ${m.start}`);
    }
  }
  if (facts.unknownMarkers.length) {
    markerProblems.push(`unrecognised marker(s): ${facts.unknownMarkers.join(', ')}`);
  }
  if (facts.tokens.length) {
    markerProblems.push(`unresolved token(s) left in the markup: ${facts.tokens.join(', ')}`);
  }
  if (markerProblems.length) {
    record('chrome markers', 'failed', markerProblems.join('; '));
  } else {
    record('chrome markers', 'passed', 'every region has one start/end pair and no tokens are left unresolved');
  }

  // 3. Every loaded stylesheet and image resolves. Same-origin only: third-party
  // (fonts, Firebase) requests are network noise, and a 200 from cache is not
  // evidence a file exists, which is why the main loop disables the cache.
  const reported = new Set();
  const assetProblems = [];
  const reportAsset = (url, message) => {
    if (reported.has(url)) return;
    reported.add(url);
    assetProblems.push(message);
  };
  for (const entry of network || []) {
    if (entry.status < 400) continue;
    if (entry.type !== 'Stylesheet' && entry.type !== 'Image') continue;
    if (!entry.sameOrigin) continue;
    reportAsset(entry.url, `${entry.type.toLowerCase()} ${entry.url} returned HTTP ${entry.status}`);
  }
  for (const sheet of facts.sheets) {
    if (sheet.same && sheet.rules === 0) {
      reportAsset(sheet.href, `stylesheet ${sheet.href} loaded but defined no rules`);
    }
  }
  for (const img of facts.images) {
    if (img.same && img.complete && img.naturalWidth === 0) {
      reportAsset(img.src, `image ${img.src} failed to load`);
    }
  }
  if (assetProblems.length) {
    record('stylesheets and images resolve', 'failed', assetProblems.join('; '));
  } else {
    const sameSheets = facts.sheets.filter((s) => s.same).length;
    const sameImages = facts.images.filter((i) => i.same).length;
    record(
      'stylesheets and images resolve',
      'passed',
      `${sameSheets} same-origin stylesheet(s) and ${sameImages} image(s) resolved`
    );
  }

  return out;
}

// Asks a freshly loaded storefront page for a live product id. Best-effort:
// navigation, evaluation or network failures all return null, and the caller
// keeps its fallback.
async function discoverProductId(cdp, sessionId, baseUrl, firstPage) {
  try {
    const loaded = cdp.waitFor('Page.loadEventFired', NAV_TIMEOUT_MS);
    await cdp.send('Page.navigate', { url: `${baseUrl}/${firstPage || 'index.html'}` }, sessionId);
    await loaded;
    await sleep(SETTLE_MS);
    const id = await evaluateIn(cdp, sessionId, DISCOVER_PRODUCT_ID);
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const binary = findBrowser();
  if (!binary) {
    console.log('⚠ Skipping storefront smoke test — no Chrome/Chromium found.');
    console.log('  Set CHROME_PATH to a browser binary to run it.');
    return;
  }

  let ownServer = null;
  let baseUrl = process.env.SMOKE_BASE_URL;
  if (!baseUrl) {
    ownServer = await startStaticServer();
    baseUrl = `http://127.0.0.1:${ownServer.port}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');
  // Same origin as the pages under test, used to tell our own assets apart from
  // third-party (font CDN, Firebase) traffic.
  const origin = new URL(baseUrl).origin;

  const browser = launchBrowser(binary);
  let ws;
  let cdp;
  const results = [];

  try {
    ws = await connect(await browser.endpoint);
    cdp = new Cdp(ws);

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    // Real network responses, so a stylesheet or image that 404s is caught even
    // when page script swaps a broken <img> for a placeholder. The cache is
    // disabled so a cached 200 can never hide a file that is missing.
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
    // A blocking alert() (e.g. product-detail's "Product not found" if the
    // catalogue id ever goes stale) would freeze the renderer and hang the run,
    // so dialogs are accepted and dismissed the moment they open.
    cdp.on('Page.javascriptDialogOpening', () => {
      cdp.send('Page.handleJavaScriptDialog', { accept: true }, sessionId).catch(() => {});
    });

    // Discover a real product id from the live storefront before asserting
    // anything, so product-detail.html is always loaded against a product the
    // shop currently sells. Discovery needs a real document origin, so it
    // borrows the first page in the run (the loop reloads it below). An explicit
    // SMOKE_PRODUCT_ID wins and skips the network entirely; a failure just keeps
    // the fallback id, because a missing catalogue must not fail the run.
    const pinned = process.env.SMOKE_PRODUCT_ID;
    const discovered = pinned ? null : await discoverProductId(cdp, sessionId, baseUrl, PAGES[0]);
    const PRODUCT_ID = pinned || discovered || FALLBACK_PRODUCT_ID;
    const PAGE_QUERY = { 'product-detail.html': `?id=${encodeURIComponent(PRODUCT_ID)}` };
    if (VERBOSE) {
      const source = pinned
        ? 'pinned via SMOKE_PRODUCT_ID'
        : discovered
          ? 'discovered on the live storefront'
          : 'fallback (no live catalogue id found)';
      console.log(`  product-detail.html id: ${PRODUCT_ID} (${source})`);
    }

    let current = null;
    const classify = (text, match) => {
      const line = String(text).split('\n')[0];
      const probe = String(match === undefined ? line : match);
      const entry = { text: line };
      if (IGNORE.some((re) => re.test(probe))) entry.ignored = true;
      if (current) current.messages.push(entry);
    };

    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      const ex = exceptionDetails || {};
      const detail =
        (ex.exception && (ex.exception.description || ex.exception.value)) || ex.text || 'Uncaught exception';
      classify(detail, `${ex.text || ''} | ${detail}`);
    });
    cdp.on('Log.entryAdded', ({ entry }) => {
      if (entry && entry.level === 'error' && entry.source !== 'network') {
        classify(`${entry.source || 'log'}: ${(entry.text || '').split('\n')[0]}`);
      }
    });
    cdp.on('Network.responseReceived', ({ type, response }) => {
      if (!current || !response) return;
      let sameOrigin = false;
      try {
        sameOrigin = new URL(response.url).origin === origin;
      } catch {
        sameOrigin = false;
      }
      current.network.push({ url: response.url, status: response.status, type, sameOrigin });
    });
    cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type !== 'error') return;
      const text = (args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      classify(`console.error: ${text.split('\n')[0]}`);
    });

    for (const page of PAGES) {
      current = { page, messages: [], network: [] };
      const url = `${baseUrl}/${page}${PAGE_QUERY[page] || ''}`;
      const loaded = cdp.waitFor('Page.loadEventFired', NAV_TIMEOUT_MS);
      let navError = null;
      try {
        const nav = await cdp.send('Page.navigate', { url }, sessionId);
        if (nav && nav.errorText) navError = nav.errorText;
      } catch (err) {
        navError = err.message;
      }
      await loaded;
      await sleep(SETTLE_MS);

      // A page can redirect itself away before we ever see it — product-detail.html
      // sends you home when it has no ?id=. Asserting against whatever document
      // we ended up on would be checking the wrong page, so detect that instead
      // of pretending the assertions ran.
      let landed = null;
      try {
        landed = await evaluateIn(cdp, sessionId, 'location.pathname.slice(1) + location.search');
      } catch {
        landed = null;
      }
      // Note the null check: a redirect to the site root leaves `landed` as '',
      // which a truthiness test would wrongly treat as "we never measured".
      const navigatedAway = landed !== null && landed.split('?')[0] !== page;

      let structure = [];
      let interactions = [];
      if (navigatedAway) {
        structure = [
          {
            name: 'page reached',
            outcome: 'warn',
            detail: `${page} redirected to /${landed} before it could be inspected — structural and interaction assertions skipped`,
          },
        ];
      } else {
        // Structural assertions run on the settled page, before any interaction
        // mutates the DOM (opening the cart injects markup and images).
        try {
          structure = await runStructure(cdp, sessionId, page, current.network);
        } catch (err) {
          structure = [{ name: 'structure', outcome: 'failed', detail: err.message }];
        }

        // Interactions run before we read the log, so an exception thrown by a
        // click is attributed to this page like any other.
        try {
          interactions = await runInteractions(cdp, sessionId, page);
        } catch (err) {
          interactions = [{ name: 'interactions', outcome: 'failed', detail: err.message }];
        }
      }

      const messages = current.messages;
      const failures = messages.filter((m) => !m.ignored);
      const warnings = messages.filter((m) => m.ignored);
      if (navError) failures.unshift({ text: `navigation failed: ${navError}` });
      for (const it of interactions) {
        if (it.outcome === 'failed') failures.push({ text: `interaction "${it.name}": ${it.detail}` });
      }
      for (const check of structure) {
        if (check.outcome === 'failed') failures.push({ text: `structure "${check.name}": ${check.detail}` });
      }
      results.push({ page, url, failures, warnings, interactions, structure });
      current = null;
    }
  } finally {
    if (ws) ws.close();
    await cleanup(browser);
    if (ownServer) ownServer.server.close();
  }

  const failed = results.filter((r) => r.failures.length);
  // Interactions and structural checks are graded the same way, so warnings
  // from either kind are pooled together when they are reported.
  const allChecks = (r) => [...r.interactions, ...r.structure];
  for (const r of results) {
    const ok = r.interactions.filter((i) => i.outcome === 'passed').length;
    const skipped = r.interactions.filter((i) => i.outcome === 'skipped').length;
    const warned = allChecks(r).filter((c) => c.outcome === 'warn').length;
    const structural = r.structure.filter((s) => s.outcome === 'passed').length;
    const notes = [];
    if (ok) notes.push(`${ok} interaction${ok === 1 ? '' : 's'} ok`);
    if (structural) notes.push(`${structural} structural check${structural === 1 ? '' : 's'} ok`);
    if (warned) notes.push(`${warned} warning${warned === 1 ? '' : 's'}`);
    if (skipped) notes.push(`${skipped} n/a`);
    if (r.warnings.length) notes.push(`${r.warnings.length} ignored warning${r.warnings.length === 1 ? '' : 's'}`);
    const suffix = notes.length ? ` (${notes.join(', ')})` : '';
    if (r.failures.length) {
      console.error(`✗ ${r.page}${suffix}`);
      for (const f of r.failures) console.error(`    ${f.text}`);
    } else {
      console.log(`✓ ${r.page}${suffix}`);
    }
    if (VERBOSE) {
      for (const i of r.interactions) console.log(`      · ${i.name}: ${i.outcome} — ${i.detail}`);
      for (const s of r.structure) console.log(`      · [structure] ${s.name}: ${s.outcome} — ${s.detail}`);
      for (const w of r.warnings) console.log(`      · [ignored] ${w.text}`);
    }
  }

  const exercised = results.reduce((n, r) => n + r.interactions.filter((i) => i.outcome === 'passed').length, 0);
  const structuralPassed = results.reduce((n, r) => n + r.structure.filter((s) => s.outcome === 'passed').length, 0);
  const structuralTotal = results.reduce((n, r) => n + r.structure.filter((s) => s.outcome !== 'warn').length, 0);
  const notApplicable = results.reduce((n, r) => n + r.interactions.filter((i) => i.outcome === 'skipped').length, 0);
  const warned = results.reduce((n, r) => n + allChecks(r).filter((c) => c.outcome === 'warn').length, 0);
  const warnedPages = results.filter((r) => allChecks(r).some((c) => c.outcome === 'warn')).length;

  console.log('');
  // Warnings are real findings but not build-breaking, and the same chrome issue
  // tends to repeat on every page, so report it once with the page count.
  if (warned) {
    const first = results.flatMap(allChecks).find((c) => c.outcome === 'warn');
    console.log(`⚠ ${warnedPages}/${results.length} page(s): ${first.detail}`);
    console.log('');
  }
  if (failed.length) {
    console.error(`✗ Storefront smoke test failed — issues on ${failed.length}/${results.length} page(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `✓ Storefront smoke test passed — ${results.length} page(s), ${exercised} interaction(s) exercised` +
      (notApplicable ? `, ${notApplicable} n/a for their page` : '') +
      (warned ? `, ${warned} warning(s)` : '') +
      `, ${structuralPassed}/${structuralTotal} structural assertion(s)` +
      ', no uncaught exceptions.'
  );
}

main().catch((err) => {
  console.error('✗ Storefront smoke test errored:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
