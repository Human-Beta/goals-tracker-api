import type { IncomingMessage, ServerResponse } from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTelegramRequestUser } from '../src';
import { createMockResponse } from './helpers/mock-response';

const { findUniqueUserMock } = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
}));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
    },
  },
}));

function createRequest(telegramUserId?: string | string[]): IncomingMessage {
  return {
    headers: telegramUserId === undefined ? {} : { 'x-telegram-user-id': telegramUserId },
  } as IncomingMessage;
}

describe('resolveTelegramRequestUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error when X-Telegram-User-Id header is invalid', async () => {
    const res = createMockResponse();

    const user = await resolveTelegramRequestUser(createRequest('invalid-user-id'), res as unknown as ServerResponse);

    expect(user).toBeNull();
    expect(findUniqueUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'X-Telegram-User-Id must be a valid int64',
    });
  });

  it('returns user_not_found when user is absent in database', async () => {
    findUniqueUserMock.mockResolvedValueOnce(null);
    const res = createMockResponse();

    const user = await resolveTelegramRequestUser(createRequest('123456789'), res as unknown as ServerResponse);

    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { telegramUserId: 123456789n },
      select: { id: true, timezone: true },
    });
    expect(user).toBeNull();
    expect(res.statusCode).toBe(404);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'user_not_found',
      message: 'User not found for provided telegram user id',
    });
  });

  it('returns resolved user when header is valid and user exists', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-123',
      timezone: 'Europe/Kyiv',
    });
    const res = createMockResponse();

    const user = await resolveTelegramRequestUser(createRequest('123456789'), res as unknown as ServerResponse);

    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { telegramUserId: 123456789n },
      select: { id: true, timezone: true },
    });
    expect(user).toEqual({
      id: 'user-123',
      timezone: 'Europe/Kyiv',
    });
    expect(res.statusCode).toBe(0);
    expect(res.body).toBe('');
  });
});
