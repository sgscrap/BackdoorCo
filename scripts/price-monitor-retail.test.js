// Unit tests for netlify/functions/price-monitor-retail.js
// Run: node scripts/price-monitor-retail.test.js   (or `npm test`)
//
// Covers the SSRF guard: private-IP classification (IPv4, IPv6, IPv4-mapped,
// NAT64, and deprecated IPv4-compatible forms), DNS-rebinding TOCTOU
// elimination (connection is pinned to the verified IP, never re-resolved),
// and redirect re-validation. No network is touched - dns.lookup and
// http.request are stubbed.

'use strict';

const assert = require('assert/strict');
const http = require('http');
const dns = require('dns');
const { EventEmitter } = require('events');

const fn = require('../netlify/functions/price-monitor-retail.js');

// ── tiny async harness ─────────────────────────────────────────────────────
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

// ── test doubles ───────────────────────────────────────────────────────────
function stubLookup(handler) {
  const original = dns.lookup;
  let calls = 0;
  dns.lookup = (hostname, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    calls++;
    handler(hostname, cb, calls);
  };
  return {
    calls: () => calls,
    restore: () => { dns.lookup = original; },
  };
}

function fakeRes(statusCode, headers, body) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.statusMessage = 'OK';
  res.headers = headers || {};
  process.nextTick(() => {
    if (body) res.emit('data', Buffer.from(body));
    res.emit('end');
  });
  return res;
}

function fakeReq() {
  const req = new EventEmitter();
  req.end = () => {};
  req.destroy = () => {};
  req.setTimeout = () => req;
  return req;
}

function stubRequest(responder) {
  const original = http.request;
  const captured = [];
  http.request = (options, cb) => {
    captured.push(options);
    cb(responder ? responder(options, captured.length) : fakeRes(200, {}, '<html></html>'));
    return fakeReq();
  };
  return {
    captured: () => captured,
    restore: () => { http.request = original; },
  };
}

// ── isPrivateIp: full classification table ─────────────────────────────────
const IP_CASES = [
  // IPv4 private / special
  ['10.0.0.1', true],
  ['10.255.255.255', true],
  ['127.0.0.1', true],
  ['169.254.169.254', true],
  ['172.16.5.5', true],
  ['172.31.255.255', true],
  ['192.168.1.1', true],
  ['0.0.0.0', true],
  ['224.0.0.1', true],
  ['255.255.255.255', true],
  // IPv4 public
  ['8.8.8.8', false],
  ['104.16.0.1', false],
  ['93.184.216.34', false],
  // IPv6 private / special
  ['::1', true],
  ['::', true],
  ['fc00::1', true],
  ['fd12:3456::1', true],
  ['fe80::1', true],
  ['fe90::1', true],
  ['feb0::1', true],
  // IPv4-mapped IPv6 (dotted quad + hex-group forms)
  ['::ffff:127.0.0.1', true],
  ['::ffff:a9fe:a9fe', true],
  ['::ffff:7f00:1', true],
  ['::ffff:0:7f00:1', true],
  ['::ffff:7f000001', true],
  ['::ffff:8.8.8.8', false],
  // NAT64
  ['64:ff9b::127.0.0.1', true],
  ['64:ff9b::8.8.8.8', false],
  // deprecated IPv4-compatible IPv6
  ['::127.0.0.1', true],
  ['::0:7f00:1', true],
  ['::8.8.8.8', false],
  ['::1234:5678', false], // ordinary IPv6 with 2 groups, not embedded v4
  // ordinary public IPv6
  ['2001:4860:4860::8888', false],
  ['2001:db8::1', false],
  ['2606:4700::6810:1', false],
  // unknown / malformed -> block (fail closed)
  ['not-an-ip', true],
  ['', true],
];

async function main() {
  console.log('price-monitor-retail SSRF guard tests\n');

  for (const [ip, expected] of IP_CASES) {
    await test(`isPrivateIp('${ip}') === ${expected}`, () => {
      assert.strictEqual(fn.isPrivateIp(ip), expected);
    });
  }

  // ── extractMappedIpv4 decodes ──
  const DECODE_CASES = [
    ['::ffff:7f00:1', '127.0.0.1'],
    ['::ffff:0:7f00:1', '127.0.0.1'],
    ['::ffff:7f000001', '127.0.0.1'],
    ['::ffff:127.0.0.1', '127.0.0.1'],
    ['::ffff:a9fe:a9fe', '169.254.169.254'],
    ['::ffff:8.8.8.8', '8.8.8.8'],
    ['::127.0.0.1', '127.0.0.1'],
    ['::0:7f00:1', '127.0.0.1'],
    ['64:ff9b::127.0.0.1', '127.0.0.1'],
    ['64:ff9b::8.8.8.8', '8.8.8.8'],
    ['2001:db8::1', null],
    ['::1234:5678', null],
    ['fe80::1', null],
    ['::1', null],
    ['::', null],
    ['::2:3:4:5:6:7:8', null], // many groups -> ordinary IPv6, not mapped
  ];
  for (const [input, expected] of DECODE_CASES) {
    await test(`extractMappedIpv4('${input}') === ${expected}`, () => {
      assert.strictEqual(fn.extractMappedIpv4(input), expected);
    });
  }

  // ── resolveSafeIp (stubbed dns) ──
  await test('resolveSafeIp returns first public address', async () => {
    const stub = stubLookup((hostname, cb) => {
      cb(null, [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:4700::6810:1', family: 6 },
      ]);
    });
    try {
      const ip = await fn.resolveSafeIp(new URL('http://example.com/'));
      assert.strictEqual(ip, '93.184.216.34');
      assert.strictEqual(stub.calls(), 1);
    } finally { stub.restore(); }
  });

  await test('resolveSafeIp rejects when ANY answer is private', async () => {
    const stub = stubLookup((hostname, cb) => {
      cb(null, [
        { address: '93.184.216.34', family: 4 },
        { address: '169.254.169.254', family: 4 },
      ]);
    });
    try {
      await assert.rejects(
        fn.resolveSafeIp(new URL('http://example.com/')),
        /Blocked private\/internal address 169\.254\.169\.254/
      );
    } finally { stub.restore(); }
  });

  await test('resolveSafeIp rejects all-private answers', async () => {
    const stub = stubLookup((hostname, cb) => cb(null, [{ address: '10.0.0.4', family: 4 }]));
    try {
      await assert.rejects(fn.resolveSafeIp(new URL('http://example.com/')), /Blocked private/);
    } finally { stub.restore(); }
  });

  await test('resolveSafeIp rejects empty answer set', async () => {
    const stub = stubLookup((hostname, cb) => cb(null, []));
    try {
      await assert.rejects(fn.resolveSafeIp(new URL('http://example.com/')), /No addresses/);
    } finally { stub.restore(); }
  });

  await test('resolveSafeIp rejects DNS error', async () => {
    const stub = stubLookup((hostname, cb) => cb(new Error('ENOTFOUND')));
    try {
      await assert.rejects(fn.resolveSafeIp(new URL('http://example.com/')), /Host resolution failed/);
    } finally { stub.restore(); }
  });

  await test('resolveSafeIp rejects IPv6-bracketed private literal', async () => {
    const stub = stubLookup((hostname, cb) => cb(null, [{ address: hostname, family: 6 }]));
    try {
      await assert.rejects(fn.resolveSafeIp(new URL('http://[::1]/')), /Blocked private/);
    } finally { stub.restore(); }
  });

  // ── fetchSafely: DNS-rebinding TOCTOU eliminated (pinned connection) ──
  await test('fetchSafely connects to the VERIFIED ip, never re-resolves (rebinding)', async () => {
    const lookup = stubLookup((hostname, cb, call) => {
      // Attack: first answer public, second answer private (metadata IP).
      if (call === 1) return cb(null, [{ address: '93.184.216.34', family: 4 }]);
      return cb(null, [{ address: '169.254.169.254', family: 4 }]);
    });
    const req = stubRequest((options) => fakeRes(200, {}, '<html><head><title>T</title></head></html>'));
    try {
      const res = await fn.fetchSafely(new URL('http://example.com/product'));
      assert.strictEqual(res.status, 200);
      assert.strictEqual(lookup.calls(), 1, 'DNS must be queried exactly once - no re-resolution');
      assert.strictEqual(req.captured().length, 1);
      assert.strictEqual(req.captured()[0].hostname, '93.184.216.34', 'connection pinned to verified IP');
      assert.strictEqual(req.captured()[0].headers.Host, 'example.com', 'original Host header preserved');
      assert.match(await res.text(), /<title>T<\/title>/);
    } finally { lookup.restore(); req.restore(); }
  });

  await test('fetchSafely redirect hop re-validates + pins the new host', async () => {
    const lookup = stubLookup((hostname, cb) => {
      if (hostname === 'example.com') return cb(null, [{ address: '93.184.216.34', family: 4 }]);
      if (hostname === 'cdn.example.com') return cb(null, [{ address: '104.16.0.1', family: 4 }]);
      return cb(null, [{ address: '169.254.169.254', family: 4 }]);
    });
    let hop = 0;
    const req = stubRequest((options) => {
      hop++;
      if (hop === 1) return fakeRes(302, { location: 'http://cdn.example.com/final' }, '');
      return fakeRes(200, {}, '<html><head><title>Final</title></head></html>');
    });
    try {
      const res = await fn.fetchSafely(new URL('http://example.com/start'));
      assert.strictEqual(res.status, 200);
      assert.strictEqual(hop, 2);
      assert.strictEqual(lookup.calls(), 2, 'one resolve per hop');
      const second = req.captured()[1];
      assert.strictEqual(second.hostname, '104.16.0.1');
      assert.strictEqual(second.headers.Host, 'cdn.example.com');
    } finally { lookup.restore(); req.restore(); }
  });

  await test('fetchSafely blocks a redirect to a private host', async () => {
    const lookup = stubLookup((hostname, cb) => {
      if (hostname === 'example.com') return cb(null, [{ address: '93.184.216.34', family: 4 }]);
      return cb(null, [{ address: '169.254.169.254', family: 4 }]); // redirect target is private
    });
    const req = stubRequest(() => fakeRes(301, { location: 'http://169.254.169.254/latest/meta-data/' }, ''));
    try {
      await assert.rejects(
        fn.fetchSafely(new URL('http://example.com/start')),
        /Blocked private\/internal address 169\.254\.169\.254/
      );
    } finally { lookup.restore(); req.restore(); }
  });

  await test('fetchSafely blocks a redirect to a non-http(s) protocol', async () => {
    const lookup = stubLookup((hostname, cb) => cb(null, [{ address: '93.184.216.34', family: 4 }]));
    const req = stubRequest(() => fakeRes(302, { location: 'ftp://example.com/file' }, ''));
    try {
      await assert.rejects(fn.fetchSafely(new URL('http://example.com/start')), /Blocked redirect to ftp:/);
    } finally { lookup.restore(); req.restore(); }
  });

  await test('fetchSafely rejects too many redirects', async () => {
    const lookup = stubLookup((hostname, cb) => cb(null, [{ address: '93.184.216.34', family: 4 }]));
    const req = stubRequest(() => fakeRes(302, { location: 'http://example.com/loop' }, ''));
    try {
      await assert.rejects(fn.fetchSafely(new URL('http://example.com/start')), /Too many redirects/);
    } finally { lookup.restore(); req.restore(); }
  });

  await test('fetchSafely surfaces upstream errors as non-ok (502 path)', async () => {
    const lookup = stubLookup((hostname, cb) => cb(null, [{ address: '93.184.216.34', family: 4 }]));
    const req = stubRequest(() => fakeRes(403, {}, 'Forbidden'));
    try {
      const res = await fn.fetchSafely(new URL('http://example.com/'));
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.status, 403);
    } finally { lookup.restore(); req.restore(); }
  });

  // ── summary ──
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    for (const { name, err } of failures) console.error(`\n[${name}] ${err.stack || err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
