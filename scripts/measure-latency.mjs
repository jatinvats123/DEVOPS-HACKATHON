#!/usr/bin/env node
/**
 * API latency baseline.
 *
 * Measures p50/p95/p99 against a running stack so the numbers in
 * docs/PRODUCTION-READINESS.md are measured rather than asserted.
 *
 * This is a BASELINE, not a load test. It runs a modest number of sequential
 * requests against a warm process to characterise per-request latency and catch
 * regressions. It says nothing about throughput under concurrency or about
 * production hardware, and the document says so.
 *
 *   docker compose up -d --build
 *   node scripts/measure-latency.mjs [baseUrl] [samples]
 */

const BASE = process.argv[2] || 'http://localhost:8000';
const SAMPLES = Number(process.argv[3]) || 200;
const WARMUP = 20;

/** Percentile by nearest-rank — no interpolation, so every value is a real observation. */
const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

async function register() {
  const suffix = Date.now().toString(36);
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `latency${suffix}`,
      fullname: 'Latency Probe',
      email: `latency${suffix}@example.test`,
      password: 'correct-horse-battery',
    }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status}`);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

async function seed(cookie, count = 5) {
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const res = await fetch(`${BASE}/api/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        url: `https://seed-${i}-${Date.now().toString(36)}.example.test`,
        title: `Latency seed ${i}`,
      }),
    });
    if (res.ok) ids.push((await res.json()).data._id);
  }
  return ids;
}

async function measure(label, url, cookie) {
  const durations = [];
  let failures = 0;

  for (let i = 0; i < SAMPLES + WARMUP; i += 1) {
    const startedAt = process.hrtime.bigint();
    try {
      const res = await fetch(
        url,
        cookie ? { headers: { Cookie: cookie } } : {}
      );
      // Drain the body: a request is not finished until its response is read,
      // and timing only the headers would flatter every number here.
      await res.arrayBuffer();
      if (!res.ok) failures += 1;
    } catch {
      failures += 1;
    }
    // Discard warm-up: the first requests pay JIT, connection setup and
    // Mongoose model compilation, which is not what steady-state latency means.
    if (i >= WARMUP) {
      durations.push(Number(process.hrtime.bigint() - startedAt) / 1e6);
    }
  }

  durations.sort((a, b) => a - b);
  return {
    label,
    n: durations.length,
    failures,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    max: durations[durations.length - 1],
  };
}

const health = await fetch(`${BASE}/api/health`).catch(() => null);
if (!health?.ok) {
  console.error(
    `No healthy stack at ${BASE}. Run: docker compose up -d --build`
  );
  process.exit(1);
}

const cookie = await register();
const [monitorId] = await seed(cookie);

const results = [];
results.push(await measure('GET /api/health', `${BASE}/api/health`));
results.push(
  await measure('GET /api/health/ready', `${BASE}/api/health/ready`)
);
results.push(await measure('GET /api/monitor', `${BASE}/api/monitor`, cookie));
results.push(
  await measure('GET /api/incidents', `${BASE}/api/incidents`, cookie)
);
if (monitorId) {
  results.push(
    await measure(
      'GET /api/metrics/uptime/:id',
      `${BASE}/api/metrics/uptime/${monitorId}`,
      cookie
    )
  );
}

const fmt = (n) => `${n.toFixed(1)} ms`;

console.log(
  `\nBase: ${BASE} · ${SAMPLES} samples each (${WARMUP} warm-up discarded)\n`
);
console.log(
  '| Endpoint | p50 | p95 | p99 | max | errors |\n|---|---:|---:|---:|---:|---:|'
);
for (const r of results) {
  console.log(
    `| \`${r.label}\` | ${fmt(r.p50)} | ${fmt(r.p95)} | ${fmt(r.p99)} | ${fmt(r.max)} | ${r.failures} |`
  );
}

const worst = results.reduce((a, b) => (b.p95 > a.p95 ? b : a));
console.log(`\nWorst p95: ${worst.label} at ${fmt(worst.p95)}\n`);
