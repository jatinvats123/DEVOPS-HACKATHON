import { ZodError } from 'zod';

/**
 * Generic Zod validation middleware. Validates { body, params, query } and
 * writes back only the parts the schema returned. In Express 5 `req.query`
 * is a read-only getter, so we mutate its keys instead of reassigning it.
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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};
