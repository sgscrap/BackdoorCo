#!/usr/bin/env node
// Diff two prepared Instagram rollouts so a generated plan can be reviewed
// against the curated one before it is promoted.
//
//   generator ──▶ admin/instagram-rollout.generated.prepared.json
//                        │
//                        ├── diff against ──▶ admin/instagram-rollout.prepared.json
//
// Assets are matched by a stable identity (see --key) rather than by array
// position, and each match is compared field by field, so the report answers
// "what would change if I promoted this plan?".
//
// Usage:
//   node scripts/diff-rollouts.js                       # curated vs generated
//   node scripts/diff-rollouts.js <base.json> <head.json>
//   node scripts/diff-rollouts.js --base <path> --head <path>
//   node scripts/diff-rollouts.js --key id              # match by asset id
//   node scripts/diff-rollouts.js --json                # machine-readable report
//   node scripts/diff-rollouts.js --fail-on-change      # exit 1 when anything differs
//
// --key modes:
//   product  (default) product id + template; product-less assets use
//                      template + carousel group — the useful view when comparing
//                      two plans that do not share asset ids.
//   id                 asset id (strict identity).
//   filename           export filename.
//   template           template only.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_BASE = path.join('admin', 'instagram-rollout.prepared.json');
const DEFAULT_HEAD = path.join('admin', 'instagram-rollout.generated.prepared.json');

const KEY_MODES = new Set(['product', 'id', 'filename', 'template']);

// ── Identity ────────────────────────────────────────────────────────────────
function assetProductId(asset) {
  return String(asset?.product?.id || asset?.productRef || '').trim();
}

/** The matching identity for an asset under a given mode. */
function assetKey(asset, mode = 'product') {
  const source = asset && typeof asset === 'object' ? asset : {};
  const template = String(source.template || '');
  if (mode === 'id') return `id:${String(source.id || '')}`;
  if (mode === 'filename') return `filename:${String(source.filename || '')}`;
  if (mode === 'template') return `template:${template}`;
  const productId = assetProductId(source);
  if (productId) return `product:${productId}|${template}`;
  return `template:${template}|${String(source.carouselGroup || '')}`;
}

/** Map a rollout's assets by key, disambiguating duplicate keys with #2, #3… */
function keyAssets(assets, mode) {
  const map = new Map();
  const counts = new Map();
  for (const asset of Array.isArray(assets) ? assets : []) {
    const base = assetKey(asset, mode);
    const seen = (counts.get(base) || 0) + 1;
    counts.set(base, seen);
    map.set(seen === 1 ? base : `${base}#${seen}`, asset);
  }
  return map;
}

// ── Field comparison ────────────────────────────────────────────────────────
// Every studio-visible attribute, flattened so a change is reported by name.
const FIELD_GETTERS = {
  template: (a) => a.template,
  ratio: (a) => a.ratio,
  theme: (a) => a.theme,
  preset: (a) => a.preset,
  carouselGroup: (a) => a.carouselGroup,
  product: (a) => assetProductId(a),
  filename: (a) => a.filename,
  kicker: (a) => a.copy?.kicker,
  headline: (a) => a.copy?.headline,
  body: (a) => a.copy?.body,
  badge: (a) => a.copy?.badge,
  cta: (a) => a.copy?.cta,
  promo: (a) => a.copy?.promo,
  showPrice: (a) => a.toggles?.showPrice,
  showSizes: (a) => a.toggles?.showSizes,
  visitSite: (a) => a.toggles?.visitSite,
  visitSiteUrl: (a) => a.toggles?.visitSiteUrl,
  imageFilter: (a) => a.effects?.imageFilter,
  blur: (a) => a.effects?.blur,
  watermark: (a) => a.effects?.watermark,
  grain: (a) => a.effects?.grain,
  imageOverride: (a) => a.imageOverride,
  caption: (a) => a.caption,
  hashtags: (a) => (Array.isArray(a.hashtags) ? a.hashtags.join(' ') : a.hashtags),
  postAt: (a) => a.schedule?.postAt || null,
};

function normalize(value) {
  if (value == null) return '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return String(value);
}

/** Field-level differences between two matched assets. */
function compareAssets(base, head) {
  const fields = {};
  for (const [name, get] of Object.entries(FIELD_GETTERS)) {
    const from = normalize(get(base));
    const to = normalize(get(head));
    if (from !== to) fields[name] = { from, to };
  }
  return fields;
}

// ── Diff ────────────────────────────────────────────────────────────────────
function descriptor(asset) {
  return {
    id: String(asset?.id || ''),
    template: String(asset?.template || ''),
    filename: String(asset?.filename || ''),
    product: assetProductId(asset) || null,
  };
}

/**
 * Diff two rollouts. `base` is the current (curated) plan, `head` the proposed
 * (generated) one. Returns added / removed / changed / unchanged collections
 * keyed by identity.
 */
function diffRollouts(base = {}, head = {}, options = {}) {
  const mode = KEY_MODES.has(options.key) ? options.key : 'product';
  const baseAssets = Array.isArray(base.assets) ? base.assets : [];
  const headAssets = Array.isArray(head.assets) ? head.assets : [];
  const baseByKey = keyAssets(baseAssets, mode);
  const headByKey = keyAssets(headAssets, mode);

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const [key, asset] of headByKey) {
    if (!baseByKey.has(key)) added.push({ key, ...descriptor(asset) });
  }
  for (const [key, asset] of baseByKey) {
    if (!headByKey.has(key)) removed.push({ key, ...descriptor(asset) });
  }
  for (const [key, headAsset] of headByKey) {
    const baseAsset = baseByKey.get(key);
    if (!baseAsset) continue;
    const fields = compareAssets(baseAsset, headAsset);
    if (Object.keys(fields).length) {
      changed.push({
        key,
        from: descriptor(baseAsset),
        to: descriptor(headAsset),
        fields,
      });
    } else {
      unchanged.push(key);
    }
  }

  return {
    key: mode,
    base: { campaign: String(base.campaign || ''), assets: baseAssets.length },
    head: { campaign: String(head.campaign || ''), assets: headAssets.length },
    added,
    removed,
    changed,
    unchanged,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
      base: baseAssets.length,
      head: headAssets.length,
    },
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const VALUE_FLAGS = new Set(['--base', '--head', '--key']);

// Split argv into flags and bare positional paths, so a flag value (--key id)
// is never mistaken for an input file.
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (VALUE_FLAGS.has(arg)) {
      flags[arg] = argv[i + 1] ?? '';
      i++;
    } else if (arg.startsWith('-')) {
      flags[arg] = true;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function renderText(diff) {
  const lines = [];
  const rel = (p) => path.relative(ROOT, path.resolve(ROOT, p)) || p;
  lines.push('Instagram rollout diff');
  lines.push(`  base: ${rel(diff._basePath)}  (${diff.base.assets} assets)`);
  lines.push(`  head: ${rel(diff._headPath)}  (${diff.head.assets} assets)`);
  lines.push(`  matched by: ${diff.key}`);
  lines.push('');

  const describe = (entry) => {
    const bits = [entry.id || '(no id)', entry.template];
    if (entry.product) bits.push(entry.product);
    return bits.filter(Boolean).join('  ·  ');
  };

  lines.push(`Added (${diff.added.length}):`);
  for (const entry of diff.added) lines.push(`  + ${describe(entry)}`);
  if (!diff.added.length) lines.push('  (none)');
  lines.push('');

  lines.push(`Removed (${diff.removed.length}):`);
  for (const entry of diff.removed) lines.push(`  - ${describe(entry)}`);
  if (!diff.removed.length) lines.push('  (none)');
  lines.push('');

  lines.push(`Changed (${diff.changed.length}):`);
  for (const entry of diff.changed) {
    lines.push(`  ~ ${entry.to.id || entry.key}  (${entry.to.template})`);
    for (const [name, delta] of Object.entries(entry.fields)) {
      lines.push(`      ${name}: ${JSON.stringify(delta.from)} -> ${JSON.stringify(delta.to)}`);
    }
  }
  if (!diff.changed.length) lines.push('  (none)');
  lines.push('');

  const { added, removed, changed, unchanged } = diff.summary;
  lines.push(`Summary: ${added} added, ${removed} removed, ${changed} changed, ${unchanged} unchanged`);
  return lines.join('\n');
}

function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv);

  if (flags['--help'] || flags['-h']) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 30).join('\n').replace(/^\/\/ ?/gm, ''));
    return 0;
  }

  const basePath = flags['--base'] || positional[0] || DEFAULT_BASE;
  const headPath = flags['--head'] || positional[1] || DEFAULT_HEAD;
  const mode = flags['--key'] || 'product';
  const asJson = Boolean(flags['--json']);
  const failOnChange = Boolean(flags['--fail-on-change']);

  if (!KEY_MODES.has(mode)) {
    console.error(`Unknown --key "${mode}" (expected one of: ${[...KEY_MODES].join(', ')})`);
    return 1;
  }

  let base;
  let head;
  try {
    base = readJson(path.resolve(ROOT, basePath));
    head = readJson(path.resolve(ROOT, headPath));
  } catch (err) {
    console.error(`Could not read rollout: ${err.message}`);
    return 1;
  }

  const diff = diffRollouts(base, head, { key: mode });
  diff._basePath = basePath;
  diff._headPath = headPath;

  if (asJson) {
    console.log(JSON.stringify({ ok: true, ...diff }, null, 2));
  } else {
    console.log(renderText(diff));
  }

  const differs = diff.summary.added + diff.summary.removed + diff.summary.changed > 0;
  return failOnChange && differs ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { assetKey, keyAssets, compareAssets, diffRollouts, FIELD_GETTERS };
