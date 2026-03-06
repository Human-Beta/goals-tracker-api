import type { IncomingMessage, ServerResponse } from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import healthDb from '../api/health/db';
import { queryPostgres } from '../src/db/postgres';

vi.mock('../src/db/postgres', () => ({
  queryPostgres: vi.fn(),
}));

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

describe('GET /api/health/db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when database responds', async () => {
    vi.mocked(queryPostgres).mockResolvedValueOnce({} as never);
    const res = createMockResponse();

    await healthDb({} as IncomingMessage, res as unknown as ServerResponse);

    expect(queryPostgres).toHaveBeenCalledWith('SELECT 1');
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({ ok: true, database: 'up' });
  });

  it('returns 503 when database check fails', async () => {
    vi.mocked(queryPostgres).mockRejectedValueOnce(new Error('DB unavailable'));
    const res = createMockResponse();

    await healthDb({} as IncomingMessage, res as unknown as ServerResponse);

    expect(queryPostgres).toHaveBeenCalledWith('SELECT 1');
    expect(res.statusCode).toBe(503);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({ ok: false, database: 'down' });
  });
});
