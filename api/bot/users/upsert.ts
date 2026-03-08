import type { IncomingMessage, ServerResponse } from 'node:http';

import { z } from 'zod';

import {
  INT64_MAX,
  INT64_MIN,
  prisma,
  readJsonBodyOrSendInvalidRequest,
  sendInternalError,
  sendOkJson,
  sendMethodNotAllowed,
  sendValidationError,
  withBotServiceAuth,
} from '../../../src';

const payloadSchema = z.object({
  telegram_user_id: z
    .number({ invalid_type_error: 'telegram_user_id must be a valid int64' })
    .int('telegram_user_id must be a valid int64')
    .refine(Number.isSafeInteger, { message: 'telegram_user_id must be a valid int64' })
    .transform(BigInt)
    .refine(value => value >= INT64_MIN && value <= INT64_MAX, {
      message: 'telegram_user_id must be a valid int64',
    }),
  timezone: z
    .string()
    .min(1, 'timezone is required')
    .refine(isIanaTimezone, { message: 'timezone must be a valid IANA timezone' }),
});

function isIanaTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

async function upsertBotUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST']);
    return;
  }

  const body = await readJsonBodyOrSendInvalidRequest(req, res);
  if (body === null) {
    return;
  }

  const parsedPayload = payloadSchema.safeParse(body);

  if (!parsedPayload.success) {
    const message = parsedPayload.error.issues[0]?.message ?? 'Invalid request body';
    sendValidationError(res, message);
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where: { telegramUserId: parsedPayload.data.telegram_user_id },
      update: { timezone: parsedPayload.data.timezone },
      create: {
        telegramUserId: parsedPayload.data.telegram_user_id,
        timezone: parsedPayload.data.timezone,
      },
      select: {
        id: true,
        telegramUserId: true,
        timezone: true,
      },
    });

    if (user.telegramUserId === null) {
      sendInternalError(res, 'Failed to upsert user');
      return;
    }

    sendOkJson(res, {
      user_id: user.id,
      telegram_user_id: Number(user.telegramUserId),
      timezone: user.timezone,
    });
  } catch {
    sendInternalError(res, 'Failed to upsert user');
  }
}

export default withBotServiceAuth(upsertBotUser);
