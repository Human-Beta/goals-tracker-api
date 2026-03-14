import { Prisma } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  createProgressEventPayloadSchema,
  formatIsoDate,
  getUserLocalToday,
  mapProgressEventResponse,
  parseIsoDate,
  parseProgressListQuery,
  prisma,
  progressEventSelect,
  readJsonBodyOrSendInvalidRequest,
  recomputeGoalStatus,
  resolveGoalForUser,
  resolveGoalIdParam,
  resolveTelegramRequestUser,
  sendConflict,
  sendCreatedJson,
  sendInternalError,
  sendMethodNotAllowed,
  sendOkJson,
  sendValidationError,
  type TelegramRequestUser,
  withBotServiceAuth,
} from '../../../../src';

const goalProgressStatusSelect = {
  id: true,
  startDate: true,
  targetValue: true,
} satisfies Prisma.GoalSelect;

async function sendProgressEventsList(req: IncomingMessage, res: ServerResponse, goalId: string): Promise<void> {
  const query = parseProgressListQuery(req, res);
  if (!query) {
    return;
  }

  const dateFilter: Prisma.DateTimeFilter = {};
  if (query.from) {
    dateFilter.gte = parseIsoDate(query.from);
  }
  if (query.to) {
    dateFilter.lte = parseIsoDate(query.to);
  }

  const where: Prisma.ProgressEventWhereInput = {
    goalId,
  };
  if (query.from || query.to) {
    where.date = dateFilter;
  }

  try {
    const events = await prisma.progressEvent.findMany({
      where,
      orderBy: {
        date: query.sort,
      },
      select: progressEventSelect,
    });

    sendOkJson(res, {
      items: events.map(mapProgressEventResponse),
    });
  } catch {
    sendInternalError(res, 'Failed to list progress events');
  }
}

async function createProgressEvent(
  req: IncomingMessage,
  res: ServerResponse,
  goal: Prisma.GoalGetPayload<{ select: typeof goalProgressStatusSelect }>,
  user: TelegramRequestUser
): Promise<void> {
  const body = await readJsonBodyOrSendInvalidRequest(req, res);
  if (body === null) {
    return;
  }

  const parsedPayload = createProgressEventPayloadSchema.safeParse(body);
  if (!parsedPayload.success) {
    const message = parsedPayload.error.issues[0]?.message ?? 'Invalid request body';
    sendValidationError(res, message);
    return;
  }

  const today = getUserLocalToday(user.timezone);
  const date = parsedPayload.data.date ?? today;

  if (date > today) {
    sendValidationError(res, 'date cannot be in the future');
    return;
  }

  const goalStartDate = formatIsoDate(goal.startDate);
  if (date < goalStartDate) {
    sendConflict(res, 'date cannot be before goal start_date');
    return;
  }

  try {
    const event = await prisma.$transaction(async tx => {
      const createdEvent = await tx.progressEvent.create({
        data: {
          goalId: goal.id,
          date: parseIsoDate(date),
          deltaValue: new Prisma.Decimal(parsedPayload.data.delta_value),
          note: parsedPayload.data.note ?? null,
        },
        select: progressEventSelect,
      });

      await recomputeGoalStatus(tx, goal.id, goal.targetValue);

      return createdEvent;
    });

    sendCreatedJson(res, mapProgressEventResponse(event));
  } catch {
    sendInternalError(res, 'Failed to create progress event');
  }
}

async function progressEndpoint(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendMethodNotAllowed(res, ['GET', 'POST']);
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

  const goal = await resolveGoalForUser(goalId, user.id, goalProgressStatusSelect, res);
  if (!goal) {
    return;
  }

  if (req.method === 'GET') {
    await sendProgressEventsList(req, res, goal.id);
    return;
  }

  await createProgressEvent(req, res, goal, user);
}

export default withBotServiceAuth(progressEndpoint);
