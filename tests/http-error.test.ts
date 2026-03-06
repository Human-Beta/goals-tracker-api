import type { ServerResponse } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createErrorPayload, sendError } from '../src';
import { createMockResponse } from './helpers/mock-response';

describe('http error helpers', () => {
  it('creates standard error payload', () => {
    expect(createErrorPayload('UNAUTHORIZED', 'Token is invalid')).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Token is invalid',
    });
  });

  it('writes JSON error response in standard format', () => {
    const res = createMockResponse();
    const payload = createErrorPayload('NOT_FOUND', 'Goal not found');

    sendError(res as unknown as ServerResponse, 404, payload);

    expect(res.statusCode).toBe(404);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual(payload);
  });
});
