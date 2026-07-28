#!/usr/bin/env node
/**
 * Generate a shields.io endpoint badge from the real coverage summary.
 *
 * The number in the README is therefore produced by the same run that enforces
 * the gate — it cannot drift from reality the way a hand-written badge does.
 * CI refreshes it on main; the jest coverageThreshold guarantees it can never
 * silently fall below the stated floor in between.
 *
 * Usage: node scripts/coverage-badge.mjs [summary.json] [out.json]
 */

import fs from 'node:fs';
import path from 'node:path';

const summaryPath = process.argv[2] ?? 'Backend/coverage/coverage-summary.json';
const outPath = process.argv[3] ?? '.github/badges/coverage.json';

if (!fs.existsSync(summaryPath)) {
  console.error(
    `No coverage summary at ${summaryPath}. Run: npm run test:coverage --prefix Backend`
  );
  process.exit(1);
}

const { total } = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const pct = total.statements.pct;

// Thresholds chosen so the colour changes at the numbers that actually mean
// something here: 60 is the enforced gate, below it CI is already failing.
const colour =
  pct >= 90
    ? 'brightgreen'
    : pct >= 75
      ? 'green'
      : pct >= 60
        ? 'yellow'
        : 'red';

const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${pct}%`,
  color: colour,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(badge, null, 2)}\n`);

console.log(
  `coverage badge: ${pct}% statements (${colour}) -> ${outPath}\n` +
    `  branches ${total.branches.pct}% | functions ${total.functions.pct}% | lines ${total.lines.pct}%`
);
