import type { IncomingMessage } from 'node:http';

import { env } from '../config/env';
import { createErrorPayload, type ErrorPayload } from '../http/error';

export type BotServiceAuthResult =
  | { ok: true }
  | { ok: false; statusCode: number; error: ErrorPayload };

export function parseBearerToken(authorization: string | string[] | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  const token = match?.[1]?.trim();

  if (!token) {
    return null;
  }

  return token;
}

export function botServiceAuthGuard(req: IncomingMessage): BotServiceAuthResult {
  if (!env.BOT_SERVICE_TOKEN) {
    return {
      ok: false,
      statusCode: 500,
      error: createErrorPayload('INTERNAL_ERROR', 'Bot service token is not configured'),
    };
  }

  const token = parseBearerToken(req.headers.authorization);

  if (token !== env.BOT_SERVICE_TOKEN) {
    return {
      ok: false,
      statusCode: 401,
      error: createErrorPayload('UNAUTHORIZED', 'Invalid bot service token'),
    };
  }

  return { ok: true };
}
