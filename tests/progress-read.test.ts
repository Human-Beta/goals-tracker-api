import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const { findUniqueUserMock, findFirstGoalMock, findManyProgressEventMock } = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
  findFirstGoalMock: vi.fn(),
  findManyProgressEventMock: vi.fn(),
}));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
    },
    goal: {
      findFirst: findFirstGoalMock,
    },
    progressEvent: {
      findMany: findManyProgressEventMock,
    },
  },
}));

import progressEndpoint from '../api/goals/[goalId]/progress';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method: RequestMethod;
  url: string;
  authorization?: string;
  telegramUserId?: string;
  body?: unknown;
};

const initialBotServiceToken = env.BOT_SERVICE_TOKEN;

function createJsonRequest({ method, url, authorization, telegramUserId, body }: RequestOptions): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([payload]) as unknown as IncomingMessage;

  req.method = method;
  req.url = url;
  req.headers = {};

  if (authorization) {
    req.headers.authorization = authorization;
  }

  if (telegramUserId) {
    req.headers['x-telegram-user-id'] = telegramUserId;
  }

  return req;
}

function createGoalRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    targetValue: new Prisma.Decimal('100'),
    ...overrides,
  };
}

function createProgressEventRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    goalId: '11111111-1111-1111-1111-111111111111',
    date: new Date('2026-03-06T00:00:00.000Z'),
    deltaValue: new Prisma.Decimal('8'),
    note: null,
    createdAt: new Date('2026-03-06T10:00:00.000Z'),
    updatedAt: new Date('2026-03-06T10:00:00.000Z'),
    ...overrides,
  };
}

describe('progress read endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.BOT_SERVICE_TOKEN = 'expected-token';
  });

  afterEach(() => {
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('returns progress events with inclusive range filter and desc sort', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    findManyProgressEventMock.mockResolvedValueOnce([
      createProgressEventRecord({
        id: '33333333-3333-3333-3333-333333333333',
        date: new Date('2026-03-07T00:00:00.000Z'),
      }),
      createProgressEventRecord(),
    ]);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress?from=2026-03-06&to=2026-03-07&sort=desc',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(findManyProgressEventMock).toHaveBeenCalledWith({
      where: {
        goalId: '11111111-1111-1111-1111-111111111111',
        date: {
          gte: new Date('2026-03-06T00:00:00.000Z'),
          lte: new Date('2026-03-07T00:00:00.000Z'),
        },
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        id: true,
        goalId: true,
        date: true,
        deltaValue: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      items: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          goal_id: '11111111-1111-1111-1111-111111111111',
          date: '2026-03-07',
          delta_value: 8,
          note: null,
          created_at: '2026-03-06T10:00:00.000Z',
          updated_at: '2026-03-06T10:00:00.000Z',
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          goal_id: '11111111-1111-1111-1111-111111111111',
          date: '2026-03-06',
          delta_value: 8,
          note: null,
          created_at: '2026-03-06T10:00:00.000Z',
          updated_at: '2026-03-06T10:00:00.000Z',
        },
      ],
    });
  });

  it('uses asc sort by default when sort query is not provided', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    findManyProgressEventMock.mockResolvedValueOnce([createProgressEventRecord()]);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(findManyProgressEventMock).toHaveBeenCalledWith({
      where: {
        goalId: '11111111-1111-1111-1111-111111111111',
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        goalId: true,
        date: true,
        deltaValue: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 for invalid date filters and sort', async () => {
    findUniqueUserMock.mockResolvedValue({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValue(createGoalRecord());

    const invalidFromReq = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress?from=2026-3-6',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const invalidFromRes = createMockResponse();
    await progressEndpoint(invalidFromReq, invalidFromRes as unknown as ServerResponse);

    expect(invalidFromRes.statusCode).toBe(400);
    expect(JSON.parse(invalidFromRes.body)).toEqual({
      code: 'validation_error',
      message: 'from must be a valid date in YYYY-MM-DD format',
    });

    const invalidRangeReq = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress?from=2026-03-08&to=2026-03-07',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const invalidRangeRes = createMockResponse();
    await progressEndpoint(invalidRangeReq, invalidRangeRes as unknown as ServerResponse);

    expect(invalidRangeRes.statusCode).toBe(400);
    expect(JSON.parse(invalidRangeRes.body)).toEqual({
      code: 'validation_error',
      message: 'from must be less than or equal to to',
    });

    const invalidSortReq = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress?sort=latest',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const invalidSortRes = createMockResponse();
    await progressEndpoint(invalidSortReq, invalidSortRes as unknown as ServerResponse);

    expect(invalidSortRes.statusCode).toBe(400);
    expect(JSON.parse(invalidSortRes.body)).toEqual({
      code: 'validation_error',
      message: 'sort must be either asc or desc',
    });
  });

  it('returns 401 when service auth token is invalid', async () => {
    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer wrong-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(findUniqueUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({
      code: 'unauthorized',
      message: 'Invalid bot service token',
    });
  });

  it('returns 404 when goal is not found', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(null);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/33333333-3333-3333-3333-333333333333/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(findManyProgressEventMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'goal_not_found',
      message: 'Goal not found',
    });
  });

  it('returns 400 when goalId is not a valid UUID', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/not-uuid/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(findFirstGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'goalId must be a valid UUID',
    });
  });
});
