import type { IncomingMessage, ServerResponse } from 'node:http';

import { z } from 'zod';

import { sendValidationError } from '../http/error-responses';
import { isIsoDate } from '../utils/iso-date';

export type ProgressListSort = 'asc' | 'desc';

export type ProgressListQuery = {
  from?: string;
  to?: string;
  sort: ProgressListSort;
};

const progressListQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    sort: z.string().optional(),
  })
  .superRefine(({ from, sort, to }, ctx) => {
    if (from !== undefined && !isIsoDate(from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'from must be a valid date in YYYY-MM-DD format',
      });
    }

    if (to !== undefined && !isIsoDate(to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'to must be a valid date in YYYY-MM-DD format',
      });
    }

    if (sort !== undefined && sort !== 'asc' && sort !== 'desc') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sort'],
        message: 'sort must be either asc or desc',
      });
    }

    if (from !== undefined && to !== undefined && isIsoDate(from) && isIsoDate(to) && from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'from must be less than or equal to to',
      });
    }
  })
  .transform(({ from, sort, to }) => ({
    from,
    to,
    sort: (sort ?? 'asc') as ProgressListSort,
  }));

export function parseProgressListQuery(req: IncomingMessage, res: ServerResponse): ProgressListQuery | null {
  const url = req.url ?? '';
  const searchParams = new URL(url, 'http://localhost').searchParams;
  const hasFrom = searchParams.has('from');
  const hasTo = searchParams.has('to');
  const fromValue = searchParams.get('from');
  const toValue = searchParams.get('to');
  const parsedQuery = progressListQuerySchema.safeParse({
    from: hasFrom ? (fromValue ?? '') : undefined,
    to: hasTo ? (toValue ?? '') : undefined,
    sort: searchParams.get('sort') ?? undefined,
  });

  if (!parsedQuery.success) {
    const message = parsedQuery.error.issues[0]?.message ?? 'Invalid query parameters';
    sendValidationError(res, message);
    return null;
  }

  return parsedQuery.data;
}
