#!/usr/bin/env node
// Installs the repository's git hooks (currently just pre-commit).
//
// The hook itself lives in .git/hooks/pre-commit, which git does not track, so
// this installer writes a tiny shim that delegates to the tracked
// scripts/pre-commit-hotlinks.js. Re-run it after a fresh clone.
//
// Usage:
//   node scripts/install-git-hooks.js            # install (backs up a foreign hook)
//   node scripts/install-git-hooks.js --force    # overwrite an unrecognised hook
//   node scripts/install-git-hooks.js --uninstall

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HOOK_NAME = 'pre-commit';
// Identifies a hook this installer owns, so we never clobber someone else's.
const MARKER = 'check-image-hotlinks';
const BACKUP_SUFFIX = '.pre-hotlinks.bak';

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const UNINSTALL = args.has('--uninstall');

function resolveGitDir() {
    const result = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: ROOT, encoding: 'utf8' });
    if (result.status !== 0) {
        console.error('✗ Not a git repository (or git is unavailable) — nothing to install.');
        process.exit(1);
    }
    const dir = result.stdout.trim();
    return path.isAbsolute(dir) ? dir : path.resolve(ROOT, dir);
}

const hooksDir = path.join(resolveGitDir(), 'hooks');
const hookPath = path.join(hooksDir, HOOK_NAME);

if (UNINSTALL) {
    if (fs.existsSync(hookPath) && fs.readFileSync(hookPath, 'utf8').includes(MARKER)) {
        fs.rmSync(hookPath);
        console.log(`✓ Removed ${path.relative(ROOT, hookPath)}`);
    } else {
        console.log(`Nothing to remove — ${path.relative(ROOT, hookPath)} is not ours.`);
    }
    process.exit(0);
}

fs.mkdirSync(hooksDir, { recursive: true });

if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (!existing.includes(MARKER) && !FORCE) {
        console.error(`✗ A pre-commit hook already exists at ${path.relative(ROOT, hookPath)} and was not installed by this script.`);
        console.error(`  Re-run with --force to back it up to ${HOOK_NAME}${BACKUP_SUFFIX} and replace it.`);
        process.exit(1);
    }
    if (!existing.includes(MARKER) && FORCE) {
        const backup = `${hookPath}${BACKUP_SUFFIX}`;
        fs.copyFileSync(hookPath, backup);
        console.log(`  backed up existing hook to ${path.relative(ROOT, backup)}`);
    }
}

const shim = [
    '#!/bin/sh',
    `# Installed by scripts/install-git-hooks.js (marker: ${MARKER}).`,
    '# Blocks commits that introduce a third-party catalogue image hotlink.',
    'set -e',
    'ROOT=$(git rev-parse --show-toplevel)',
    'exec node "$ROOT/scripts/pre-commit-hotlinks.js"',
    '',
].join('\n');

fs.writeFileSync(hookPath, shim, { mode: 0o755 });
try {
    fs.chmodSync(hookPath, 0o755);
} catch {
    // Windows may not honour the mode; git still runs hooks via sh.
}

console.log(`✓ Installed ${path.relative(ROOT, hookPath)} — the hotlink guard now runs on every commit.`);
console.log('  Re-run this script after a fresh clone (git does not track hooks).');
