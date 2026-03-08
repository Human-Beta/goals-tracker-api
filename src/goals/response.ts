import { Prisma } from '@prisma/client';

import { formatIsoDate } from '../utils/iso-date';

export const goalSelect = {
  id: true,
  userId: true,
  title: true,
  unit: true,
  targetValue: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GoalSelect;

export type GoalRecord = Prisma.GoalGetPayload<{ select: typeof goalSelect }>;

export function mapGoalResponse(goal: GoalRecord): Record<string, unknown> {
  return {
    id: goal.id,
    user_id: goal.userId,
    title: goal.title,
    unit: goal.unit,
    target_value: Number(goal.targetValue),
    start_date: formatIsoDate(goal.startDate),
    end_date: formatIsoDate(goal.endDate),
    status: goal.status,
    created_at: goal.createdAt.toISOString(),
    updated_at: goal.updatedAt.toISOString(),
  };
}
