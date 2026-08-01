// ─────────────────────────────────────────────────────────────
// One-off site hygiene script (safe to keep; reruns are no-ops)
//  1) Updates og:image references from og-image.jpg → og-image.png
//  2) Removes duplicate <div id="navMobileMenu"> blocks, keeping the
//     fullest menu (most brand filter links) and merging any
//     "active" classes found in the removed copies.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const SKIP_DIRS = new Set(['.scratch', 'node_modules', '.git', 'admin', 'netlify', 'portal', 'social-desk-portable', '.freebuff']);
const OG_OLD = 'https://backdoorco.xyz/og-image.jpg';
const OG_NEW = 'https://backdoorco.xyz/og-image.png';
const MENU_OPEN = '<div class="nav-mobile-menu" id="navMobileMenu">';
const MENU_RE = /<div class="nav-mobile-menu" id="navMobileMenu">[\s\S]*?<\/div>/g;

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

function countBrandLinks(block) {
  return (block.match(/shop-all\.html\?filter=/g) || []).length;
}

function mergeActive(kept, removed) {
  const activeHrefs = new Set();
  for (const r of removed) {
    const re = /class="nav-link active" href="([^"]+)"/g;
    let m;
    while ((m = re.exec(r))) activeHrefs.add(m[1]);
  }
  for (const href of activeHrefs) {
    if (kept.includes(`class="nav-link" href="${href}"`)) {
      kept = kept.replace(`class="nav-link" href="${href}"`, `class="nav-link active" href="${href}"`);
    }
  }
  return kept;
}

let ogFixed = 0;
let menuFixed = 0;

for (const file of listHtml(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  let changed = false;

  // 1) OG image reference
  if (src.includes(OG_OLD)) {
    src = src.split(OG_OLD).join(OG_NEW);
    ogFixed++;
    changed = true;
    console.log(`  og:image → png  ${rel}`);
  }

  // 2) Dedupe mobile menus
  const matches = [...src.matchAll(MENU_RE)];
  if (matches.length > 1) {
    // Keep the fullest menu (most brand links); fall back to first.
    let bestIdx = 0;
    for (let i = 1; i < matches.length; i++) {
      if (countBrandLinks(matches[i][0]) > countBrandLinks(matches[bestIdx][0])) bestIdx = i;
    }
    const kept = mergeActive(matches[bestIdx][0], matches.map((m, i) => i === bestIdx ? '' : m[0]).filter(Boolean));
    const start = matches[0].index;
    const end = matches[matches.length - 1].index + matches[matches.length - 1][0].length;
    src = src.slice(0, start) + kept + src.slice(end);
    menuFixed++;
    changed = true;
    console.log(`  nav menus ${matches.length} → 1  ${rel}`);
  }

  if (changed) fs.writeFileSync(file, src);
}

console.log(`\nDone. og:image refs fixed: ${ogFixed}, pages deduped: ${menuFixed}`);
