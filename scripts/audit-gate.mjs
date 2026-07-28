#!/usr/bin/env node
/**
 * Dependency vulnerability gate.
 *
 * `npm audit --audit-level=high` is the obvious CI gate and it has one fatal
 * flaw: it is all-or-nothing. A single advisory that genuinely does not apply
 * to how the code is used leaves a team with two bad options — disable the gate
 * entirely, or leave CI permanently red until people stop reading it. Both end
 * with nobody looking at dependency advisories.
 *
 * So this wraps `npm audit --json` and fails on high/critical EXCEPT for
 * advisories that are explicitly allowlisted below, each with a written
 * justification and a review date. An exception you have to argue for in a
 * committed file is a very different thing from a disabled check.
 *
 * Usage:  node scripts/audit-gate.mjs <package-dir> [...]
 * Exits non-zero if any non-allowlisted high/critical advisory is found, or if
 * an allowlist entry is past its review date.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);

const BLOCKING = new Set(['high', 'critical']);

/**
 * Advisories accepted as not-applicable.
 *
 * Every entry must state WHY it does not apply to this codebase and carry a
 * `reviewBy` date. Past that date the gate fails, which forces a re-read rather
 * than letting an exception quietly become permanent.
 */
const ALLOWLIST = [
  {
    package: 'react-router',
    advisory: 'GHSA-qwww-vcr4-c8h2',
    title:
      'React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response',
    reviewBy: '2026-10-31',
    reason: [
      'The advisory affects React Router RSC (React Server Components) mode.',
      'WatchTower is a client-only SPA: it uses createBrowserRouter +',
      'RouterProvider with no server rendering, no server actions and no RSC',
      'APIs anywhere in Frontend/src (verified by grep for unstable_*,',
      'matchRSCServerRequest and createStaticHandler). The vulnerable code path',
      'is not reachable.',
      '',
      'The fix is react-router 8.x, which requires Node >= 22.22.0. Adopting it',
      'would drop Node 20 support, which the CI matrix and the runtime base',
      'image both target. That is a larger regression than the risk being',
      'carried, so it is deferred to the Node 22 baseline migration.',
    ].join(' '),
  },
];

const allowlistFor = (pkg, ids) =>
  ALLOWLIST.find(
    (entry) =>
      entry.package === pkg &&
      (ids.includes(entry.advisory) || ids.length === 0)
  );

/** npm audit exits non-zero when it finds anything, so failure is expected. */
async function auditJson(dir) {
  try {
    // Windows cannot spawn npm's .cmd shim without a shell. Node warns that
    // shell:true concatenates rather than escapes arguments — irrelevant here,
    // because every argument is a hardcoded literal and `dir` is passed as cwd
    // rather than interpolated into the command line.
    const { stdout } = await run('npm', ['audit', '--json'], {
      cwd: dir,
      shell: process.platform === 'win32',
      maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

/** Collect GHSA ids from an advisory's `via` chain. */
function advisoryIds(vuln) {
  return (vuln.via || [])
    .filter((v) => typeof v === 'object' && v.url)
    .map((v) => v.url.split('/').pop())
    .filter(Boolean);
}

async function gate(dir) {
  const label = path.basename(path.resolve(dir));
  const report = await auditJson(dir);
  const vulns = Object.values(report.vulnerabilities || {});

  const blocking = [];
  const excused = [];

  for (const vuln of vulns) {
    if (!BLOCKING.has(vuln.severity)) continue;

    const ids = advisoryIds(vuln);
    const entry = allowlistFor(vuln.name, ids);

    if (entry) excused.push({ vuln, entry, ids });
    else blocking.push({ vuln, ids });
  }

  console.log(`\n=== ${label} ===`);
  const counts = report.metadata?.vulnerabilities ?? {};
  console.log(
    `  total: ${counts.total ?? 0} (critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, moderate ${counts.moderate ?? 0}, low ${counts.low ?? 0})`
  );

  let expired = false;
  for (const { vuln, entry } of excused) {
    const overdue = new Date(entry.reviewBy) < new Date();
    if (overdue) expired = true;
    console.log(
      `  ${overdue ? 'EXPIRED ' : 'allowed '} ${vuln.severity.padEnd(8)} ${vuln.name} (${entry.advisory}, review by ${entry.reviewBy})`
    );
  }

  for (const { vuln, ids } of blocking) {
    console.log(
      `  BLOCKING ${vuln.severity.padEnd(8)} ${vuln.name} ${ids.join(', ')}`
    );
    (vuln.via || [])
      .filter((v) => typeof v === 'object')
      .forEach((v) => console.log(`             ${v.title}`));
  }

  if (expired) {
    console.log(
      `  ✗ an allowlist entry is past its review date — re-assess it or extend it deliberately`
    );
  }
  if (blocking.length === 0 && !expired) {
    console.log('  ✓ no blocking advisories');
  }

  return blocking.length === 0 && !expired;
}

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error('usage: node scripts/audit-gate.mjs <package-dir> [...]');
  process.exit(2);
}

const results = [];
for (const dir of dirs) results.push(await gate(dir));

const ok = results.every(Boolean);
console.log(
  ok ? '\nDependency audit gate: PASS\n' : '\nDependency audit gate: FAIL\n'
);
process.exit(ok ? 0 : 1);
