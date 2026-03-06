import type { IncomingMessage, ServerResponse } from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import healthDb from '../api/health/db';
import { queryPostgres } from '../src/db/postgres';
import { createMockResponse } from './helpers/mock-response';

vi.mock('../src/db/postgres', () => ({
  queryPostgres: vi.fn(),
}));

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
