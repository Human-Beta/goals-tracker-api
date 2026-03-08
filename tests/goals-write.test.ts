import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const { findUniqueUserMock, createGoalMock, findFirstGoalMock, updateGoalMock, aggregateProgressMock } = vi.hoisted(
  () => ({
    findUniqueUserMock: vi.fn(),
    createGoalMock: vi.fn(),
    findFirstGoalMock: vi.fn(),
    updateGoalMock: vi.fn(),
    aggregateProgressMock: vi.fn(),
  })
);

vi.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
    },
    goal: {
      create: createGoalMock,
      findFirst: findFirstGoalMock,
      update: updateGoalMock,
    },
    progressEvent: {
      aggregate: aggregateProgressMock,
    },
  },
}));

import createGoal from '../api/goals';
import updateGoal from '../api/goals/[goalId]';

type RequestOptions = {
  method: 'POST' | 'PATCH';
  url: string;
  authorization?: string;
  telegramUserId?: string;
  body?: unknown;
};

const initialBotServiceToken = env.BOT_SERVICE_TOKEN;

function createJsonRequest({ method, url, authorization, telegramUserId, body }: RequestOptions): IncomingMessage {
  const payload = JSON.stringify(body ?? {});
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
    id: 'goal-1',
    userId: 'user-1',
    title: 'Read book',
    unit: 'pages',
    targetValue: new Prisma.Decimal('100'),
    startDate: new Date('2026-03-08T00:00:00.000Z'),
    endDate: new Date('2026-03-20T00:00:00.000Z'),
    status: 'active',
    createdAt: new Date('2026-03-08T10:00:00.000Z'),
    updatedAt: new Date('2026-03-08T10:00:00.000Z'),
    ...overrides,
  };
}

describe('goals write endpoints', () => {
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

  it('creates goal successfully with default start_date', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    createGoalMock.mockResolvedValueOnce(createGoalRecord());

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

    await createGoal(req, res as unknown as ServerResponse);

    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { telegramUserId: 123456n },
      select: { id: true, timezone: true },
    });
    expect(createGoalMock).toHaveBeenCalledTimes(1);
    expect(createGoalMock.mock.calls[0]?.[0]).toMatchObject({
      data: {
        userId: 'user-1',
        title: 'Read book',
        unit: 'pages',
        startDate: new Date('2026-03-08T00:00:00.000Z'),
        endDate: new Date('2026-03-20T00:00:00.000Z'),
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      id: 'goal-1',
      user_id: 'user-1',
      title: 'Read book',
      unit: 'pages',
      target_value: 100,
      start_date: '2026-03-08',
      end_date: '2026-03-20',
      status: 'active',
      created_at: '2026-03-08T10:00:00.000Z',
      updated_at: '2026-03-08T10:00:00.000Z',
    });
  });

  it('updates goal successfully', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('20'),
      },
    });
    updateGoalMock.mockResolvedValueOnce(
      createGoalRecord({
        title: 'Read clean code',
        targetValue: new Prisma.Decimal('120'),
        endDate: new Date('2026-03-25T00:00:00.000Z'),
        updatedAt: new Date('2026-03-08T13:00:00.000Z'),
      })
    );

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/goal-1',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        title: 'Read clean code',
        target_value: 120,
        end_date: '2026-03-25',
      },
    });
    const res = createMockResponse();

    await updateGoal(req, res as unknown as ServerResponse);

    expect(aggregateProgressMock).toHaveBeenCalledWith({
      where: { goalId: 'goal-1' },
      _sum: { deltaValue: true },
    });
    expect(updateGoalMock).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      data: {
        title: 'Read clean code',
        targetValue: new Prisma.Decimal('120'),
        endDate: new Date('2026-03-25T00:00:00.000Z'),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        unit: true,
        targetValue: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      id: 'goal-1',
      user_id: 'user-1',
      title: 'Read clean code',
      unit: 'pages',
      target_value: 120,
      start_date: '2026-03-08',
      end_date: '2026-03-25',
      status: 'active',
      created_at: '2026-03-08T10:00:00.000Z',
      updated_at: '2026-03-08T13:00:00.000Z',
    });
  });

  it('returns 400 for invalid create dates', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        title: 'Read book',
        unit: 'pages',
        target_value: 100,
        start_date: '2026-03-09',
        end_date: '2026-03-20',
      },
    });
    const res = createMockResponse();

    await createGoal(req, res as unknown as ServerResponse);

    expect(createGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'start_date cannot be in the future',
    });
  });

  it('returns 400 for invalid update dates', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/goal-1',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        end_date: '2026-03-08',
      },
    });
    const res = createMockResponse();

    await updateGoal(req, res as unknown as ServerResponse);

    expect(updateGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'end_date must be strictly after today',
    });
  });

  it('returns 400 when unit change is requested', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/goal-1',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        unit: 'km',
      },
    });
    const res = createMockResponse();

    await updateGoal(req, res as unknown as ServerResponse);

    expect(updateGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'unit_immutable',
      message: 'unit cannot be changed after goal creation',
    });
  });

  it('returns 409 when target_value is below current progress', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce(createGoalRecord());
    aggregateProgressMock.mockResolvedValueOnce({
      _sum: {
        deltaValue: new Prisma.Decimal('80'),
      },
    });

    const req = createJsonRequest({
      method: 'PATCH',
      url: '/api/goals/goal-1',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        target_value: 70,
      },
    });
    const res = createMockResponse();

    await updateGoal(req, res as unknown as ServerResponse);

    expect(updateGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)).toEqual({
      code: 'target_below_progress',
      message: 'target_value cannot be less than current progress',
    });
  });

  it('returns 404 when user is not found', async () => {
    findUniqueUserMock.mockResolvedValueOnce(null);

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

    await createGoal(req, res as unknown as ServerResponse);

    expect(createGoalMock).not.toHaveBeenCalled();
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
      method: 'PATCH',
      url: '/api/goals/goal-missing',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
      body: {
        title: 'New title',
      },
    });
    const res = createMockResponse();

    await updateGoal(req, res as unknown as ServerResponse);

    expect(updateGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'goal_not_found',
      message: 'Goal not found',
    });
  });
});
