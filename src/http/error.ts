import type { ServerResponse } from 'node:http';

export type ErrorPayload = {
  code: string;
  message: string;
};

export function createErrorPayload(code: string, message: string): ErrorPayload {
  return { code, message };
}

export function sendError(
  res: ServerResponse,
  statusCode: number,
  payload: ErrorPayload
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
