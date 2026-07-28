import { ChatMistralAI } from '@langchain/mistralai';
import { config } from '../config/config.js';
import logger from '../config/logger.js';

/**
 * Lazily-constructed Mistral client.
 *
 * This used to be a top-level `new ChatMistralAI(...)`, which THROWS when
 * MISTRAL_API_KEY is unset. Because incident.service imports this transitively,
 * a missing key for an optional AI feature made the entire monitoring core
 * fail to load — the scheduler, incidents and alerting all went down with it.
 * `config.js` has never treated the key as required, so the two disagreed and
 * the import-time throw won.
 *
 * AI enrichment is a nice-to-have on top of monitoring. It must degrade, never
 * cascade.
 */

let cached = null;

export const isAiConfigured = () => Boolean(config.MISTRAL_API_KEY);

/**
 * @returns {ChatMistralAI|null} null when AI is not configured — callers are
 *   expected to handle this and carry on.
 */
export function getMistralModel() {
  if (!isAiConfigured()) return null;
  if (cached) return cached;

  try {
    cached = new ChatMistralAI({
      model: 'mistral-medium-latest',
      apiKey: config.MISTRAL_API_KEY,
    });
    return cached;
  } catch (err) {
    logger.error(`[ai] Mistral client init failed: ${err.message}`);
    return null;
  }
}

export default { getMistralModel, isAiConfigured };
