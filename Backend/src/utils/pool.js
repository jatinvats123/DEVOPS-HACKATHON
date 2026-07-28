/**
 * Bounded-concurrency task runner.
 *
 * Replaces an uncapped `Promise.all(monitors.map(...))`, which issued one
 * simultaneous HTTP request per monitor in the entire database — fine with ten
 * monitors, a self-inflicted outage with ten thousand.
 *
 * Hand-rolled rather than pulling in `p-limit`: it is fifteen lines, and a
 * scheduler's concurrency control is not somewhere to add a supply-chain
 * dependency.
 *
 * Tasks never reject — each is wrapped so one failure cannot abort the batch
 * the way `Promise.all` would.
 *
 * @param {Array<() => Promise<any>>} tasks
 * @param {number} limit max concurrent tasks
 * @returns {Promise<Array<{ok: boolean, value?: any, error?: Error}>>}
 */
export async function runPool(tasks, limit) {
  const results = new Array(tasks.length);
  const width = Math.max(1, Math.min(limit, tasks.length));
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { ok: true, value: await tasks[index]() };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  }

  await Promise.all(Array.from({ length: width }, worker));
  return results;
}

export default runPool;
