import { notifierRegistry, IncidentEvent } from './notifier.js';
import { emailNotifier } from './email.notifier.js';
import { webhookNotifier } from './webhook.notifier.js';

/**
 * Wire the default notifiers.
 *
 * Adding a channel (PagerDuty, SMS, Discord) means writing one module and
 * adding one line here. Incident logic is not involved and cannot be broken by
 * it — which is the whole point of the seam.
 */
notifierRegistry.register(emailNotifier).register(webhookNotifier);

export { notifierRegistry, IncidentEvent };
export default notifierRegistry;
