import { Prisma } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  createProgressEventPayloadSchema,
  formatIsoDate,
  getUserLocalToday,
  mapProgressEventResponse,
  parseIsoDate,
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
  sendValidationError,
  withBotServiceAuth,
} from '../../../../src';

const goalProgressStatusSelect = {
  id: true,
  startDate: true,
  targetValue: true,
} satisfies Prisma.GoalSelect;

async function createProgressEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST']);
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

export default withBotServiceAuth(createProgressEvent);
