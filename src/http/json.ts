import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendInvalidRequestBody } from './error-responses';

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer | string) => {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const rawBody = await readBody(req);
  return JSON.parse(rawBody);
}

export async function readJsonBodyOrSendInvalidRequest(req: IncomingMessage, res: ServerResponse): Promise<unknown> {
  try {
    return await readJsonBody(req);
  } catch {
    sendInvalidRequestBody(res);
    return null;
  }
}

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function sendOkJson(res: ServerResponse, payload: unknown): void {
  sendJson(res, 200, payload);
}

export function sendCreatedJson(res: ServerResponse, payload: unknown): void {
  sendJson(res, 201, payload);
}
