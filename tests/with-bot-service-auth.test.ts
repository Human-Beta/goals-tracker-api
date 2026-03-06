import type { IncomingMessage, ServerResponse } from 'node:http';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { withBotServiceAuth } from '../src';
import { env } from '../src/config/env';

const initialBotServiceToken = env.BOT_SERVICE_TOKEN;

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (name: string, value: string) => MockResponse;
  end: (payload?: unknown) => MockResponse;
};

function createRequest(authorization?: string): IncomingMessage {
  return {
    headers: authorization ? { authorization } : {},
  } as IncomingMessage;
}

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

describe('withBotServiceAuth', () => {
  afterEach(() => {
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('returns auth error and does not call wrapped handler when token is invalid', async () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';
    const handler = vi.fn();
    const wrappedHandler = withBotServiceAuth(handler);
    const res = createMockResponse();

    await wrappedHandler(
      createRequest('Bearer invalid-token'),
      res as unknown as ServerResponse
    );

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Invalid bot service token',
    });
  });

  it('calls wrapped handler when token is valid', async () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';
    const handler = vi.fn();
    const wrappedHandler = withBotServiceAuth(handler);
    const req = createRequest('Bearer expected-token');
    const res = createMockResponse();

    await wrappedHandler(req, res as unknown as ServerResponse);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(req, res);
  });
});
