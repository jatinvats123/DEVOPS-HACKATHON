import { z } from 'zod';
import { validateRequest } from '../config/validate.js';

export const createMonitorValidator = z.object({
  body: z.object({
    type: z.enum(['website', 'api', 'http', 'ping', 'tcp', 'dns'], {
      errorMap: () => ({ message: 'Invalid monitor type' }),
    }),
    title: z.string().trim().min(1, { message: 'Title is required' }),
    name: z.string().trim().min(1, { message: 'Name is required' }),
    url: z.string().min(1, { message: 'URL is required' }),
    interval: z.coerce.number().positive().optional(),
    timeout: z.coerce.number().positive().optional(),
    description: z.string().trim().optional(),
  }),
});

export const deleteMonitorValidator = z.object({
  params: z.object({
    monitorId: z.string().length(24, {
      message: 'Invalid monitor ID format',
    }),
  }),
});

export const updateMonitorValidator = z.object({
  params: z.object({
    monitorId: z.string().length(24, {
      message: 'Invalid monitor ID format',
    }),
  }),
  body: z.object({
    type: z.enum(['website', 'api', 'http', 'ping', 'tcp', 'dns'], {
      errorMap: () => ({ message: 'Invalid monitor type' }),
    }),
    title: z.string().trim().min(1, { message: 'Title is required' }),
    name: z.string().trim().min(1, { message: 'Name is required' }),
    url: z.string().min(1, { message: 'URL is required' }),
    interval: z.coerce.number().positive().optional(),
    timeout: z.coerce.number().positive().optional(),
    description: z.string().trim().optional(),
  }),
});
