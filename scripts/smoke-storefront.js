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

const { HEADCSS_PAGES } = require('./build-chrome.js');

const ROOT = path.resolve(__dirname, '..');
// SMOKE_PAGES lets you smoke a subset (or a throwaway page) while iterating:
//   SMOKE_PAGES=index.html,about.html node scripts/smoke-storefront.js
const PAGES = (process.env.SMOKE_PAGES
  ? process.env.SMOKE_PAGES.split(',').map((p) => p.trim()).filter(Boolean)
  : [...HEADCSS_PAGES].sort());

// Settle time after `load` so deferred scripts and DOMContentLoaded
// handlers get a chance to run (and throw) before we move on.
const SETTLE_MS = 800;
const NAV_TIMEOUT_MS = 20000;

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
    cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type !== 'error') return;
      const text = (args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      classify(`console.error: ${text.split('\n')[0]}`);
    });

    for (const page of PAGES) {
      current = { page, messages: [] };
      const url = `${baseUrl}/${page}`;
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

      const messages = current.messages;
      const failures = messages.filter((m) => !m.ignored);
      const warnings = messages.filter((m) => m.ignored);
      if (navError) failures.unshift({ text: `navigation failed: ${navError}` });
      results.push({ page, url, failures, warnings });
      current = null;
    }
  } finally {
    if (ws) ws.close();
    await cleanup(browser);
    if (ownServer) ownServer.server.close();
  }

  const failed = results.filter((r) => r.failures.length);
  for (const r of results) {
    if (r.failures.length) {
      console.error(`✗ ${r.page}`);
      for (const f of r.failures) console.error(`    ${f.text}`);
    } else if (r.warnings.length) {
      console.log(`• ${r.page} (${r.warnings.length} ignored warning${r.warnings.length === 1 ? '' : 's'})`);
    } else {
      console.log(`✓ ${r.page}`);
    }
  }

  console.log('');
  if (failed.length) {
    console.error(`✗ Storefront smoke test failed — uncaught exceptions on ${failed.length}/${results.length} page(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Storefront smoke test passed — ${results.length} page(s) loaded with no uncaught exceptions.`);
}

main().catch((err) => {
  console.error('✗ Storefront smoke test errored:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
