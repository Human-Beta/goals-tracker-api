import { z } from 'zod';

import { isIsoDate } from '../utils/iso-date';

export const createGoalPayloadSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
    unit: z.enum(['pages', 'minutes', 'km']),
    target_value: z.number().positive('target_value must be greater than 0'),
    start_date: z
      .string()
      .refine(isIsoDate, { message: 'start_date must be a valid date in YYYY-MM-DD format' })
      .optional(),
    end_date: z.string({ required_error: 'end_date is required' }).refine(isIsoDate, {
      message: 'end_date must be a valid date in YYYY-MM-DD format',
    }),
  })
  .strict();

export const updateGoalPayloadSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required').optional(),
    target_value: z.number().positive('target_value must be greater than 0').optional(),
    start_date: z
      .string()
      .refine(isIsoDate, { message: 'start_date must be a valid date in YYYY-MM-DD format' })
      .optional(),
    end_date: z
      .string()
      .refine(isIsoDate, { message: 'end_date must be a valid date in YYYY-MM-DD format' })
      .optional(),
  })
  .strict();
