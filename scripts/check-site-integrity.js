// ─────────────────────────────────────────────────────────────
// Site integrity checker — used as the PR deploy gate.
// Zero dependencies (plain Node). Exits 1 on any hard failure.
//
// Checks (hard-fail):
//   1. Every page with a mobile menu has EXACTLY one #navMobileMenu
//      (regression guard for the duplicate-menu bug).
//   2. og:image / twitter:image content pointing at backdoorco.xyz
//      resolves to a real file in the repo (e.g. og-image.png).
//   3. Every internal href to a *.html page resolves to a real file.
//   4. Every locally-referenced .css / .js asset exists.
//   5. Every locally-referenced image (products/*, etc.) exists.
//      Relative paths resolve against the page's folder, falling back
//      to the repo root (admin pages use ../products/...).
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.netlify', '.vercel', '.scratch', '.freebuff', 'netlify', 'portal', 'social-desk-portable']);
const IMG_RE = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;

function listHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      out.push(...listHtml(p));
    } else if (name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const issues = [];
function fail(msg) { issues.push(msg); }

for (const file of listHtml(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const dir = path.dirname(rel);
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch { fail(`${rel}: unreadable`); continue; }

  // 1. Exactly one mobile menu — only enforced on pages that carry the
  //    standard storefront navbar shell (hamburger + menu id). Legacy
  //    exports, 404, and admin-only pages intentionally differ.
  const menuCount = (src.match(/id="navMobileMenu"/g) || []).length;
  if (menuCount > 1) fail(`${rel}: ${menuCount} #navMobileMenu copies (dedupe broken)`);
  const hasNavbar = src.includes('id="navbar"') && src.includes('nav-hamburger');
  if (menuCount === 0 && hasNavbar) fail(`${rel}: missing #navMobileMenu`);

  // 2. OG / twitter images resolve
  const ogRe = /(?:og:image|twitter:image)[^>]*content="https:\/\/backdoorco\.xyz\/([^"]+)"/g;
  let m;
  while ((m = ogRe.exec(src))) {
    const target = m[1].split('?')[0];
    if (!fileExists(target)) fail(`${rel}: og:image → ${target} missing`);
  }

  // 3. Internal .html links (excludes external http(s)/mailto/tel URLs)
  const linkRe = /href="((?!https?:\/\/|mailto:|tel:)[^"#?]+\.html)(?:\?[^"]*)?"/g;
  while ((m = linkRe.exec(src))) {
    let target = m[1];
    const candidate = path.join(dir, target).replace(/\\/g, '/');
    if (!fileExists(candidate) && !fileExists(target)) fail(`${rel}: link → ${target} missing`);
  }

  // 4. Local css/js assets (excludes http(s), protocol-relative, data/mailto/tel)
  const assetRe = /(?:href|src)="((?!https?:\/\/|\/\/|data:|mailto:|tel:)[^"]+\.(?:css|js)(?:\?[^"]*)?)"/g;
  while ((m = assetRe.exec(src))) {
    const target = m[1].split('?')[0];
    if (target.startsWith('/') && target.startsWith('/__')) continue; // firebase auth proxy
    const clean = target.replace(/^\//, '');
    if (target.startsWith('/')) {
      if (!fileExists(clean)) fail(`${rel}: asset → ${target} missing`);
    } else {
      const candidate = path.join(dir, clean).replace(/\\/g, '/');
      if (!fileExists(candidate) && !fileExists(clean)) fail(`${rel}: asset → ${target} missing`);
    }
  }

  // 5. Local images (og:image handled separately; excludes http(s),
  //    protocol-relative, data/blob URIs, and mailto/tel)
  const imgRe = /(?:src|poster)="((?!https?:\/\/|\/\/|data:|blob:|mailto:|tel:)[^"]+)"/g;
  while ((m = imgRe.exec(src))) {
    const target = m[1].split('?')[0];
    if (!IMG_RE.test(target)) continue;
    if (target.startsWith('/')) {
      if (!fileExists(target.slice(1))) fail(`${rel}: image → ${target} missing`);
    } else {
      const candidate = path.join(dir, target).replace(/\\/g, '/');
      if (!fileExists(candidate) && !fileExists(target)) fail(`${rel}: image → ${target} missing`);
    }
  }
}

if (issues.length) {
  console.error(`✗ ${issues.length} integrity issue(s) found:\n`);
  for (const i of issues) console.error('  - ' + i);
  process.exit(1);
}
console.log('✓ Site integrity OK — all pages, menus, links, assets, and images resolve.');
