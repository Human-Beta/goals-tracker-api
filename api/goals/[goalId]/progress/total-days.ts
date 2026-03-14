import { Prisma } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  prisma,
  resolveGoalForUser,
  resolveGoalIdParam,
  resolveTelegramRequestUser,
  sendInternalError,
  sendMethodNotAllowed,
  sendOkJson,
  withBotServiceAuth,
} from '../../../../src';

const goalExistsSelect = {
  id: true,
} satisfies Prisma.GoalSelect;

async function sendProgressTotalDays(res: ServerResponse, goalId: string): Promise<void> {
  try {
    const groupedByDate = await prisma.progressEvent.groupBy({
      by: ['date'],
      where: { goalId },
    });

    sendOkJson(res, {
      goal_id: goalId,
      total_days: groupedByDate.length,
    });
  } catch {
    sendInternalError(res, 'Failed to fetch progress total days');
  }
}

async function totalDaysEndpoint(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const user = await resolveTelegramRequestUser(req, res);
  if (!user) {
    return;
  }

  const goalId = resolveGoalIdParam(req, res);
  if (!goalId) {
    return;
  }

  const goal = await resolveGoalForUser(goalId, user.id, goalExistsSelect, res);
  if (!goal) {
    return;
  }

  await sendProgressTotalDays(res, goal.id);
}

export default withBotServiceAuth(totalDaysEndpoint);
