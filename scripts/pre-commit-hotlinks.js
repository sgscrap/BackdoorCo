#!/usr/bin/env node
// Pre-commit gate: refuses to commit a third-party catalogue image hotlink.
//
// Invoked by the repository's pre-commit hook (see scripts/install-git-hooks.js).
// It scans only the files staged for this commit — not the whole tree — so a
// commit is blocked precisely when it would introduce an unmirrored image URL.
//
// The manifest dead-source check is skipped: a recorded dead source is catalogue
// health, not something the current commit is introducing.
//
// Run manually:
//   node scripts/pre-commit-hotlinks.js        # checks the staged files

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GUARD = path.join(__dirname, 'check-image-hotlinks.js');

// Extensions the guard can meaningfully scan for image URLs.
const SCAN_EXT = /\.(html?|js|mjs|cjs|css|json|md|txt)$/i;

function git(args) {
    return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

// Files added/copied/modified/renamed in the index (not deleted).
const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
if (staged.status !== 0) {
    // Never block a commit because git itself failed to answer.
    console.warn('pre-commit: could not read staged files — skipping hotlink check.');
    process.exit(0);
}

const files = staged.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((rel) => SCAN_EXT.test(rel))
    .filter((rel) => fs.existsSync(path.join(ROOT, rel)));

if (!files.length) {
    console.log('pre-commit: no scannable staged files — image hotlink check skipped.');
    process.exit(0);
}

// The guard splits --files on commas; routed through the guard so the hook and
// `npm test` share exactly one definition of "hotlink".
const result = spawnSync(
    process.execPath,
    [GUARD, '--no-manifest', '--files', files.join(',')],
    { cwd: ROOT, stdio: 'inherit' }
);

if (result.status !== 0) {
    console.error('\npre-commit blocked: the staged files introduce a third-party catalogue image hotlink.');
    console.error('  Auto-fix:  node scripts/check-image-hotlinks.js --fix --files ' + files.join(','));
    console.error('  Or add a manual alias in products/catalog/aliases.manual.json.');
    process.exit(1);
}

console.log('pre-commit: image hotlink check passed.');
