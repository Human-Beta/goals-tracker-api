import { z } from 'zod';

import { isIsoDate } from '../utils/iso-date';

export const createProgressEventPayloadSchema = z
  .object({
    delta_value: z.number().positive('delta_value must be greater than 0'),
    date: z.string().refine(isIsoDate, { message: 'date must be a valid date in YYYY-MM-DD format' }).optional(),
    note: z.string().nullable().optional(),
  })
  .strict();

export const updateProgressEventPayloadSchema = z
  .object({
    delta_value: z.number().positive('delta_value must be greater than 0').optional(),
    date: z.string().refine(isIsoDate, { message: 'date must be a valid date in YYYY-MM-DD format' }).optional(),
    note: z.string().nullable().optional(),
  })
  .strict();
