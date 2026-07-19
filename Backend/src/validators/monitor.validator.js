import { z } from 'zod';

// Shapes match the `validate` middleware, which parses { body, params, query }.
export const createMonitorValidator = z.object({
  body: z.object({
    type: z.enum(['website', 'api']).default('website'),
    title: z.string().trim().optional(),
    url: z.string().url({ message: 'Invalid URL format' }),
    interval: z.number().positive().optional(),
    timeout: z.number().positive().optional(),
  }),
});

export const deleteMonitorValidator = z.object({
  params: z.object({
    monitorId: z
      .string()
      .length(24, { message: 'Invalid monitor ID format' }),
  }),
});
