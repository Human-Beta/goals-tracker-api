import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { GoalStatus, Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const {
  findUniqueUserMock,
  findFirstGoalMock,
  findFirstProgressEventMock,
  transactionMock,
  txCreateProgressEventMock,
  txUpdateManyProgressEventMock,
  txDeleteManyProgressEventMock,
  txFindFirstProgressEventInTxMock,
  txAggregateProgressMock,
  txUpdateGoalMock,
} = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
  findFirstGoalMock: vi.fn(),
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
      findUnique: findUniqueUserMock,
    },
    goal: {
      findFirst: findFirstGoalMock,
    },
    progressEvent: {
      findFirst: findFirstProgressEventMock,
    },
    $transaction: transactionMock,
  },
}));

import createProgressEvent from '../api/goals/[goalId]/progress';
import progressEventWriteHandler from '../api/goals/[goalId]/progress/[eventId]';

type RequestMethod = 'POST' | 'PATCH' | 'DELETE' | 'GET' | 'PUT';

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
    date: new Date('2026-03-07T00:00:00.000Z'),
    deltaValue: new Prisma.Decimal('20'),
    note: 'initial note',
    createdAt: new Date('2026-03-07T10:00:00.000Z'),
    updatedAt: new Date('2026-03-07T10:00:00.000Z'),
    ...overrides,
  };
}

describe('progress write endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
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

  it('creates progress event successfully with default date and transitions goal to completed', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    txCreateProgressEventMock.mockResolvedValueOnce(
      createProgressEventRecord({
        date: new Date('2026-03-08T00:00:00.000Z'),
        deltaValue: new Prisma.Decimal('40'),
        note: 'evening session',
        updatedAt: new Date('2026-03-08T12:00:00.000Z'),
      })
    );
    txAggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('100'),
      },
    });

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 40,
        note: 'evening session',
      },
    });
    const res = createMockResponse();

    await createProgressEvent(req, res as unknown as ServerResponse);

    expect(txCreateProgressEventMock).toHaveBeenCalledWith({
      data: {
        goalId: '11111111-1111-1111-1111-111111111111',
        date: new Date('2026-03-08T00:00:00.000Z'),
        deltaValue: new Prisma.Decimal('40'),
        note: 'evening session',
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
    expect(txUpdateGoalMock).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { status: GoalStatus.completed },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      goal_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-03-08',
      delta_value: 40,
      note: 'evening session',
      created_at: '2026-03-07T10:00:00.000Z',
      updated_at: '2026-03-08T12:00:00.000Z',
    });
  });

  it('updates progress event successfully without date and keeps original date', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    findFirstProgressEventMock.mockResolvedValueOnce(createProgressEventRecord());
    txUpdateManyProgressEventMock.mockResolvedValueOnce({ count: 1 });
    txFindFirstProgressEventInTxMock.mockResolvedValueOnce(
      createProgressEventRecord({
        deltaValue: new Prisma.Decimal('30'),
        updatedAt: new Date('2026-03-08T13:00:00.000Z'),
      })
    );
    txAggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('75'),
      },
    });

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/22222222-2222-2222-2222-222222222222',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 30,
      },
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(txUpdateManyProgressEventMock).toHaveBeenCalledWith({
      where: {
        id: '22222222-2222-2222-2222-222222222222',
        goalId: '11111111-1111-1111-1111-111111111111',
      },
      data: {
        deltaValue: new Prisma.Decimal('30'),
      },
    });
    expect(txFindFirstProgressEventInTxMock).toHaveBeenCalledWith({
      where: {
        id: '22222222-2222-2222-2222-222222222222',
        goalId: '11111111-1111-1111-1111-111111111111',
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
    expect(txUpdateGoalMock).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { status: GoalStatus.active },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      goal_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-03-07',
      delta_value: 30,
      note: 'initial note',
      created_at: '2026-03-07T10:00:00.000Z',
      updated_at: '2026-03-08T13:00:00.000Z',
    });
  });

  it('deletes progress event successfully and transitions goal to active', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(
      createGoalRecord({
        targetValue: new Prisma.Decimal('100'),
      })
    );
    txDeleteManyProgressEventMock.mockResolvedValueOnce({ count: 1 });
    txAggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('90'),
      },
    });

    const req = createJsonRequest({
      method: 'DELETE',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/22222222-2222-2222-2222-222222222222',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(txDeleteManyProgressEventMock).toHaveBeenCalledWith({
      where: {
        id: '22222222-2222-2222-2222-222222222222',
        goalId: '11111111-1111-1111-1111-111111111111',
      },
    });
    expect(txUpdateGoalMock).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { status: GoalStatus.active },
    });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
  });

  it('returns 400 when create date is in the future', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 10,
        date: '2026-03-09',
      },
    });
    const res = createMockResponse();

    await createProgressEvent(req, res as unknown as ServerResponse);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'date cannot be in the future',
    });
  });

  it('returns 400 when create goalId is not a valid UUID', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/asd/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 10,
      },
    });
    const res = createMockResponse();

    await createProgressEvent(req, res as unknown as ServerResponse);

    expect(findFirstGoalMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'goalId must be a valid UUID',
    });
  });

  it('returns 409 when patch date is before goal start_date', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    findFirstProgressEventMock.mockResolvedValueOnce(createProgressEventRecord());

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/22222222-2222-2222-2222-222222222222',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        date: '2026-02-28',
      },
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)).toEqual({
      code: 'conflict',
      message: 'date cannot be before goal start_date',
    });
  });

  it('returns 400 when patch eventId is not a valid UUID', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/asd',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 15,
      },
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(findFirstGoalMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'eventId must be a valid UUID',
    });
  });

  it('returns 404 when user is not found', async () => {
    findUniqueUserMock.mockResolvedValueOnce(null);

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

    await createProgressEvent(req, res as unknown as ServerResponse);

    expect(findFirstGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'user_not_found',
      message: 'User not found for provided telegram user id',
    });
  });

  it('returns 404 when goal is not found', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(null);

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/33333333-3333-3333-3333-333333333333/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 10,
      },
    });
    const res = createMockResponse();

    await createProgressEvent(req, res as unknown as ServerResponse);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'goal_not_found',
      message: 'Goal not found',
    });
  });

  it('returns 404 when progress event is not found', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    findFirstProgressEventMock.mockResolvedValueOnce(null);

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/44444444-4444-4444-4444-444444444444',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 15,
      },
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'event_not_found',
      message: 'Progress event not found',
    });
  });

  it('returns 500 when progress event lookup fails', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    findFirstProgressEventMock.mockRejectedValueOnce(new Error('db unavailable'));

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/44444444-4444-4444-4444-444444444444',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        delta_value: 15,
      },
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({
      code: 'internal_error',
      message: 'Failed to resolve progress event',
    });
  });

  it('returns method_not_allowed for create endpoint', async () => {
    const req = createJsonRequest({
      method: 'PUT',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await createProgressEvent(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
    expect(JSON.parse(res.body)).toEqual({
      code: 'method_not_allowed',
      message: 'Method not allowed',
    });
  });

  it('returns method_not_allowed for patch/delete endpoint', async () => {
    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/22222222-2222-2222-2222-222222222222',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressEventWriteHandler(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('PATCH, DELETE');
    expect(JSON.parse(res.body)).toEqual({
      code: 'method_not_allowed',
      message: 'Method not allowed',
    });
  });
});
