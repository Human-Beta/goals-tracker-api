import type { ServerResponse } from 'node:http';

export const ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorPayload = {
  code: ErrorCode;
  message: string;
};

export function createErrorPayload(code: ErrorCode, message: string): ErrorPayload {
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
