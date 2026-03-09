import type { ServerResponse } from 'node:http';
import type { Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { sendGoalNotFound } from '../http/error-responses';

export async function resolveGoalForUser<TSelect extends Prisma.GoalSelect>(
  goalId: string,
  userId: string,
  select: TSelect,
  res: ServerResponse
): Promise<Prisma.GoalGetPayload<{ select: TSelect }> | null> {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select,
  });

  if (!goal) {
    sendGoalNotFound(res);
    return null;
  }

  return goal;
}
