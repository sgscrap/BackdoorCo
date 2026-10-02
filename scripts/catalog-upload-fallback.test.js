// Unit tests for admin/catalog-upload.mjs — the local-first image uploader.
// Run: node scripts/catalog-upload-fallback.test.js   (or `npm test`)
//
// The uploader is an ES module, so it is pulled in with a dynamic import from
// this CommonJS harness. The interesting behaviour is the fallback: when the
// local mirror upload server (started with `--serve`) is unreachable, the upload
// must transparently fall back to Cloudinary instead of failing. Both paths use
// the global `fetch`, so we stub it here and never touch the network.
//
// The module memoises "local upload unavailable" once a call fails, so each
// scenario imports a fresh copy (cache-busted with a query string) to get a
// clean state.

'use strict';

const assert = require('assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');
const { File } = require('buffer');

// ── tiny async harness (same shape as the sibling tests) ───────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, body) {
  try {
    await body();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  FAIL  ${name}\n        ${err && err.message}`);
  }
}

const ROOT = path.join(__dirname, '..');
const MODULE_URL = pathToFileURL(path.join(ROOT, 'admin', 'catalog-upload.mjs')).href;

const SECURE_URL = 'https://res.cloudinary.com/djj8ik8i5/image/upload/v1/backdoor/products/fresh.png';
const LOCAL_PATH = 'products/catalog/off-white-af1-cover-a84c12.png';
const TOKEN = 'test-upload-token';

const FILE = new File([Buffer.from([0x89, 0x50, 0x4e, 0x47])], 'fresh.png', { type: 'image/png' });

// ── fetch stub ──────────────────────────────────────────────────────────────
// `mode` decides how the local endpoint answers; Cloudinary always succeeds.
const originalFetch = globalThis.fetch;

function stubFetch(localMode) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ url: href, options });

    if (href.includes('/api/catalog-upload')) {
      if (localMode === 'unreachable') throw new TypeError('fetch failed');
      if (localMode === 'unauthorized') return { ok: false, status: 401, json: async () => ({ success: false, error: 'missing token' }) };
      if (localMode === 'no-local') return { ok: true, status: 200, json: async () => ({ success: true }) };
      return { ok: true, status: 200, json: async () => ({ success: true, local: LOCAL_PATH }) };
    }

    if (href.includes('api.cloudinary.com')) {
      return { ok: true, status: 200, json: async () => ({ secure_url: SECURE_URL }) };
    }

    throw new Error(`unexpected fetch: ${href}`);
  };
  return calls;
}

const localCalls = (calls) => calls.filter((call) => call.url.includes('/api/catalog-upload'));
const cloudCalls = (calls) => calls.filter((call) => call.url.includes('api.cloudinary.com'));

// Each scenario needs its own module instance (see memo note above).
let importSeq = 0;
function freshUploader() {
  importSeq += 1;
  return import(`${MODULE_URL}?v=${importSeq}`);
}

// ── run ─────────────────────────────────────────────────────────────────────
(async () => {
  // The uploader reads the injected token off window; provide it here.
  globalThis.window = { CATALOG_UPLOAD_TOKEN: TOKEN };
  // The fallback logs a one-line notice each time; keep the test output clean.
  const realInfo = console.info;
  console.info = () => {};

  try {
    await test('an unreachable local endpoint falls back to Cloudinary', async () => {
      const calls = stubFetch('unreachable');
      const { uploadCatalogImage } = await freshUploader();

      const result = await uploadCatalogImage(FILE);

      assert.strictEqual(result, SECURE_URL, 'should return the Cloudinary URL');
      assert.strictEqual(localCalls(calls).length, 1, 'should try the local endpoint once');
      assert.strictEqual(cloudCalls(calls).length, 1, 'should then call Cloudinary once');

      const local = localCalls(calls)[0];
      assert.strictEqual(local.options.method, 'POST');
      assert.ok(local.url.includes('?name=fresh.png'), 'should pass the file name through');
      assert.strictEqual(local.options.body, FILE, 'should post the original file');
      assert.strictEqual(local.options.headers['X-Catalog-Token'], TOKEN, 'should send the injected token');
    });

    await test('a non-2xx local response also falls back to Cloudinary', async () => {
      const calls = stubFetch('unauthorized');
      const { uploadCatalogImage } = await freshUploader();

      assert.strictEqual(await uploadCatalogImage(FILE), SECURE_URL);
      assert.strictEqual(cloudCalls(calls).length, 1);
    });

    await test('a local reply without a local path also falls back', async () => {
      const calls = stubFetch('no-local');
      const { uploadCatalogImage } = await freshUploader();

      assert.strictEqual(await uploadCatalogImage(FILE), SECURE_URL);
      assert.strictEqual(cloudCalls(calls).length, 1);
    });

    await test('once the local endpoint fails, later uploads skip it', async () => {
      const calls = stubFetch('unreachable');
      const { uploadCatalogImage } = await freshUploader();

      assert.strictEqual(await uploadCatalogImage(FILE), SECURE_URL);
      assert.strictEqual(await uploadCatalogImage(FILE), SECURE_URL);

      assert.strictEqual(localCalls(calls).length, 1, 'should not retry the dead endpoint');
      assert.strictEqual(cloudCalls(calls).length, 2, 'every upload should still reach Cloudinary');
    });

    await test('a reachable local endpoint is preferred over Cloudinary', async () => {
      const calls = stubFetch('ok');
      const { uploadCatalogImage } = await freshUploader();

      assert.strictEqual(await uploadCatalogImage(FILE), LOCAL_PATH);
      assert.strictEqual(cloudCalls(calls).length, 0, 'should not call Cloudinary when local works');
    });

    await test('a missing file resolves to null without any request', async () => {
      const calls = stubFetch('ok');
      const { uploadCatalogImage } = await freshUploader();

      assert.strictEqual(await uploadCatalogImage(null), null);
      assert.strictEqual(calls.length, 0);
    });
  } finally {
    console.info = realInfo;
    globalThis.fetch = originalFetch;
    delete globalThis.window;
  }

  // ── summary ─────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    for (const { name, err } of failures) console.error(`\n[${name}] ${err.stack || err.message}`);
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
