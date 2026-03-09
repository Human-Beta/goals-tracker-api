import { Prisma } from '@prisma/client';

import { formatIsoDate } from '../utils/iso-date';

export const progressEventSelect = {
  id: true,
  goalId: true,
  date: true,
  deltaValue: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProgressEventSelect;

export type ProgressEventRecord = Prisma.ProgressEventGetPayload<{ select: typeof progressEventSelect }>;

export function mapProgressEventResponse(event: ProgressEventRecord): Record<string, unknown> {
  return {
    id: event.id,
    goal_id: event.goalId,
    date: formatIsoDate(event.date),
    delta_value: Number(event.deltaValue),
    note: event.note,
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString(),
  };
}
