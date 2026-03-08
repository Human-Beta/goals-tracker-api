import type { IncomingMessage } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { botServiceAuthGuard, parseBearerToken } from '../src';
import { env } from '../src/config/env';

const initialBotServiceToken = env.BOT_SERVICE_TOKEN;

function createRequest(authorization?: string): IncomingMessage {
  return {
    headers: authorization ? { authorization } : {},
  } as IncomingMessage;
}

describe('botServiceAuthGuard', () => {
  afterEach(() => {
    env.BOT_SERVICE_TOKEN = initialBotServiceToken;
  });

  it('returns internal error when BOT_SERVICE_TOKEN is missing', () => {
    env.BOT_SERVICE_TOKEN = undefined;

    const result = botServiceAuthGuard(createRequest('Bearer any-token'));

    expect(result).toEqual({
      ok: false,
      statusCode: 500,
      error: {
        code: 'internal_error',
        message: 'Bot service token is not configured',
      },
    });
  });

  it('returns unauthorized when header token is invalid', () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';

    const result = botServiceAuthGuard(createRequest('Bearer invalid-token'));

    expect(result).toEqual({
      ok: false,
      statusCode: 401,
      error: {
        code: 'unauthorized',
        message: 'Invalid bot service token',
      },
    });
  });

  it('returns ok for valid bot service token', () => {
    env.BOT_SERVICE_TOKEN = 'expected-token';

    const result = botServiceAuthGuard(createRequest('Bearer expected-token'));

    expect(result).toEqual({ ok: true });
  });
});

describe('parseBearerToken', () => {
  it('extracts token from bearer header', () => {
    expect(parseBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('returns null for malformed header', () => {
    expect(parseBearerToken('Token abc123')).toBeNull();
  });

  it('returns null for undefined header', () => {
    expect(parseBearerToken(undefined)).toBeNull();
  });
});
