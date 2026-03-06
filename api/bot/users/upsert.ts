import type { IncomingMessage, ServerResponse } from 'node:http';

import { z } from 'zod';

import { createErrorPayload, sendError, prisma, withBotServiceAuth } from '../../../src';

const INT64_MIN = -(2n ** 63n);
const INT64_MAX = 2n ** 63n - 1n;

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

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer | string) => {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function upsertBotUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;

  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendError(res, 400, createErrorPayload('BAD_REQUEST', 'Invalid request body'));
    return;
  }

  const parsedPayload = payloadSchema.safeParse(body);

  if (!parsedPayload.success) {
    const message = parsedPayload.error.issues[0]?.message ?? 'Invalid request body';
    sendError(res, 400, createErrorPayload('BAD_REQUEST', message));
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
      sendError(res, 500, createErrorPayload('INTERNAL_ERROR', 'Failed to upsert user'));
      return;
    }

    sendJson(res, 200, {
      user_id: user.id,
      telegram_user_id: Number(user.telegramUserId),
      timezone: user.timezone,
    });
  } catch {
    sendError(res, 500, createErrorPayload('INTERNAL_ERROR', 'Failed to upsert user'));
  }
}

export default withBotServiceAuth(upsertBotUser);
