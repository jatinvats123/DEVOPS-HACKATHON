import { z } from 'zod';
import { validateRequest } from '../config/validate.js';

export const createMonitorValidator = z.object({
  type: z.enum(['website', 'api'], {
    errorMap: () => ({ message: 'Type must be either "website" or "api"' }),
  }),
  url: z.string().url(),
  interval: z.number().positive().optional(),
  timeout: z.number().positive().optional(),
  validateRequest,
});

export const deleteMonitorValidator = z.object({
  monitorId: z.string().length(24, {
    message: 'Invalid monitor ID format',
  }),
});
