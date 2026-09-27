#!/usr/bin/env node
/**
 * scripts/verify-readme.js
 *
 * Walks every file / directory path mentioned in README.md + CONTRIBUTING.md
 * (or any docs passed via --files=…) and reports any that are missing on disk.
 * Designed to run in CI: exits 0 if all referenced paths resolve, 1 otherwise.
 *
 * Usage:
 *   node scripts/verify-readme.js
 *   node scripts/verify-readme.js --files=README.md,CONTRIBUTING.md
 *   node scripts/verify-readme.js --allowlist=.verify-readme-allow.json
 *   node scripts/verify-readme.js --json
 *
 * Zero external deps. Node 18+.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────

const FILE_EXTS = new Set([
  'html', 'js', 'css', 'json', 'md', 'yml', 'yaml',
  'toml', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'ico',
  'py', 'ps1', 'rules', 'lock',
]);

const KNOWN_DOTFILES = new Set([
  '.gitignore', '.netlifyignore', '.env', '.env.local',
  '.env.local.example', '.npm-cache', '.github',
]);

const DEFAULT_FILES = ['README.md', 'CONTRIBUTING.md'];

// Brand names mentioned in the navbar dropdowns (NOT paths).
const KNOWN_BRANDS = new Set([
  'Burberry', 'Moncler', 'Fendi',
  'Jordan', 'Nike', 'Prada', 'Dior', 'LOEWE',
  'Adidas', 'New', 'Balance', 'Yeezy', 'Acne', 'Studios',
  'Godspeed', 'NOCTA',
]);

// Subdirectories we re-try under when a candidate can't be found at root.
// Handles directory-tree visualisation duplicates (e.g. README shows "│
//   ├── dashboard.js" under the admin/ block, then again as bare).
const RESOLUTION_PREFIXES = [
  'admin/',
  'netlify/functions/',
  'netlify/functions/_shared/',
  'scripts/',
  'skills/',
];

// Strings that look like paths but are really runtime URLs, libraries, or
// branch examples. Filtered out early so they never reach the disk check.
const NON_PATH_TOKENS = new Set([
  'Node.js',
  'Chart.js',
  'Stripe',
  'PayPal',
  'Express',
  'Firebase',
  'Firestore',
]);

// Branch-style prefixes that appear in CONTRIBUTING.md examples.
const BRANCH_PREFIXES = ['feat/', 'fix/', 'chore/', 'docs/', 'seed/'];

// ── CLI ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const f = args.find(a => a.startsWith(`--${name}=`));
  return f ? f.split('=').slice(1).join('=') : fallback;
};
const hasFlag = name => args.includes(`--${name}`);

const docFiles = flag('files', DEFAULT_FILES.join(','))
  .split(',').map(s => s.trim()).filter(Boolean);
const allowlistPath = flag('allowlist', '.verify-readme-allow.json');
const asJson = hasFlag('json');
const repoRoot = path.resolve(flag('root', process.cwd()));

// ── Allowlist ───────────────────────────────────────────────────────────

const allowlist = new Set();
function loadAllowlist() {
  if (!fs.existsSync(path.join(repoRoot, allowlistPath))) return;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(repoRoot, allowlistPath), 'utf8'));
    for (const p of (data.ignorePaths || [])) allowlist.add(p);
  } catch (err) {
    console.error(`warn: could not parse ${allowlistPath}: ${err.message}`);
  }
}

// ── Path extraction ─────────────────────────────────────────────────────

/**
 * Pull every candidate path-like string out of a Markdown file.
 * Conservative about what counts as a "path" so false positives stay low.
 */
function extractCandidates(text) {
  const candidates = new Set();

  // Inline code: `admin/products.html`
  const inline = text.matchAll(/`([A-Za-z0-9_./\-{}\\*]+)`/g);
  for (const m of inline) candidates.add(m[1]);

  // Link target: [label](admin/products.html)
  const linked = text.matchAll(/\]\(([^)\s]+)\)/g);
  for (const m of linked) candidates.add(m[1]);

  // Bare file with extension (heuristic — keep conservative)
  const bareFiles = text.matchAll(
    /(?<![A-Za-z0-9_/.])([A-Za-z0-9_./\-]+\.[A-Za-z]{2,5})(?![A-Za-z0-9_/.])/g
  );
  for (const m of bareFiles) candidates.add(m[1]);

  // Bare directory (ends in /)
  const bareDirs = text.matchAll(/(?<![\w./-])([A-Za-z0-9_./-]+\/)(?=[\s`'"*]|$)/g);
  for (const m of bareDirs) candidates.add(m[1]);

  return candidates;
}

// ── Filter path-shaped noise out of the candidate set ───────────────────

function isLikelyPath(raw) {
  if (!raw) return false;
  const p = raw.replace(/^[`"']+|[`"']+$/g, '').trim();
  if (!p) return false;

  // ── Strong "not-a-path" signals ─────────────────────────────────────
  if (NON_PATH_TOKENS.has(p)) return false;

  // Markdown / glob / placeholder artefacts
  if (p.includes('*') || p.includes('?')) return false;
  if (p.includes('{') || p.includes('}')) return false;       // products/{productId}

  // Runtime URLs (frontend paths, redirects /api/products, /__/auth/, /admin/)
  if (p.startsWith('/')) return false;

  // Domains (github.com/..., ebay.com/..., sgscrap/BackdoorCo has two segs)
  // — anything shaped like host.tld/path
  if (/^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(p)) return false;

  // URL components
  if (p.startsWith('http') || p.includes('://')) return false;
  if (p.startsWith('//')) return false;
  if (p.includes('@') && !p.startsWith('.') && !p.startsWith('~')) return false;

  // Version numbers (9.23.0, 10.7.0, v2.4)
  if (/^\d+(\.\d+)+$/.test(p)) return false;

  // Git branch style: feat/<slug>, fix/<slug>, etc.
  if (BRANCH_PREFIXES.some(bp => p.startsWith(bp))) return false;

  // Bare words with no slash and no extension — usually code/brand/env vars
  const isBareWord = !p.includes('/') && !KNOWN_DOTFILES.has(p.split('/')[0]) &&
                     !p.startsWith('.') && !p.endsWith('/') && !/\.[a-z]{2,5}$/i.test(p);
  if (isBareWord) {
    if (KNOWN_BRANDS.has(p)) return false;
    if (/^[A-Z][A-Z0-9_]+$/.test(p)) return false;            // env var style: STRIPE_SECRET_KEY
    return false;
  }

  // ── Looks like a path ──────────────────────────────────────────────
  const firstSegment = p.split('/')[0];
  if (KNOWN_DOTFILES.has(p) || KNOWN_DOTFILES.has(firstSegment)) return true;
  if (p.endsWith('/')) return true;

  const ext = p.split('.').pop();
  if (FILE_EXTS.has(ext.toLowerCase())) return true;

  // Path with a slash but no ext — could be a folder (e.g. "admin" in a list)
  if (p.includes('/') && p.length > 2) return true;

  return false;
}

// ── Disk check (with multi-prefix fallback) ──────────────────────────────

/**
 * Returns: { kind: 'file'|'dir'|'missing'|'wrong-kind',
 *             actual?: string, resolvedAs?: string }
 * Multi-prefix resolution means a candidate like "dashboard.js" (which the
 * README references bare once and under admin/ once) still resolves.
 */
function checkOnDisk(relPath) {
  const tries = [relPath, ...RESOLUTION_PREFIXES.map(pfx => pfx + relPath)];
  for (const candidate of tries) {
    const abs = path.join(repoRoot, candidate);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (candidate.endsWith('/')) {
      if (stat.isDirectory()) return { kind: 'dir', resolvedAs: candidate };
      continue;
    }
    if (stat.isFile()) return { kind: 'file', resolvedAs: candidate };
  }
  // Last-ditch: case-insensitive walk
  const ci = findCaseInsensitive(relPath);
  if (ci) return { kind: 'wrong-kind', actual: ci };
  return { kind: 'missing' };
}

function findCaseInsensitive(relPath) {
  const parts = relPath.split('/');
  let dir = repoRoot;
  for (let i = 0; i < parts.length; i++) {
    const target = parts[i];
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir);
    const hit = entries.find(e => e.toLowerCase() === target.toLowerCase());
    if (!hit) return null;
    if (hit !== target && i === parts.length - 1) {
      return parts.slice(0, i).concat(hit).join('/');
    }
    dir = path.join(dir, hit);
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  loadAllowlist();

  let totalRefs = 0;
  let found = 0;
  const missing = [];
  const wrongKind = [];
  const resolvedElsewhere = [];

  for (const relDoc of docFiles) {
    const absDoc = path.join(repoRoot, relDoc);
    if (!fs.existsSync(absDoc)) {
      console.error(`error: doc file not found: ${relDoc}`);
      process.exit(2);
    }
    const text = fs.readFileSync(absDoc, 'utf8');
    const candidates = extractCandidates(text);

    for (const cand of candidates) {
      if (!isLikelyPath(cand)) continue;
      if (allowlist.has(cand)) continue;

      totalRefs++;
      const result = checkOnDisk(cand);
      if (result.kind === 'file' || result.kind === 'dir') {
        found++;
        if (result.resolvedAs && result.resolvedAs !== cand) {
          resolvedElsewhere.push({ source: relDoc, asked: cand, resolvedAs: result.resolvedAs });
        }
      } else if (result.kind === 'missing') {
        missing.push({ source: relDoc, path: cand });
      } else if (result.kind === 'wrong-kind') {
        wrongKind.push({ source: relDoc, path: cand, actual: result.actual });
      }
    }
  }

  if (asJson) {
    console.log(JSON.stringify({
      repoRoot,
      totalRefs,
      found,
      missing,
      wrongKind,
      resolvedElsewhere,
    }, null, 2));
  } else {
    console.log(`verify-readme: scanned ${docFiles.length} doc(s), checked ${totalRefs} path ref(s).`);
    console.log(`  ✓ found:    ${found}`);
    if (resolvedElsewhere.length) {
      console.log(`    ↳ resolved under alternate prefix: ${resolvedElsewhere.length}`);
    }
    console.log(`  ✗ missing:  ${missing.length}`);
    console.log(`  ⚠ wrong:    ${wrongKind.length}`);

    if (missing.length) {
      console.log('\nMissing paths:');
      for (const m of missing) {
        console.log(`  ::error file=${m.source}::referenced path missing on disk: ${m.path}`);
        console.log(`     - ${m.path}  (from ${m.source})`);
      }
    }
    if (wrongKind.length) {
      console.log('\nKind mismatches (exists but not the expected file/dir):');
      for (const w of wrongKind) {
        console.log(`  - ${w.path}  (from ${w.source}) — disk has: ${w.actual}`);
      }
    }
    if (resolvedElsewhere.length) {
      console.log('\nResolved under alternate prefix (informational):');
      for (const r of resolvedElsewhere) {
        console.log(`  - ${r.asked}  -> ${r.resolvedAs}  (from ${r.source})`);
      }
    }
    if (!missing.length && !wrongKind.length) {
      console.log('\nAll referenced paths resolve. ✅');
    }
  }

  if (missing.length || wrongKind.length) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(`verify-readme: unexpected error: ${err.stack || err.message}`);
  process.exit(2);
}
