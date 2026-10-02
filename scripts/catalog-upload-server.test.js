// End-to-end tests for the `--serve` catalog upload server in
// scripts/mirror-catalog-images.js: the token gate, upload dedupe, and the
// opt-in --commit behaviour.
//
// Run: node scripts/catalog-upload-server.test.js   (or `npm test`)
//
// "In-process": rather than spawning the CLI, the test copies the server script
// into a throwaway git repo — so its ROOT/OUT_DIR point at the temp dir and the
// real products/catalog/ is never touched — and starts it inside this Node
// process, then drives it over real HTTP.

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

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

const REPO_ROOT = path.join(__dirname, '..');
const SOURCE = path.join(REPO_ROOT, 'scripts', 'mirror-catalog-images.js');
const TOKEN = 'test-upload-token-1234';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Only the magic bytes are sniffed, so a padded buffer is a valid "PNG".
function pngBytes(seed) {
  return Buffer.concat([PNG_MAGIC, Buffer.alloc(64, seed)]);
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();
}

(async () => {
  // ── throwaway git repo ──────────────────────────────────────────────────
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-upload-server-'));
  const catalogDir = path.join(repo, 'products', 'catalog');
  fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(repo, 'scripts', 'mirror-catalog-images.js'));

  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'user.name', 'Upload Test']);
  fs.writeFileSync(path.join(repo, 'README.md'), '# throwaway repo\n');
  git(repo, ['add', 'README.md']);
  git(repo, ['commit', '-q', '-m', 'initial commit']);

  // ── start the server in this process ────────────────────────────────────
  // The module reads process.argv at require time, so set it first.
  const originalArgv = process.argv;
  process.argv = ['node', path.join(repo, 'scripts', 'mirror-catalog-images.js'), '--serve', '0', '--token', TOKEN, '--commit'];
  let startUploadServer;
  try {
    ({ startUploadServer } = require(path.join(repo, 'scripts', 'mirror-catalog-images.js')));
  } finally {
    process.argv = originalArgv;
  }

  const server = startUploadServer();
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const endpoint = `${base}/api/catalog-upload`;

  // Build a POST that can put the token in the header or the query string.
  const upload = (buf, { token, inQuery = false, contentType = 'image/png', name } = {}) => {
    const params = [];
    if (name) params.push(`name=${encodeURIComponent(name)}`);
    if (token && inQuery) params.push(`token=${encodeURIComponent(token)}`);
    const url = params.length ? `${endpoint}?${params.join('&')}` : endpoint;
    const headers = { 'Content-Type': contentType };
    if (token && !inQuery) headers['X-Catalog-Token'] = token;
    return fetch(url, { method: 'POST', headers, body: buf });
  };

  try {
    // ── token gate ────────────────────────────────────────────────────────
    await test('an unauthenticated request is rejected and writes nothing', async () => {
      const res = await upload(pngBytes(1));
      assert.strictEqual(res.status, 401);
      assert.strictEqual((await res.json()).success, false);
      assert.deepStrictEqual(fs.readdirSync(catalogDir), []);
    });

    await test('a wrong token is rejected', async () => {
      const res = await upload(pngBytes(1), { token: 'not-the-token' });
      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(fs.readdirSync(catalogDir), []);
    });

    await test('a valid token with a non-image content type is refused', async () => {
      const res = await upload(pngBytes(1), { token: TOKEN, contentType: 'text/plain' });
      assert.strictEqual(res.status, 415);
      assert.deepStrictEqual(fs.readdirSync(catalogDir), []);
    });

    await test('CORS preflight reflects a loopback origin but not a foreign one', async () => {
      const loop = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'http://localhost:9999', 'Access-Control-Request-Method': 'POST' } });
      assert.strictEqual(loop.status, 204);
      assert.strictEqual(loop.headers.get('access-control-allow-origin'), 'http://localhost:9999');
      const foreign = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'https://evil.example.com', 'Access-Control-Request-Method': 'POST' } });
      assert.strictEqual(foreign.headers.get('access-control-allow-origin'), null);
    });

    // ── first real upload, with --commit ──────────────────────────────────
    // Leave unrelated work staged: the commit must not sweep it in.
    fs.writeFileSync(path.join(repo, 'unrelated.txt'), 'in-progress work\n');
    git(repo, ['add', 'unrelated.txt']);
    const commitsBefore = Number(git(repo, ['rev-list', '--count', 'HEAD']).trim());

    const firstBuffer = pngBytes(7);
    let firstLocal;
    await test('a valid token uploads the image and commits only that image', async () => {
      const res = await upload(firstBuffer, { token: TOKEN, name: 'hero.png' });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.deduped, false);
      firstLocal = body.local;
      assert.ok(fs.existsSync(path.join(repo, firstLocal)), `${body.local} was not written`);

      // --commit produced exactly one new commit naming only the image + registry.
      const commitsAfter = Number(git(repo, ['rev-list', '--count', 'HEAD']).trim());
      assert.strictEqual(commitsAfter, commitsBefore + 1);
      const changed = git(repo, ['show', '--name-only', '--format=', 'HEAD']).split('\n').map((s) => s.trim()).filter(Boolean);
      assert.ok(changed.includes(body.local), `HEAD did not include ${body.local} (${changed.join(', ')})`);
      assert.ok(changed.every((file) => file.startsWith('products/catalog/')), `commit swept in unrelated files: ${changed.join(', ')}`);
      assert.strictEqual(body.commit?.committed, true);

      // The staged unrelated file is still staged, untouched.
      assert.ok(git(repo, ['diff', '--cached', '--name-only']).split('\n').includes('unrelated.txt'));
    });

    await test('the token is also accepted as a ?token= query param', async () => {
      const res = await upload(pngBytes(9), { token: TOKEN, inQuery: true, name: 'query-token.png' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual((await res.json()).success, true);
    });

    // ── dedupe ────────────────────────────────────────────────────────────
    await test('re-uploading identical bytes dedupes to the same file with no new commit', async () => {
      const filesBefore = fs.readdirSync(catalogDir).length;
      const commitsBeforeDedupe = Number(git(repo, ['rev-list', '--count', 'HEAD']).trim());

      const res = await upload(firstBuffer, { token: TOKEN, name: 'hero-again.png' });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.deduped, true);
      assert.strictEqual(body.local, firstLocal, 'dedupe should return the original file');
      assert.strictEqual(body.commit?.committed, false);
      assert.strictEqual(body.commit?.reason, 'nothing new to commit');

      // No extra file, no extra commit.
      assert.strictEqual(fs.readdirSync(catalogDir).length, filesBefore);
      assert.strictEqual(Number(git(repo, ['rev-list', '--count', 'HEAD']).trim()), commitsBeforeDedupe);
    });

    await test('the uploads registry records both distinct images', async () => {
      const registry = JSON.parse(fs.readFileSync(path.join(catalogDir, 'uploads.json'), 'utf8'));
      assert.ok(Array.isArray(registry) && registry.length === 2, `expected 2 registry entries, got ${registry?.length}`);
      assert.ok(registry.some((entry) => entry.file === firstLocal));
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(repo, { recursive: true, force: true });
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
