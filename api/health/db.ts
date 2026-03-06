import type { IncomingMessage, ServerResponse } from 'node:http';

import { queryPostgres } from '@/db/postgres';

export default async function healthDb(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await queryPostgres('SELECT 1');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, database: 'up' }));
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, database: 'down' }));
  }
}
