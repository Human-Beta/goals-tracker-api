import type { ServerResponse } from 'node:http';
import type { Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { sendGoalNotFound, sendInternalError } from '../http/error-responses';

export async function resolveGoalForUser<TSelect extends Prisma.GoalSelect>(
  goalId: string,
  userId: string,
  select: TSelect,
  res: ServerResponse
): Promise<Prisma.GoalGetPayload<{ select: TSelect }> | null> {
  let goal: Prisma.GoalGetPayload<{ select: TSelect }> | null = null;
  try {
    goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      select,
    });
  } catch {
    sendInternalError(res, 'Failed to resolve goal');
    return null;
  }

  if (!goal) {
    sendGoalNotFound(res);
    return null;
  }

  return goal;
}
