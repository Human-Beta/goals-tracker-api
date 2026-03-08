import type { IncomingMessage, ServerResponse } from 'node:http';

import { Prisma } from '@prisma/client';

import {
  createGoalPayloadSchema,
  getUserLocalToday,
  goalSelect,
  mapGoalResponse,
  parseIsoDate,
  prisma,
  readJsonBodyOrSendInvalidRequest,
  resolveTelegramRequestUser,
  sendInternalError,
  sendCreatedJson,
  sendMethodNotAllowed,
  sendValidationError,
  withBotServiceAuth,
} from '../../src';

async function createGoal(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST']);
    return;
  }

  const user = await resolveTelegramRequestUser(req, res);
  if (!user) {
    return;
  }

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

export default withBotServiceAuth(createGoal);
