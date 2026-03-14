import type { IncomingMessage, ServerResponse } from 'node:http';

import { prisma } from '../db/prisma';
import { sendInternalError, sendUserNotFound, sendValidationError } from './error-responses';
import { parseTelegramUserIdHeader } from './telegram-user-id';

export type TelegramRequestUser = {
  id: string;
  timezone: string;
};

export async function resolveTelegramRequestUser(
  req: IncomingMessage,
  res: ServerResponse
): Promise<TelegramRequestUser | null> {
  const telegramUserIdResult = parseTelegramUserIdHeader(req);

  if (!telegramUserIdResult.ok) {
    sendValidationError(res, telegramUserIdResult.message);
    return null;
  }

  let user: { id: string; timezone: string } | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { telegramUserId: telegramUserIdResult.telegramUserId },
      select: { id: true, timezone: true },
    });
  } catch {
    sendInternalError(res, 'Failed to resolve user context');
    return null;
  }

  if (!user) {
    sendUserNotFound(res);
    return null;
  }

  return user;
}
