import { ZodError } from 'zod';

/**
 * Generic Zod validation middleware
 * Supports body, params, query
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    // overwrite request with validated data (safe + clean)
    if (validatedData.body) req.body = validatedData.body;
    if (validatedData.params) req.params = validatedData.params;
    if (validatedData.query) req.query = validatedData.query;

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    next(err);
  }
};