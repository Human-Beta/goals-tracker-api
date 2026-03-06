import type { ServerResponse } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createErrorPayload, sendError } from '../src/http/error';

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (name: string, value: string) => MockResponse;
  end: (payload?: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    end(payload?: unknown) {
      this.body = typeof payload === 'string' ? payload : '';
      return this;
    },
  };
}

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
