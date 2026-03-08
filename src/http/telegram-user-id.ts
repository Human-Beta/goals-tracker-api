import type { IncomingMessage } from 'node:http';

import { parseInt64 } from '../utils/int64';

export type TelegramUserIdParseResult = { ok: true; telegramUserId: bigint } | { ok: false; message: string };

export function parseTelegramUserIdHeader(req: IncomingMessage): TelegramUserIdParseResult {
  const headerValue = req.headers['x-telegram-user-id'];
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!rawValue) {
    return { ok: false, message: 'X-Telegram-User-Id header is required' };
  }

  const telegramUserId = parseInt64(rawValue);

  if (telegramUserId === null) {
    return { ok: false, message: 'X-Telegram-User-Id must be a valid int64' };
  }

  return { ok: true, telegramUserId };
}
