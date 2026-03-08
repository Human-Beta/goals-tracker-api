import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  readBody,
  readJsonBody,
  readJsonBodyOrSendInvalidRequest,
  sendCreatedJson,
  sendJson,
  sendOkJson,
} from '../src';
import { createMockResponse } from './helpers/mock-response';

function createRequestFromChunks(chunks: Array<string | Buffer>): IncomingMessage {
  return Readable.from(chunks) as unknown as IncomingMessage;
}

describe('http json helpers', () => {
  it('readBody joins string and buffer chunks into UTF-8 text', async () => {
    const req = createRequestFromChunks(['{"title":"Read', Buffer.from(' book"}')]);

    await expect(readBody(req)).resolves.toBe('{"title":"Read book"}');
  });

  it('readBody rejects when request emits an error', async () => {
    const req = new Readable({ read() {} }) as unknown as IncomingMessage;
    const error = new Error('stream failed');
    const readBodyPromise = readBody(req);

    (req as unknown as Readable).emit('error', error);

    await expect(readBodyPromise).rejects.toBe(error);
  });

  it('readJsonBody parses valid JSON payload', async () => {
    const req = createRequestFromChunks(['{"target_value":42}']);

    await expect(readJsonBody(req)).resolves.toEqual({ target_value: 42 });
  });

  it('readJsonBody rejects for malformed JSON', async () => {
    const req = createRequestFromChunks(['{']);

    await expect(readJsonBody(req)).rejects.toBeInstanceOf(SyntaxError);
  });

  it('readJsonBodyOrSendInvalidRequest returns parsed payload for valid JSON', async () => {
    const req = createRequestFromChunks(['{"unit":"pages"}']);
    const res = createMockResponse();

    const payload = await readJsonBodyOrSendInvalidRequest(req, res as unknown as ServerResponse);

    expect(payload).toEqual({ unit: 'pages' });
    expect(res.statusCode).toBe(0);
    expect(res.body).toBe('');
  });

  it('readJsonBodyOrSendInvalidRequest writes validation error for malformed JSON', async () => {
    const req = createRequestFromChunks(['{']);
    const res = createMockResponse();

    const payload = await readJsonBodyOrSendInvalidRequest(req, res as unknown as ServerResponse);

    expect(payload).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({
      code: 'validation_error',
      message: 'Invalid request body',
    });
  });

  it('sendJson writes status, content type and JSON payload', () => {
    const res = createMockResponse();

    sendJson(res as unknown as ServerResponse, 202, { ok: true, goal_id: 'goal-1' });

    expect(res.statusCode).toBe(202);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({ ok: true, goal_id: 'goal-1' });
  });

  it('sendOkJson writes 200 response', () => {
    const res = createMockResponse();

    sendOkJson(res as unknown as ServerResponse, { ok: true });

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('sendCreatedJson writes 201 response', () => {
    const res = createMockResponse();

    sendCreatedJson(res as unknown as ServerResponse, { id: 'goal-1' });

    expect(res.statusCode).toBe(201);
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res.body)).toEqual({ id: 'goal-1' });
  });
});
