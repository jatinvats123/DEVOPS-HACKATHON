import { z } from 'zod';

/**
 * Monitor request schemas.
 *
 * The validation middleware writes the PARSED result back over `req.body`, and
 * Zod strips keys it does not declare. That makes these schemas an allow-list
 * at the network edge: a field absent here never reaches a controller at all.
 * It is the outer layer of defence in depth — the DAO stamping ownership is the
 * inner one, and neither relies on the other being correct.
 */

// Mirrors the model's enum, which accepts both the lowercase forms the API uses
// and the display-cased forms the original UI sent. Rejecting the latter would
// break existing clients.
const monitorType = z.enum([
  'website',
  'api',
  'http',
  'ping',
  'tcp',
  'dns',
  'HTTP/HTTPS',
  'Ping',
  'TCP',
  'DNS',
]);

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid monitor ID format' });

/**
 * Outbound credentials for a target behind auth. A flat string→string map: the
 * values become HTTP headers, so anything else is a type confusion waiting to
 * happen. Encrypted by the controller before it reaches the database.
 */
const authHeaders = z.record(z.string(), z.string()).nullable().optional();

/** Fields a client may set. Shared by create and update so they cannot drift. */
const monitorFields = {
  type: monitorType.optional(),
  title: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  url: z.string().min(1, { message: 'URL is required' }),
  description: z.string().trim().optional(),
  interval: z.coerce.number().positive().optional(),
  timeout: z.coerce.number().positive().optional(),
  active: z.coerce.boolean().optional(),
  ignoreTlsErrors: z.coerce.boolean().optional(),
  failureThreshold: z.coerce.number().int().min(1).max(100).optional(),
  successThreshold: z.coerce.number().int().min(1).max(100).optional(),
  authHeaders,
};

export const createMonitorValidator = z.object({
  body: z.object({
    ...monitorFields,
    // Only the URL is genuinely required — everything else has a model default.
    // Previously `type`, `title` AND `name` were all mandatory, which forced
    // clients to send redundant data to create the simplest possible monitor.
    url: z.string().min(1, { message: 'URL is required' }),
  }),
});

export const deleteMonitorValidator = z.object({
  params: z.object({ monitorId: objectId }),
});

export const updateMonitorValidator = z.object({
  params: z.object({ monitorId: objectId }),
  // Every field optional: an update is a PARTIAL patch. The previous schema
  // required type, title, name and url on every update, so changing one field
  // meant resending all of them — and omitting any returned 400 from the
  // validator before the ownership check ever ran, which masked authorisation
  // failures behind validation errors.
  body: z.object({ ...monitorFields, url: z.string().min(1).optional() }),
});
