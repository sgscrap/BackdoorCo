#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Shared chrome builder.
//
// The storefront nav and footers used to be hand-copied into every
// page, so a site-wide change meant editing ~25 files and they had
// quietly drifted apart. They now live once, in partials/, and this
// script inlines them into each page between marker comments:
//
//     <!-- @@chrome:nav:start -->
//     ...generated...
//     <!-- @@chrome:nav:end -->
//
// Run `node scripts/build-chrome.js` after editing a partial. The
// `--check` flag verifies the committed pages match the partials
// (used by CI so drift fails the build). It is idempotent: it also
// recognises the legacy hand-copied blocks the first time it runs
// and converts them into markers.
//
// Zero dependencies.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PARTIALS = path.join(ROOT, 'partials');

// Nav is generated for every page that carries the standard navbar shell.
// The value is which top-level link gets the `active` class ('' = none).
const NAV_PAGES = {
  'index.html': '',
  'about.html': 'about',
  'accounts.html': '',
  'accessories.html': 'shop',
  'apparel.html': 'shop',
  'contact.html': '',
  'electronics.html': 'shop',
  'email.html': '',
  'faq.html': '',
  'kids.html': 'shop',
  'men.html': 'shop',
  'privacy.html': '',
  'product.html': 'shop',
  'returns.html': '',
  'reviews.html': 'reviews',
  'shipping.html': '',
  'shoes.html': 'shop',
  'shop-all.html': 'shop',
  'sneakers.html': 'shop',
  'terms.html': '',
  'tracking.html': '',
  'women.html': 'shop',
};

// Footer variant per page. `full` is the rich newsletter footer used on the
// two marketing pages; `compact` is the support footer everywhere else.
const FOOTER_PAGES = {
  '404.html': 'compact',
  'about.html': 'full',
  'accessories.html': 'compact',
  'accounts.html': 'compact',
  'apparel.html': 'compact',
  'checkout.html': 'compact',
  'contact.html': 'compact',
  'electronics.html': 'compact',
  'faq.html': 'compact',
  'index.html': 'full',
  'kids.html': 'compact',
  'men.html': 'compact',
  'pricing.html': 'compact',
  'privacy.html': 'compact',
  'product-detail.html': 'compact',
  'product.html': 'compact',
  'returns.html': 'compact',
  'reviews.html': 'compact',
  'shipping.html': 'compact',
  'shoes.html': 'compact',
  'shop-all.html': 'compact',
  'sneakers.html': 'compact',
  'terms.html': 'compact',
  'tracking.html': 'compact',
  'women.html': 'compact',
};

const NAV_PARTIAL = 'nav.html';
const FOOTER_PARTIALS = {
  compact: 'footer-compact.html',
  full: 'footer-full.html',
};

function readPartial(name) {
  return fs.readFileSync(path.join(PARTIALS, name), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
}
function applyNavTokens(text, activeKey) {
  return text.replace(/%%nav:([a-z]+)%%/g, (_, key) => (key === activeKey ? 'active' : ''));
}
function markerBlock(name, body, indent, eol) {
  const lines = body.split('\n');
  const out = [indent + `<!-- @@chrome:${name}:start -->`];
  for (const line of lines) out.push(line ? indent + line : '');
  out.push(indent + `<!-- @@chrome:${name}:end -->`);
  return out.join(eol);
}

// Locate the byte range of the chrome block for a page, preferring existing
// markers and falling back to the legacy hand-copied markup.
function locate(src, markerName, legacyKind) {
  const startMarker = `<!-- @@chrome:${markerName}:start -->`;
  const endMarker = `<!-- @@chrome:${markerName}:end -->`;
  const mi = src.indexOf(startMarker);
  if (mi >= 0) {
    const mj = src.indexOf(endMarker, mi + startMarker.length);
    if (mj < 0) throw new Error(`found ${markerName} start marker but no end marker`);
    return { anchor: mi, end: mj + endMarker.length };
  }
  if (legacyKind === 'nav') {
    const s = src.indexOf('<nav class="navbar" id="navbar">');
    if (s < 0) return null;
    const navEnd = src.indexOf('</nav>', s) + '</nav>'.length;
    const mob = src.indexOf('<div class="nav-mobile-menu"', navEnd);
    let end = navEnd;
    if (mob >= 0 && mob - navEnd < 40) end = src.indexOf('</div>', mob) + '</div>'.length;
    return { anchor: s, end };
  }
  const full = legacyKind === 'footer-full';
  const s = src.indexOf(full ? '<footer class="footer">' : '<footer class="site-footer">');
  if (s < 0) return null;
  return { anchor: s, end: src.indexOf('</footer>', s) + '</footer>'.length };
}

function lineStartOf(src, idx) {
  return src.lastIndexOf('\n', idx - 1) + 1;
}

// Replace one chrome block in a page's source. Returns the new source.
function renderRegion(src, markerName, body, kindForLegacy) {
  const found = locate(src, markerName, kindForLegacy);
  if (!found) return null;
  const start = lineStartOf(src, found.anchor);
  const indent = (src.slice(start).match(/^[ \t]*/) || [''])[0];
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const block = markerBlock(markerName, body, indent, eol);
  return src.slice(0, start) + block + src.slice(found.end);
}

function buildPage(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error(`missing page: ${rel}`);
  let src = fs.readFileSync(file, 'utf8');

  if (Object.prototype.hasOwnProperty.call(NAV_PAGES, rel)) {
    const body = applyNavTokens(readPartial(NAV_PARTIAL), NAV_PAGES[rel]);
    const next = renderRegion(src, 'nav', body, 'nav');
    if (next === null) throw new Error(`${rel}: could not find a nav block to replace`);
    src = next;
  }

  if (Object.prototype.hasOwnProperty.call(FOOTER_PAGES, rel)) {
    const variant = FOOTER_PAGES[rel];
    const body = readPartial(FOOTER_PARTIALS[variant]);
    const next = renderRegion(src, 'footer', body, `footer-${variant}`);
    if (next === null) throw new Error(`${rel}: could not find a ${variant} footer block to replace`);
    src = next;
  }
  return src;
}

function main() {
  const check = process.argv.includes('--check');
  const pages = new Set([...Object.keys(NAV_PAGES), ...Object.keys(FOOTER_PAGES)]);
  const drifted = [];
  let written = 0;

  for (const rel of [...pages].sort()) {
    const file = path.join(ROOT, rel);
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const after = buildPage(rel);
    if (before === after) continue;
    if (check) {
      drifted.push(rel);
    } else {
      fs.writeFileSync(file, after);
      written++;
    }
  }

  if (check) {
    if (drifted.length) {
      console.error(`✗ ${drifted.length} page(s) out of date with partials:`);
      for (const p of drifted) console.error('  - ' + p);
      console.error('\nRun `npm run build:chrome` and commit the result.');
      process.exitCode = 1;
      return;
    }
    console.log(`✓ Shared chrome is up to date across ${pages.size} page(s).`);
    return;
  }
  console.log(`✓ Shared chrome built — ${written} page(s) updated, ${pages.size - written} already in sync.`);
}

main();
