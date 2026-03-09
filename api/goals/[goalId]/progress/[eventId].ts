import { Prisma } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  extractGoalProgressEventParams,
  formatIsoDate,
  getUserLocalToday,
  mapProgressEventResponse,
  parseIsoDate,
  prisma,
  progressEventSelect,
  readJsonBodyOrSendInvalidRequest,
  recomputeGoalStatus,
  resolveGoalForUser,
  resolveTelegramRequestUser,
  sendConflict,
  sendEventNotFound,
  sendInternalError,
  sendMethodNotAllowed,
  sendOkJson,
  sendValidationError,
  updateProgressEventPayloadSchema,
  withBotServiceAuth,
} from '../../../../src';

type GoalProgressStatusRecord = {
  id: string;
  startDate: Date;
  targetValue: Prisma.Decimal;
};

const goalProgressStatusSelect = {
  id: true,
  startDate: true,
  targetValue: true,
} satisfies Prisma.GoalSelect;

async function resolveProgressEventForGoal(eventId: string, goalId: string, res: ServerResponse) {
  const event = await prisma.progressEvent.findFirst({
    where: {
      id: eventId,
      goalId,
    },
    select: progressEventSelect,
  });

  if (!event) {
    sendEventNotFound(res);
    return null;
  }

  return event;
}

function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

async function patchProgressEvent(
  req: IncomingMessage,
  res: ServerResponse,
  goal: GoalProgressStatusRecord,
  eventId: string,
  userTimezone: string
): Promise<void> {
  const event = await resolveProgressEventForGoal(eventId, goal.id, res);
  if (!event) {
    return;
  }

  const body = await readJsonBodyOrSendInvalidRequest(req, res);
  if (body === null) {
    return;
  }

  const parsedPayload = updateProgressEventPayloadSchema.safeParse(body);

  if (!parsedPayload.success) {
    const message = parsedPayload.error.issues[0]?.message ?? 'Invalid request body';
    sendValidationError(res, message);
    return;
  }

  const hasAnyField =
    parsedPayload.data.delta_value !== undefined ||
    parsedPayload.data.date !== undefined ||
    parsedPayload.data.note !== undefined;

  if (!hasAnyField) {
    sendOkJson(res, mapProgressEventResponse(event));
    return;
  }

  const today = getUserLocalToday(userTimezone);
  const nextDate = parsedPayload.data.date ?? formatIsoDate(event.date);

  if (nextDate > today) {
    sendValidationError(res, 'date cannot be in the future');
    return;
  }

  const goalStartDate = formatIsoDate(goal.startDate);
  if (nextDate < goalStartDate) {
    sendConflict(res, 'date cannot be before goal start_date');
    return;
  }

  const data: Prisma.ProgressEventUpdateInput = {};

  if (parsedPayload.data.delta_value !== undefined) {
    data.deltaValue = new Prisma.Decimal(parsedPayload.data.delta_value);
  }
  if (parsedPayload.data.date !== undefined) {
    data.date = parseIsoDate(parsedPayload.data.date);
  }
  if (parsedPayload.data.note !== undefined) {
    data.note = parsedPayload.data.note;
  }

  try {
    const updatedEvent = await prisma.$transaction(async tx => {
      const updatedCount = await tx.progressEvent.updateMany({
        where: {
          id: event.id,
          goalId: goal.id,
        },
        data,
      });

      if (updatedCount.count === 0) {
        return null;
      }

      const changedEvent = await tx.progressEvent.findFirst({
        where: {
          id: event.id,
          goalId: goal.id,
        },
        select: progressEventSelect,
      });

      if (!changedEvent) {
        return null;
      }

      await recomputeGoalStatus(tx, goal.id, goal.targetValue);

      return changedEvent;
    });

    if (!updatedEvent) {
      sendEventNotFound(res);
      return;
    }

    sendOkJson(res, mapProgressEventResponse(updatedEvent));
  } catch {
    sendInternalError(res, 'Failed to update progress event');
  }
}

async function deleteProgressEvent(
  res: ServerResponse,
  goal: GoalProgressStatusRecord,
  eventId: string
): Promise<void> {
  try {
    const deleted = await prisma.$transaction(async tx => {
      const deletedCount = await tx.progressEvent.deleteMany({
        where: {
          id: eventId,
          goalId: goal.id,
        },
      });

      if (deletedCount.count === 0) {
        return false;
      }

      await recomputeGoalStatus(tx, goal.id, goal.targetValue);

      return true;
    });

    if (!deleted) {
      sendEventNotFound(res);
      return;
    }

    sendNoContent(res);
  } catch {
    sendInternalError(res, 'Failed to delete progress event');
  }
}

async function progressEventWriteHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    sendMethodNotAllowed(res, ['PATCH', 'DELETE']);
    return;
  }

  const user = await resolveTelegramRequestUser(req, res);
  if (!user) {
    return;
  }

  const routeParams = extractGoalProgressEventParams(req, res);
  if (!routeParams) {
    return;
  }

  const goal = await resolveGoalForUser(routeParams.goalId, user.id, goalProgressStatusSelect, res);
  if (!goal) {
    return;
  }

  if (req.method === 'PATCH') {
    await patchProgressEvent(req, res, goal, routeParams.eventId, user.timezone);
    return;
  }

  await deleteProgressEvent(res, goal, routeParams.eventId);
}

export default withBotServiceAuth(progressEventWriteHandler);
