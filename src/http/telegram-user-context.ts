import type { IncomingMessage, ServerResponse } from 'node:http';

import { prisma } from '../db/prisma';
import { sendUserNotFound, sendValidationError } from './error-responses';
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

  const user = await prisma.user.findUnique({
    where: { telegramUserId: telegramUserIdResult.telegramUserId },
    select: { id: true, timezone: true },
  });

  if (!user) {
    sendUserNotFound(res);
    return null;
  }

  return user;
}
