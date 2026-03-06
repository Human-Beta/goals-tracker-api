import type { IncomingMessage, ServerResponse } from 'node:http';

import { botServiceAuthGuard } from '../auth/bot-service-auth';
import { sendError } from './error';

export type ApiHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void;

export function withBotServiceAuth(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    const auth = botServiceAuthGuard(req);

    if (!auth.ok) {
      sendError(res, auth.statusCode, auth.error);
      return;
    }

    await handler(req, res);
  };
}
