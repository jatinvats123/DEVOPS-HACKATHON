import { ZodError } from 'zod';

/**
 * Generic Zod validation middleware. Validates { body, params, query } and
 * writes back only the parts the schema returned.
 *
 * Notes:
 * - zod v4 exposes issues on `err.issues` (`err.errors` is undefined), so the
 *   client previously got "Validation failed" with no field details.
 * - In Express 5 `req.query` is a read-only getter, so mutate keys instead of
 *   reassigning the object.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.params) {
      for (const [k, v] of Object.entries(parsed.params)) req.params[k] = v;
    }
    if (parsed.query) {
      for (const [k, v] of Object.entries(parsed.query)) req.query[k] = v;
    }

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues || err.errors || [];
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};
