#!/usr/bin/env node
/**
 * Install Frontend dependencies only if they are actually missing, then get out
 * of the way.
 *
 * Why this exists: `npm run build` at the root is just `vite build` in Frontend,
 * which dies with "vite: not found" if nobody ran an install first. A deployment
 * whose build command is `npm run build` therefore produces no bundle, the
 * server has nothing to serve, and the symptom surfaces far from the cause. That
 * is precisely how the Render deployment ended up returning `Cannot GET /`.
 *
 * Why it is conditional rather than an unconditional `npm install`:
 *   - CI already runs `npm ci` before building. Reinstalling there would add
 *     roughly a minute to every run for no benefit.
 *   - `npm install` can rewrite package-lock.json. Doing that mid-build means CI
 *     builds something subtly different from what the lockfile pins, which is
 *     the lockfile drift this repo has been bitten by before.
 *
 * So: no-op when deps are present, `npm ci` when they are not. `ci` rather than
 * `install` because it is reproducible and never touches the lockfile.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'Frontend');

// Probe for the binary the build actually invokes, not just node_modules/. A
// directory left half-populated by an interrupted install would otherwise pass.
const viteBin = path.join(
  frontend,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite'
);

if (existsSync(viteBin)) {
  process.exit(0);
}

const hasLockfile = existsSync(path.join(frontend, 'package-lock.json'));
const args = hasLockfile
  ? ['ci', '--no-audit', '--no-fund']
  : ['install', '--no-audit', '--no-fund'];

console.log(
  `[build] Frontend dependencies not found — running "npm ${args[0]}" in Frontend/.`
);

const result = spawnSync('npm', ['--prefix', frontend, ...args], {
  stdio: 'inherit',
  // npm is a shell script on Windows; without a shell, spawn fails with ENOENT.
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error(
    '[build] Failed to install Frontend dependencies. The SPA bundle cannot be built.'
  );
  process.exit(result.status ?? 1);
}
