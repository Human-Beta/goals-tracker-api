import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const {
  upsertUserMock,
  findUniqueUserMock,
  createGoalMock,
  findManyGoalsMock,
  findFirstGoalMock,
  updateGoalMock,
  groupByProgressMock,
  aggregateProgressMock,
  findManyProgressEventMock,
  findFirstProgressEventMock,
  transactionMock,
  txCreateProgressEventMock,
  txUpdateManyProgressEventMock,
  txDeleteManyProgressEventMock,
  txFindFirstProgressEventInTxMock,
  txAggregateProgressMock,
  txUpdateGoalMock,
} = vi.hoisted(() => ({
  upsertUserMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
  createGoalMock: vi.fn(),
  findManyGoalsMock: vi.fn(),
  findFirstGoalMock: vi.fn(),
  updateGoalMock: vi.fn(),
  groupByProgressMock: vi.fn(),
  aggregateProgressMock: vi.fn(),
  findManyProgressEventMock: vi.fn(),
  findFirstProgressEventMock: vi.fn(),
  transactionMock: vi.fn(),
  txCreateProgressEventMock: vi.fn(),
  txUpdateManyProgressEventMock: vi.fn(),
  txDeleteManyProgressEventMock: vi.fn(),
  txFindFirstProgressEventInTxMock: vi.fn(),
  txAggregateProgressMock: vi.fn(),
  txUpdateGoalMock: vi.fn(),
}));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      upsert: upsertUserMock,
      findUnique: findUniqueUserMock,
    },
    goal: {
      create: createGoalMock,
      findMany: findManyGoalsMock,
      findFirst: findFirstGoalMock,
      update: updateGoalMock,
    },
    progressEvent: {
      groupBy: groupByProgressMock,
      aggregate: aggregateProgressMock,
      findMany: findManyProgressEventMock,
      findFirst: findFirstProgressEventMock,
    },
    $transaction: transactionMock,
  },
}));

import upsertBotUser from '../api/bot/users/upsert';
import goalEndpoint from '../api/goals/[goalId]';
import progressEventWriteEndpoint from '../api/goals/[goalId]/progress/[eventId]';
import progressEndpoint from '../api/goals/[goalId]/progress';
import goalsEndpoint from '../api/goals';

type RequestMethod = 'POST' | 'GET' | 'PATCH' | 'DELETE' | 'PUT';

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

function userRecord() {
  return {
    id: 'user-1',
    timezone: 'Europe/Kyiv',
  };
}

function goalRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'user-1',
    title: 'Read book',
    unit: 'pages',
    targetValue: new Prisma.Decimal('100'),
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-20T00:00:00.000Z'),
    status: 'active',
    createdAt: new Date('2026-03-01T10:00:00.000Z'),
    updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    ...overrides,
  };
}

function progressEventRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    goalId: '11111111-1111-1111-1111-111111111111',
    date: new Date('2026-03-08T00:00:00.000Z'),
    deltaValue: new Prisma.Decimal('10'),
    note: 'session',
    createdAt: new Date('2026-03-08T10:00:00.000Z'),
    updatedAt: new Date('2026-03-08T10:00:00.000Z'),
    ...overrides,
  };
}

describe('MVP contract smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));
    env.BOT_SERVICE_TOKEN = 'expected-token';

    transactionMock.mockImplementation(async callback =>
      callback({
        progressEvent: {
          create: txCreateProgressEventMock,
          updateMany: txUpdateManyProgressEventMock,
          deleteMany: txDeleteManyProgressEventMock,
          findFirst: txFindFirstProgressEventInTxMock,
          aggregate: txAggregateProgressMock,
        },
        goal: {
          update: txUpdateGoalMock,
        },
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('happy-path: POST /bot/users/upsert', async () => {
    upsertUserMock.mockResolvedValueOnce({
      id: 'f54ac10d-352f-4fbe-95ce-f1808850866f',
      telegramUserId: 123456789n,
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/bot/users/upsert',
      authorization: 'Bearer expected-token',
      body: {
        telegram_user_id: 123456789,
        timezone: 'Europe/Kyiv',
      },
    });
    const res = createMockResponse();

    await upsertBotUser(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      user_id: 'f54ac10d-352f-4fbe-95ce-f1808850866f',
      telegram_user_id: 123456789,
      timezone: 'Europe/Kyiv',
    });
  });

  it('happy-path: POST /goals returns GoalBase', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    createGoalMock.mockResolvedValueOnce(goalRecord());

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        title: 'Read book',
        unit: 'pages',
        target_value: 100,
        end_date: '2026-03-20',
      },
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(201);
    expect(payload).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      user_id: 'user-1',
      status: 'active',
      target_value: 100,
    });
    expect(payload.current_value).toBeUndefined();
  });

  it('happy-path: GET /goals', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findManyGoalsMock.mockResolvedValueOnce([goalRecord()]);
    groupByProgressMock.mockResolvedValueOnce([
      {
        goalId: '11111111-1111-1111-1111-111111111111',
        _sum: { deltaValue: new Prisma.Decimal('40') },
      },
    ]);
    groupByProgressMock.mockResolvedValueOnce([
      {
        goalId: '11111111-1111-1111-1111-111111111111',
        _sum: { deltaValue: new Prisma.Decimal('28') },
      },
    ]);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      items: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'Read book',
        },
      ],
    });
  });

  it('happy-path: GET /goals/{goalId} returns GoalDetail', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('45') },
    });
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('28') },
    });
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('45') },
    });

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      current_value: 45,
      percent_complete: 45,
    });
  });

  it('happy-path: PATCH /goals/{goalId}', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('10') },
    });
    updateGoalMock.mockResolvedValueOnce(
      goalRecord({
        title: 'Read clean code',
        targetValue: new Prisma.Decimal('120'),
      })
    );

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        title: 'Read clean code',
        target_value: 120,
      },
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Read clean code',
      target_value: 120,
    });
  });

  it('happy-path: POST /goals/{goalId}/progress', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    txCreateProgressEventMock.mockResolvedValueOnce(progressEventRecord());
    txAggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('50'),
      },
    });

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 10,
      },
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      goal_id: '11111111-1111-1111-1111-111111111111',
      delta_value: 10,
    });
  });

  it('happy-path: GET /goals/{goalId}/progress', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    findManyProgressEventMock.mockResolvedValueOnce([progressEventRecord()]);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      items: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          delta_value: 10,
        },
      ],
    });
  });

  it('happy-path: PATCH /goals/{goalId}/progress/{eventId}', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    findFirstProgressEventMock.mockResolvedValueOnce(progressEventRecord());
    txUpdateManyProgressEventMock.mockResolvedValueOnce({ count: 1 });
    txFindFirstProgressEventInTxMock.mockResolvedValueOnce(
      progressEventRecord({ deltaValue: new Prisma.Decimal('12') })
    );
    txAggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('42'),
      },
    });

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/22222222-2222-2222-2222-222222222222',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 12,
      },
    });
    const res = createMockResponse();

    await progressEventWriteEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      delta_value: 12,
    });
  });

  it('happy-path: DELETE /goals/{goalId}/progress/{eventId}', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    txDeleteManyProgressEventMock.mockResolvedValueOnce({ count: 1 });
    txAggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('30'),
      },
    });

    const req = createJsonRequest({
      method: 'DELETE',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/22222222-2222-2222-2222-222222222222',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEventWriteEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
  });

  it('error-path: 401 unauthorized', async () => {
    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals',
      authorization: 'Bearer wrong-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({
      code: 'unauthorized',
      message: 'Invalid bot service token',
    });
  });

  it('error-path: 400 validation', async () => {
    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals',
      authorization: 'Bearer expected-token',
      telegramUserId: 'invalid-int64',
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({
      code: 'validation_error',
      message: 'X-Telegram-User-Id must be a valid int64',
    });
  });

  it('error-path: 404 user_not_found', async () => {
    findUniqueUserMock.mockResolvedValueOnce(null);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'user_not_found',
      message: 'User not found for provided telegram user id',
    });
  });

  it('error-path: 404 goal_not_found', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(null);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/33333333-3333-3333-3333-333333333333',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'goal_not_found',
      message: 'Goal not found',
    });
  });

  it('error-path: 404 event_not_found', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    findFirstProgressEventMock.mockResolvedValueOnce(null);

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/44444444-4444-4444-4444-444444444444',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 10,
      },
    });
    const res = createMockResponse();

    await progressEventWriteEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'event_not_found',
      message: 'Progress event not found',
    });
  });

  it('error-path: 409 target_below_progress', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('80'),
      },
    });

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        target_value: 70,
      },
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)).toEqual({
      code: 'target_below_progress',
      message: 'target_value cannot be less than current progress',
    });
  });

  it('error-path: 409 conflict for progress date before start_date', async () => {
    findUniqueUserMock.mockResolvedValueOnce(userRecord());
    findFirstGoalMock.mockResolvedValueOnce(goalRecord());

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 10,
        date: '2026-02-20',
      },
    });
    const res = createMockResponse();

    await progressEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)).toEqual({
      code: 'conflict',
      message: 'date cannot be before goal start_date',
    });
  });

  it('error-path: 405 method_not_allowed', async () => {
    const req = createJsonRequest({
      method: 'PUT',
      url: '/api/goals',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({
      code: 'method_not_allowed',
      message: 'Method not allowed',
    });
  });
});
