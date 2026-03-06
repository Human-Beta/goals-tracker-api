import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const { upsertUserMock } = vi.hoisted(() => ({
  upsertUserMock: vi.fn(),
}));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      upsert: upsertUserMock,
    },
  },
}));

import upsertBotUser from '../api/bot/users/upsert';

type RequestOptions = {
  authorization?: string;
  body?: unknown;
};

const initialBotServiceToken = env.BOT_SERVICE_TOKEN;

function createJsonRequest({ authorization, body }: RequestOptions): IncomingMessage {
  const payload = JSON.stringify(body ?? {});
  const req = Readable.from([payload]) as unknown as IncomingMessage;

  req.method = 'POST';
  req.headers = authorization ? { authorization } : {};

  return req;
}

describe('POST /api/bot/users/upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('creates new user', async () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';
    upsertUserMock.mockResolvedValueOnce({
      id: 'f54ac10d-352f-4fbe-95ce-f1808850866f',
      telegramUserId: 123456789n,
      timezone: 'Europe/Uzhgorod',
    });

    const req = createJsonRequest({
      authorization: 'Bearer expected-token',
      body: {
        telegram_user_id: 123456789,
        timezone: 'Europe/Uzhgorod',
      },
    });
    const res = createMockResponse();

    await upsertBotUser(req, res as unknown as ServerResponse);

    expect(upsertUserMock).toHaveBeenCalledWith({
      where: { telegramUserId: 123456789n },
      update: { timezone: 'Europe/Uzhgorod' },
      create: {
        telegramUserId: 123456789n,
        timezone: 'Europe/Uzhgorod',
      },
      select: {
        id: true,
        telegramUserId: true,
        timezone: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      user_id: 'f54ac10d-352f-4fbe-95ce-f1808850866f',
      telegram_user_id: 123456789,
      timezone: 'Europe/Uzhgorod',
    });
  });

  it('updates existing user', async () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';
    upsertUserMock.mockResolvedValueOnce({
      id: 'f54ac10d-352f-4fbe-95ce-f1808850866f',
      telegramUserId: 123456789n,
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      authorization: 'Bearer expected-token',
      body: {
        telegram_user_id: 123456789,
        timezone: 'Europe/Kyiv',
      },
    });
    const res = createMockResponse();

    await upsertBotUser(req, res as unknown as ServerResponse);

    expect(upsertUserMock).toHaveBeenCalledWith({
      where: { telegramUserId: 123456789n },
      update: { timezone: 'Europe/Kyiv' },
      create: {
        telegramUserId: 123456789n,
        timezone: 'Europe/Kyiv',
      },
      select: {
        id: true,
        telegramUserId: true,
        timezone: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      user_id: 'f54ac10d-352f-4fbe-95ce-f1808850866f',
      telegram_user_id: 123456789,
      timezone: 'Europe/Kyiv',
    });
  });

  it('returns 400 for invalid payload', async () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';
    const req = createJsonRequest({
      authorization: 'Bearer expected-token',
      body: {
        telegram_user_id: 123456789,
        timezone: 'Invalid/Timezone',
      },
    });
    const res = createMockResponse();

    await upsertBotUser(req, res as unknown as ServerResponse);

    expect(upsertUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'BAD_REQUEST',
      message: 'timezone must be a valid IANA timezone',
    });
  });

  it('returns 401 for invalid token', async () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';
    const req = createJsonRequest({
      authorization: 'Bearer invalid-token',
      body: {
        telegram_user_id: 123456789,
        timezone: 'Europe/Uzhgorod',
      },
    });
    const res = createMockResponse();

    await upsertBotUser(req, res as unknown as ServerResponse);

    expect(upsertUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Invalid bot service token',
    });
  });
});
