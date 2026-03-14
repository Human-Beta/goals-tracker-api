import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const { findUniqueUserMock, findManyGoalsMock, findFirstGoalMock, groupByProgressMock, aggregateProgressMock } =
  vi.hoisted(() => ({
    findUniqueUserMock: vi.fn(),
    findManyGoalsMock: vi.fn(),
    findFirstGoalMock: vi.fn(),
    groupByProgressMock: vi.fn(),
    aggregateProgressMock: vi.fn(),
  }));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
    },
    goal: {
      findMany: findManyGoalsMock,
      findFirst: findFirstGoalMock,
    },
    progressEvent: {
      groupBy: groupByProgressMock,
      aggregate: aggregateProgressMock,
    },
  },
}));

import goalsEndpoint from '../api/goals';
import goalEndpoint from '../api/goals/[goalId]';

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

function createGoalDetailRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'user-1',
    title: 'Read book',
    unit: 'pages',
    targetValue: new Prisma.Decimal('100'),
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-10T00:00:00.000Z'),
    status: 'active',
    createdAt: new Date('2026-03-01T09:00:00.000Z'),
    updatedAt: new Date('2026-03-01T09:00:00.000Z'),
    ...overrides,
  };
}

function createGoalListRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Read book',
    targetValue: new Prisma.Decimal('100'),
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('goals read endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
    env.BOT_SERVICE_TOKEN = 'expected-token';
  });

  afterEach(() => {
    vi.useRealTimers();
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('returns goals list with summary metrics', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findManyGoalsMock.mockResolvedValueOnce([
      createGoalListRecord(),
      createGoalListRecord({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Run distance',
        targetValue: new Prisma.Decimal('50'),
        startDate: new Date('2026-03-03T00:00:00.000Z'),
        endDate: new Date('2026-03-15T00:00:00.000Z'),
      }),
    ]);
    groupByProgressMock.mockResolvedValueOnce([
      {
        goalId: '11111111-1111-1111-1111-111111111111',
        _sum: { deltaValue: new Prisma.Decimal('40') },
      },
      {
        goalId: '22222222-2222-2222-2222-222222222222',
        _sum: { deltaValue: new Prisma.Decimal('10') },
      },
    ]);
    groupByProgressMock.mockResolvedValueOnce([
      {
        goalId: '11111111-1111-1111-1111-111111111111',
        _sum: { deltaValue: new Prisma.Decimal('35') },
      },
      {
        goalId: '22222222-2222-2222-2222-222222222222',
        _sum: { deltaValue: new Prisma.Decimal('4') },
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

    expect(groupByProgressMock).toHaveBeenCalledTimes(2);
    expect(groupByProgressMock.mock.calls[1]?.[0]).toMatchObject({
      where: {
        date: {
          gte: new Date('2026-03-02T00:00:00.000Z'),
          lte: new Date('2026-03-08T00:00:00.000Z'),
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      items: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'Read book',
          percent_complete: 40,
          days_left: 2,
          pace_current_7d: 5,
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          title: 'Run distance',
          percent_complete: 20,
          days_left: 7,
          pace_current_7d: 4 / 6,
        },
      ],
    });
  });

  it('returns goal details with computed metrics', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalDetailRecord());
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('40') },
    });
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('35') },
    });
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('40') },
    });

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(aggregateProgressMock).toHaveBeenCalledTimes(3);
    expect(aggregateProgressMock.mock.calls[1]?.[0]).toMatchObject({
      where: {
        goalId: '11111111-1111-1111-1111-111111111111',
        date: {
          gte: new Date('2026-03-02T00:00:00.000Z'),
          lte: new Date('2026-03-08T00:00:00.000Z'),
        },
      },
    });
    expect(aggregateProgressMock.mock.calls[2]?.[0]).toMatchObject({
      where: {
        goalId: '11111111-1111-1111-1111-111111111111',
        date: {
          gte: new Date('2026-02-07T00:00:00.000Z'),
          lte: new Date('2026-03-08T00:00:00.000Z'),
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const response = JSON.parse(res.body);
    expect(response).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      current_value: 40,
      remaining_value: 60,
      percent_complete: 40,
      days_left: 2,
      days_left_for_pace: 3,
      days_total: 10,
      days_elapsed: 8,
      pace_expected_per_day: 10,
      pace_required_per_day: 20,
      pace_current_7d: 5,
      pace_current_30d: 5,
      pace_current_all: 5,
      eta_date: '2026-03-20',
      expected_by_today: 80,
      behind_value: 40,
      catchup_pace_next_7_days: 110 / 7,
    });
  });

  it('returns eta_date null on boundary case when days_left_for_pace and pace_current_7d are zero', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(
      createGoalDetailRecord({
        endDate: new Date('2026-03-07T00:00:00.000Z'),
      })
    );
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('20') },
    });
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('0') },
    });
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: { deltaValue: new Prisma.Decimal('20') },
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
      days_left: 0,
      days_left_for_pace: 0,
      pace_required_per_day: 0,
      pace_current_7d: 0,
      eta_date: null,
    });
  });

  it('returns 401 for unauthorized read request', async () => {
    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals',
      authorization: 'Bearer wrong-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalsEndpoint(req, res as unknown as ServerResponse);

    expect(findUniqueUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({
      code: 'unauthorized',
      message: 'Invalid bot service token',
    });
  });

  it('returns 404 when goal is not found for get by id', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
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

  it('returns 500 when goal lookup fails', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockRejectedValueOnce(new Error('db unavailable'));

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/33333333-3333-3333-3333-333333333333',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({
      code: 'internal_error',
      message: 'Failed to resolve goal',
    });
  });

  it('returns 400 when goalId is invalid for get by id', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/not-uuid',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await goalEndpoint(req, res as unknown as ServerResponse);

    expect(findFirstGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'goalId must be a valid UUID',
    });
  });
});
