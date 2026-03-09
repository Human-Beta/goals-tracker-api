import type { IncomingMessage, ServerResponse } from 'node:http';

import { describe, expect, it } from 'vitest';

import { extractGoalProgressEventParams, resolveGoalIdParam } from '../src';
import { createMockResponse } from './helpers/mock-response';

const GOAL_ID = '11111111-1111-1111-1111-111111111111';
const EVENT_ID = '22222222-2222-2222-2222-222222222222';

function createRequest(url?: string): IncomingMessage {
  return { url } as IncomingMessage;
}

describe('path params helpers', () => {
  it('extracts goal id from goal update route', () => {
    const res = createMockResponse();

    expect(resolveGoalIdParam(createRequest(`/api/goals/${GOAL_ID}`), res as unknown as ServerResponse)).toBe(GOAL_ID);
  });

  it('extracts goal id from goal progress create route', () => {
    const res = createMockResponse();

    expect(resolveGoalIdParam(createRequest(`/api/goals/${GOAL_ID}/progress`), res as unknown as ServerResponse)).toBe(
      GOAL_ID
    );
  });

  it('returns validation error when goal id is not UUID', () => {
    const res = createMockResponse();

    expect(resolveGoalIdParam(createRequest('/api/goals/asd'), res as unknown as ServerResponse)).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'goalId must be a valid UUID',
    });
  });

  it('extracts goal and event ids from goal progress event route', () => {
    const res = createMockResponse();

    expect(
      extractGoalProgressEventParams(
        createRequest(`/api/goals/${GOAL_ID}/progress/${EVENT_ID}`),
        res as unknown as ServerResponse
      )
    ).toEqual({
      goalId: GOAL_ID,
      eventId: EVENT_ID,
    });
  });

  it('returns validation error when event id is missing', () => {
    const res = createMockResponse();

    expect(
      extractGoalProgressEventParams(createRequest(`/api/goals/${GOAL_ID}/progress`), res as unknown as ServerResponse)
    ).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'eventId is required',
    });
  });

  it('returns validation error when event id is not UUID', () => {
    const res = createMockResponse();

    expect(
      extractGoalProgressEventParams(
        createRequest(`/api/goals/${GOAL_ID}/progress/asd`),
        res as unknown as ServerResponse
      )
    ).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'eventId must be a valid UUID',
    });
  });
});
