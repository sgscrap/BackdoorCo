// Tests for admin/product-image-upload.mjs — the save-time image logic the
// admin product form uses (admin/products.js).
//
// Run: node scripts/product-image-upload.test.js   (or `npm test`)
//
// admin/products.js itself cannot be imported here (it pulls Firebase from
// gstatic and touches the DOM), so its save-time image handling lives in the
// extracted .mjs module under test. The integration cases drive the REAL
// admin/catalog-upload.mjs uploader with a stubbed `fetch`, so "the local
// uploader is preferred, and its result is written into the saved product" is
// asserted across the genuine module seam, not a reimplementation.

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

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
const ADMIN_DIR = path.join(ROOT, 'admin');
const MODULE_URL = pathToFileURL(path.join(ADMIN_DIR, 'product-image-upload.mjs')).href;
const UPLOADER_URL = pathToFileURL(path.join(ADMIN_DIR, 'catalog-upload.mjs')).href;

const LOCAL_PATH = 'products/catalog/off-white-af1-cover-a84c12.png';
const SECURE_URL = 'https://res.cloudinary.com/djj8ik8i5/image/upload/v1/backdoor/products/fresh.png';
const TOKEN = 'test-upload-token';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const PICKED_FILE = new File([PNG_BYTES], 'fresh.png', { type: 'image/png' });
const CROPPED_BLOB = new Blob([PNG_BYTES], { type: 'image/png' });

// ── fetch stub (local endpoint configurable; Cloudinary always succeeds) ────
const originalFetch = globalThis.fetch;

function stubFetch(localMode) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ url: href, options });
    if (href.includes('/api/catalog-upload')) {
      if (localMode === 'unreachable') throw new TypeError('fetch failed');
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

// Each scenario needs a fresh uploader: it memoises "local unavailable".
let importSeq = 0;
function freshUploader() {
  importSeq += 1;
  return import(`${UPLOADER_URL}?v=${importSeq}`);
}

// Mirror of the admin form's save path: pick the bytes, upload, fold the
// result into the image fields, then build what gets written to the product.
async function saveWithUpload({ imageFile, croppedBlob, typedUrl = '', gallery = [], upload }) {
  const file = uploadFileFor(imageFile, croppedBlob);
  let imageUrl = typedUrl;
  let galleryUrls = [...gallery];
  if (file) {
    const uploaded = await upload(file);
    ({ imageUrl, gallery: galleryUrls } = applyUploadedImage(uploaded, { currentUrl: imageUrl, gallery: galleryUrls }));
  }
  if (!imageUrl && galleryUrls.length) imageUrl = galleryUrls[0];
  return { file, imageUrl, galleryUrls, fields: buildProductImageFields(imageUrl, galleryUrls) };
}

let uploadFileFor;
let applyUploadedImage;
let buildProductImageFields;

(async () => {
  ({ uploadFileFor, applyUploadedImage, buildProductImageFields } = await import(MODULE_URL));

  globalThis.window = { CATALOG_UPLOAD_TOKEN: TOKEN };
  const realInfo = console.info;
  console.info = () => {};

  try {
    // ── file selection ────────────────────────────────────────────────────
    await test('a picked file is uploaded as-is when there is no crop', () => {
      assert.strictEqual(uploadFileFor(PICKED_FILE, null), PICKED_FILE);
    });

    await test('with nothing picked or cropped there is nothing to upload', () => {
      assert.strictEqual(uploadFileFor(null, null), null);
      assert.strictEqual(uploadFileFor(undefined, undefined), null);
    });

    await test('a crop of a picked file keeps that file\'s base name', () => {
      const file = uploadFileFor(PICKED_FILE, CROPPED_BLOB);
      assert.strictEqual(file.name, 'fresh-crop.png');
      assert.strictEqual(file.type, 'image/png');
    });

    await test('a crop with no input file is named "cropped"', () => {
      assert.strictEqual(uploadFileFor(null, CROPPED_BLOB).name, 'cropped.png');
    });

    await test('compressed crops get the matching extension', () => {
      assert.strictEqual(uploadFileFor(null, new Blob([PNG_BYTES], { type: 'image/webp' })).name, 'cropped.webp');
      assert.strictEqual(uploadFileFor(null, new Blob([PNG_BYTES], { type: 'image/jpeg' })).name, 'cropped.jpg');
    });

    // ── applying the upload result ────────────────────────────────────────
    await test('a local upload becomes the primary image and leads the gallery', () => {
      const typed = 'https://example.com/typed.jpg';
      const applied = applyUploadedImage(LOCAL_PATH, { currentUrl: typed, gallery: [typed, 'https://example.com/b.jpg'] });
      assert.strictEqual(applied.imageUrl, LOCAL_PATH);
      assert.deepStrictEqual(applied.gallery, [LOCAL_PATH, typed, 'https://example.com/b.jpg']);
    });

    await test('an existing copy of the upload is not duplicated in the gallery', () => {
      const applied = applyUploadedImage(LOCAL_PATH, { currentUrl: '', gallery: [LOCAL_PATH, 'https://example.com/b.jpg'] });
      assert.deepStrictEqual(applied.gallery, [LOCAL_PATH, 'https://example.com/b.jpg']);
    });

    await test('an empty upload result keeps the typed URL and gallery', () => {
      const typed = 'https://example.com/typed.jpg';
      const applied = applyUploadedImage(null, { currentUrl: typed, gallery: [typed] });
      assert.strictEqual(applied.imageUrl, typed);
      assert.deepStrictEqual(applied.gallery, [typed]);
    });

    // ── product image fields ──────────────────────────────────────────────
    await test('the saved product gets the primary first and a deduped gallery', () => {
      const typed = 'https://example.com/typed.jpg';
      const fields = buildProductImageFields(LOCAL_PATH, [typed, LOCAL_PATH, 'https://example.com/b.jpg']);
      assert.strictEqual(fields.image, LOCAL_PATH);
      assert.strictEqual(fields.cardImage, LOCAL_PATH);
      assert.deepStrictEqual(fields.images, [LOCAL_PATH, typed, 'https://example.com/b.jpg']);
    });

    await test('an empty gallery falls back to just the primary image', () => {
      const fields = buildProductImageFields(LOCAL_PATH, []);
      assert.deepStrictEqual(fields.images, [LOCAL_PATH]);
    });

    // ── integration: real uploader, stubbed network ───────────────────────
    await test('save-time upload prefers the local server and writes its path into the product', async () => {
      const calls = stubFetch('ok');
      const { uploadCatalogImage } = await freshUploader();
      const typed = 'https://example.com/typed.jpg';

      const saved = await saveWithUpload({
        imageFile: PICKED_FILE,
        typedUrl: typed,
        gallery: [typed],
        upload: uploadCatalogImage,
      });

      // Local uploader preferred; Cloudinary never consulted.
      assert.strictEqual(localCalls(calls).length, 1);
      assert.strictEqual(cloudCalls(calls).length, 0, 'must not call Cloudinary when local works');
      assert.strictEqual(localCalls(calls)[0].options.headers['X-Catalog-Token'], TOKEN);

      // The local path is what gets written into the saved product.
      assert.strictEqual(saved.fields.image, LOCAL_PATH);
      assert.strictEqual(saved.fields.cardImage, LOCAL_PATH);
      assert.strictEqual(saved.fields.images[0], LOCAL_PATH);
    });

    await test('on save, a pending crop is the bytes uploaded', async () => {
      const calls = stubFetch('ok');
      const { uploadCatalogImage } = await freshUploader();

      const saved = await saveWithUpload({
        imageFile: PICKED_FILE,
        croppedBlob: CROPPED_BLOB,
        upload: uploadCatalogImage,
      });

      const sent = localCalls(calls)[0].options.body;
      assert.strictEqual(sent.name, 'fresh-crop.png', 'the cropped file should be uploaded');
      assert.strictEqual(saved.fields.image, LOCAL_PATH);
    });

    await test('when the local server is down the Cloudinary URL is written instead', async () => {
      const calls = stubFetch('unreachable');
      const { uploadCatalogImage } = await freshUploader();

      const saved = await saveWithUpload({ imageFile: PICKED_FILE, upload: uploadCatalogImage });

      assert.strictEqual(cloudCalls(calls).length, 1);
      assert.strictEqual(saved.fields.image, SECURE_URL);
      assert.strictEqual(saved.fields.images[0], SECURE_URL);
    });

    // ── the extraction is actually wired into the form ────────────────────
    await test('admin/products.js uses the extracted module', () => {
      const source = fs.readFileSync(path.join(ADMIN_DIR, 'products.js'), 'utf8');
      assert.match(source, /from "\.\/product-image-upload\.mjs"/);
      for (const fn of ['uploadFileFor(', 'applyUploadedImage(', 'buildProductImageFields(']) {
        assert.ok(source.includes(fn), `admin/products.js should call ${fn}`);
      }
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
    process.exitCode = 1;
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
