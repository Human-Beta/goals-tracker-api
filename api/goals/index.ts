import type { IncomingMessage, ServerResponse } from 'node:http';

import { Prisma } from '@prisma/client';

import {
  computeGoalMetrics,
  createGoalPayloadSchema,
  formatIsoDate,
  getIsoDateDaysAgoInclusive,
  getUserLocalToday,
  goalSelect,
  mapGoalResponse,
  parseIsoDate,
  prisma,
  readJsonBodyOrSendInvalidRequest,
  resolveTelegramRequestUser,
  sendCreatedJson,
  sendInternalError,
  sendMethodNotAllowed,
  sendOkJson,
  sendValidationError,
  type TelegramRequestUser,
  withBotServiceAuth,
} from '../../src';

const goalListSelect = {
  id: true,
  title: true,
  targetValue: true,
  startDate: true,
  endDate: true,
} satisfies Prisma.GoalSelect;

type GoalListProgressRow = {
  goalId: string;
  _sum: {
    deltaValue: Prisma.Decimal | null;
  };
};

function mapGoalProgressSums(rows: GoalListProgressRow[]): Map<string, number> {
  return new Map(rows.map(row => [row.goalId, Number(row._sum.deltaValue ?? 0)]));
}

async function sendGoalsList(user: TelegramRequestUser, res: ServerResponse): Promise<void> {
  const today = getUserLocalToday(user.timezone);
  const current7dStart = getIsoDateDaysAgoInclusive(today, 7);

  try {
    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      select: goalListSelect,
    });

    if (goals.length === 0) {
      sendOkJson(res, { items: [] });
      return;
    }

    const goalIds = goals.map(goal => goal.id);
    const [cumulativeProgressRows, current7dProgressRows] = await Promise.all([
      prisma.progressEvent.groupBy({
        by: ['goalId'],
        where: {
          goalId: {
            in: goalIds,
          },
        },
        _sum: {
          deltaValue: true,
        },
      }),
      prisma.progressEvent.groupBy({
        by: ['goalId'],
        where: {
          goalId: {
            in: goalIds,
          },
          date: {
            gte: parseIsoDate(current7dStart),
            lte: parseIsoDate(today),
          },
        },
        _sum: {
          deltaValue: true,
        },
      }),
    ]);

    const cumulativeProgressByGoalId = mapGoalProgressSums(cumulativeProgressRows);
    const current7dProgressByGoalId = mapGoalProgressSums(current7dProgressRows);

    const items = goals.map(goal => {
      const metrics = computeGoalMetrics({
        target_value: Number(goal.targetValue),
        start_date: formatIsoDate(goal.startDate),
        end_date: formatIsoDate(goal.endDate),
        today,
        current_value: cumulativeProgressByGoalId.get(goal.id) ?? 0,
        current_7d_sum: current7dProgressByGoalId.get(goal.id) ?? 0,
        current_30d_sum: 0,
      });

      return {
        id: goal.id,
        title: goal.title,
        percent_complete: metrics.percent_complete,
        days_left: metrics.days_left,
        pace_current_7d: metrics.pace_current_7d,
      };
    });

    sendOkJson(res, { items });
  } catch {
    sendInternalError(res, 'Failed to list goals');
  }
}

async function createGoal(req: IncomingMessage, res: ServerResponse, user: TelegramRequestUser): Promise<void> {
  const body = await readJsonBodyOrSendInvalidRequest(req, res);
  if (body === null) {
    return;
  }

  const parsedPayload = createGoalPayloadSchema.safeParse(body);

  if (!parsedPayload.success) {
    const message = parsedPayload.error.issues[0]?.message ?? 'Invalid request body';
    sendValidationError(res, message);
    return;
  }

  const today = getUserLocalToday(user.timezone);
  const startDate = parsedPayload.data.start_date ?? today;
  const endDate = parsedPayload.data.end_date;

  if (startDate > today) {
    sendValidationError(res, 'start_date cannot be in the future');
    return;
  }

  if (endDate <= today) {
    sendValidationError(res, 'end_date must be strictly after today');
    return;
  }

  try {
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: parsedPayload.data.title,
        unit: parsedPayload.data.unit,
        targetValue: new Prisma.Decimal(parsedPayload.data.target_value),
        startDate: parseIsoDate(startDate),
        endDate: parseIsoDate(endDate),
      },
      select: goalSelect,
    });

    sendCreatedJson(res, mapGoalResponse(goal));
  } catch {
    sendInternalError(res, 'Failed to create goal');
  }
}

async function goalsHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendMethodNotAllowed(res, ['GET', 'POST']);
    return;
  }

  const user = await resolveTelegramRequestUser(req, res);
  if (!user) {
    return;
  }

  if (req.method === 'GET') {
    await sendGoalsList(user, res);
    return;
  }

  await createGoal(req, res, user);
}

export default withBotServiceAuth(goalsHandler);
