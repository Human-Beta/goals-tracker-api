import type { ServerResponse } from 'node:http';

import { describe, expect, it } from 'vitest';

import { sendMethodNotAllowed } from '../src';
import { createMockResponse } from './helpers/mock-response';

describe('http method helpers', () => {
  it('writes method_not_allowed response with Allow header', () => {
    const res = createMockResponse();

    sendMethodNotAllowed(res as unknown as ServerResponse, ['post']);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'method_not_allowed',
      message: 'Method not allowed',
    });
  });
});
