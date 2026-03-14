import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createMockResponse } from './helpers/mock-response';

const { findUniqueUserMock, findFirstGoalMock, groupByProgressEventMock } = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
  findFirstGoalMock: vi.fn(),
  groupByProgressEventMock: vi.fn(),
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
      groupBy: groupByProgressEventMock,
    },
  },
}));

import progressTotalDaysEndpoint from '../api/goals/[goalId]/progress/total-days';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method: RequestMethod;
  url: string;
  authorization?: string;
  telegramUserId?: string;
};

const initialBotServiceToken = env.BOT_SERVICE_TOKEN;

function createJsonRequest({ method, url, authorization, telegramUserId }: RequestOptions): IncomingMessage {
  const req = Readable.from(['']) as unknown as IncomingMessage;

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

describe('progress total-days endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.BOT_SERVICE_TOKEN = 'expected-token';
  });

  afterEach(() => {
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('returns count of unique progress dates for a goal', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce({
      id: '11111111-1111-1111-1111-111111111111',
    });
    groupByProgressEventMock.mockResolvedValueOnce([
      { date: new Date('2026-03-03T00:00:00.000Z') },
      { date: new Date('2026-03-05T00:00:00.000Z') },
    ]);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/total-days',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressTotalDaysEndpoint(req, res as unknown as ServerResponse);

    expect(groupByProgressEventMock).toHaveBeenCalledWith({
      by: ['date'],
      where: {
        goalId: '11111111-1111-1111-1111-111111111111',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      goal_id: '11111111-1111-1111-1111-111111111111',
      total_days: 2,
    });
  });

  it('returns zero when goal has no progress events', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });
    findFirstGoalMock.mockResolvedValueOnce({
      id: '11111111-1111-1111-1111-111111111111',
    });
    groupByProgressEventMock.mockResolvedValueOnce([]);

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/total-days',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressTotalDaysEndpoint(req, res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      goal_id: '11111111-1111-1111-1111-111111111111',
      total_days: 0,
    });
  });

  it('returns 401 when service auth token is invalid', async () => {
    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/total-days',
      authorization: 'Bearer wrong-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressTotalDaysEndpoint(req, res as unknown as ServerResponse);

    expect(findUniqueUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({
      code: 'unauthorized',
      message: 'Invalid bot service token',
    });
  });

  it('returns 400 when goalId is not a valid UUID', async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: 'user-1',
      timezone: 'Europe/Kyiv',
    });

    const req = createJsonRequest({
      method: 'GET',
      url: '/api/goals/not-uuid/progress/total-days',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressTotalDaysEndpoint(req, res as unknown as ServerResponse);

    expect(findFirstGoalMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'goalId must be a valid UUID',
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
      url: '/api/goals/33333333-3333-3333-3333-333333333333/progress/total-days',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressTotalDaysEndpoint(req, res as unknown as ServerResponse);

    expect(groupByProgressEventMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      code: 'goal_not_found',
      message: 'Goal not found',
    });
  });

  it('returns 405 for non-GET methods', async () => {
    const req = createJsonRequest({
      method: 'POST',
      url: '/api/goals/11111111-1111-1111-1111-111111111111/progress/total-days',
      authorization: 'Bearer expected-token',
      telegramUserId: '123456',
    });
    const res = createMockResponse();

    await progressTotalDaysEndpoint(req, res as unknown as ServerResponse);

    expect(findUniqueUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({
      code: 'method_not_allowed',
      message: 'Method not allowed',
    });
  });
});
