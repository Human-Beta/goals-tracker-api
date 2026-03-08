import type { IncomingMessage } from 'node:http';

import { describe, expect, it } from 'vitest';

import { parseTelegramUserIdHeader } from '../src';

function createRequest(headerValue?: string | string[]): IncomingMessage {
  return {
    headers: headerValue === undefined ? {} : { 'x-telegram-user-id': headerValue },
  } as IncomingMessage;
}

describe('parseTelegramUserIdHeader', () => {
  it('returns validation error when X-Telegram-User-Id header is missing', () => {
    expect(parseTelegramUserIdHeader(createRequest())).toEqual({
      ok: false,
      message: 'X-Telegram-User-Id header is required',
    });
  });

  it('returns validation error when X-Telegram-User-Id is not a valid int64', () => {
    expect(parseTelegramUserIdHeader(createRequest('abc'))).toEqual({
      ok: false,
      message: 'X-Telegram-User-Id must be a valid int64',
    });
  });

  it('parses valid X-Telegram-User-Id header value', () => {
    expect(parseTelegramUserIdHeader(createRequest('123456789'))).toEqual({
      ok: true,
      telegramUserId: 123456789n,
    });
  });

  it('uses first value when X-Telegram-User-Id header is provided as array', () => {
    expect(parseTelegramUserIdHeader(createRequest(['987654321', '123456789']))).toEqual({
      ok: true,
      telegramUserId: 987654321n,
    });
  });
});
