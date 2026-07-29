import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';

/**
 * Per-request context, propagated implicitly.
 *
 * The alternative — threading a request id through every function signature
 * from the route down to the DAO — means touching every layer to add one field,
 * and it breaks the moment something is called from a background job instead of
 * a request. AsyncLocalStorage carries the id across `await` boundaries without
 * the plumbing.
 *
 * The logger reads this in its `mixin`, so every line emitted while handling a
 * request carries the id automatically, including from code that has no idea
 * HTTP exists.
 */

const storage = new AsyncLocalStorage();

/** @returns {{requestId: string}|undefined} undefined outside a request. */
export const getRequestContext = () => storage.getStore();

export const getRequestId = () => storage.getStore()?.requestId;

/** Run `fn` with `context` attached to everything it awaits. */
export const runWithRequestContext = (context, fn) => storage.run(context, fn);

/**
 * Accept an inbound request id when a proxy or client supplies one, so a trace
 * survives across service boundaries; mint one otherwise.
 *
 * Inbound values are length-capped and character-restricted: the id is echoed
 * back in a response header and written into logs, so an unbounded attacker-
 * controlled string is both a log-injection vector and a way to bloat every
 * line of a log bill.
 */
export function normaliseRequestId(candidate) {
  if (typeof candidate === 'string') {
    const cleaned = candidate.trim().slice(0, 64);
    if (/^[\w.:-]+$/.test(cleaned)) return cleaned;
  }
  return crypto.randomUUID();
}

export default { getRequestContext, getRequestId, runWithRequestContext };
