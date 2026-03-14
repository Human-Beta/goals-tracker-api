import { Prisma } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  computeGoalMetrics,
  formatIsoDate,
  getIsoDateDaysAgoInclusive,
  getUserLocalToday,
  type GoalRecord,
  goalSelect,
  mapGoalResponse,
  parseIsoDate,
  prisma,
  readJsonBodyOrSendInvalidRequest,
  resolveGoalForUser,
  resolveGoalIdParam,
  resolveTelegramRequestUser,
  sendInternalError,
  sendInvalidRequestBody,
  sendMethodNotAllowed,
  sendOkJson,
  sendTargetBelowProgress,
  sendUnitImmutable,
  sendValidationError,
  type TelegramRequestUser,
  updateGoalPayloadSchema,
  withBotServiceAuth,
} from '../../src';

type UpdateGoalPayload = {
  title?: string;
  target_value?: number;
  start_date?: string;
  end_date?: string;
};

async function readAndValidateUpdatePayload(
  req: IncomingMessage,
  res: ServerResponse,
  today: string
): Promise<UpdateGoalPayload | null> {
  const body = await readJsonBodyOrSendInvalidRequest(req, res);
  if (body === null) {
    return null;
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    sendInvalidRequestBody(res);
    return null;
  }

  if ('unit' in body) {
    sendUnitImmutable(res);
    return null;
  }

  const parsedPayload = updateGoalPayloadSchema.safeParse(body);

  if (!parsedPayload.success) {
    const message = parsedPayload.error.issues[0]?.message ?? 'Invalid request body';
    sendValidationError(res, message);
    return null;
  }

  if (parsedPayload.data.start_date && parsedPayload.data.start_date > today) {
    sendValidationError(res, 'start_date cannot be in the future');
    return null;
  }

  if (parsedPayload.data.end_date && parsedPayload.data.end_date <= today) {
    sendValidationError(res, 'end_date must be strictly after today');
    return null;
  }

  return parsedPayload.data;
}

async function validateTargetValueAgainstProgress(
  goal: GoalRecord,
  targetValue: number | undefined,
  res: ServerResponse
): Promise<boolean> {
  if (targetValue === undefined) {
    return true;
  }

  const progress = await prisma.progressEvent.aggregate({
    where: { goalId: goal.id },
    _sum: { deltaValue: true },
  });
  const currentProgress = progress._sum.deltaValue ?? new Prisma.Decimal(0);
  const nextTarget = new Prisma.Decimal(targetValue);

  if (nextTarget.lessThan(currentProgress)) {
    sendTargetBelowProgress(res);
    return false;
  }

  return true;
}

function buildGoalUpdateData(payload: UpdateGoalPayload): Prisma.GoalUpdateInput {
  const data: Prisma.GoalUpdateInput = {};

  if (payload.title !== undefined) {
    data.title = payload.title;
  }
  if (payload.target_value !== undefined) {
    data.targetValue = new Prisma.Decimal(payload.target_value);
  }
  if (payload.start_date !== undefined) {
    data.startDate = parseIsoDate(payload.start_date);
  }
  if (payload.end_date !== undefined) {
    data.endDate = parseIsoDate(payload.end_date);
  }

  return data;
}

async function sendGoalDetails(goal: GoalRecord, today: string, res: ServerResponse): Promise<void> {
  const current7dStart = getIsoDateDaysAgoInclusive(today, 7);
  const current30dStart = getIsoDateDaysAgoInclusive(today, 30);

  try {
    const [cumulativeProgress, current7dProgress, current30dProgress] = await Promise.all([
      prisma.progressEvent.aggregate({
        where: { goalId: goal.id },
        _sum: { deltaValue: true },
      }),
      prisma.progressEvent.aggregate({
        where: {
          goalId: goal.id,
          date: {
            gte: parseIsoDate(current7dStart),
            lte: parseIsoDate(today),
          },
        },
        _sum: { deltaValue: true },
      }),
      prisma.progressEvent.aggregate({
        where: {
          goalId: goal.id,
          date: {
            gte: parseIsoDate(current30dStart),
            lte: parseIsoDate(today),
          },
        },
        _sum: { deltaValue: true },
      }),
    ]);

    const metrics = computeGoalMetrics({
      target_value: Number(goal.targetValue),
      start_date: formatIsoDate(goal.startDate),
      end_date: formatIsoDate(goal.endDate),
      today,
      current_value: Number(cumulativeProgress._sum.deltaValue ?? 0),
      current_7d_sum: Number(current7dProgress._sum.deltaValue ?? 0),
      current_30d_sum: Number(current30dProgress._sum.deltaValue ?? 0),
    });

    sendOkJson(res, {
      ...mapGoalResponse(goal),
      ...metrics,
    });
  } catch {
    sendInternalError(res, 'Failed to fetch goal');
  }
}

async function updateGoal(
  req: IncomingMessage,
  res: ServerResponse,
  goal: GoalRecord,
  user: TelegramRequestUser
): Promise<void> {
  const today = getUserLocalToday(user.timezone);
  const payload = await readAndValidateUpdatePayload(req, res, today);
  if (!payload) {
    return;
  }

  const isTargetValueValid = await validateTargetValueAgainstProgress(goal, payload.target_value, res);
  if (!isTargetValueValid) {
    return;
  }

  const data = buildGoalUpdateData(payload);
  if (Object.keys(data).length === 0) {
    sendOkJson(res, mapGoalResponse(goal));
    return;
  }

  try {
    const updatedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data,
      select: goalSelect,
    });

    sendOkJson(res, mapGoalResponse(updatedGoal));
  } catch {
    sendInternalError(res, 'Failed to update goal');
  }
}

async function goalHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    sendMethodNotAllowed(res, ['GET', 'PATCH']);
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

  const goal = await resolveGoalForUser(goalId, user.id, goalSelect, res);
  if (!goal) {
    return;
  }

  if (req.method === 'GET') {
    const today = getUserLocalToday(user.timezone);
    await sendGoalDetails(goal, today, res);
    return;
  }

  await updateGoal(req, res, goal, user);
}

export default withBotServiceAuth(goalHandler);
