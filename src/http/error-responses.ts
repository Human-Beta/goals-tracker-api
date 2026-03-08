import type { ServerResponse } from 'node:http';

import { createErrorPayload, sendError } from './error';

export function sendValidationError(res: ServerResponse, message: string): void {
  sendError(res, 400, createErrorPayload('validation_error', message));
}

export function sendInvalidRequestBody(res: ServerResponse): void {
  sendValidationError(res, 'Invalid request body');
}

export function sendUserNotFound(res: ServerResponse): void {
  sendError(res, 404, createErrorPayload('user_not_found', 'User not found for provided telegram user id'));
}

export function sendGoalNotFound(res: ServerResponse): void {
  sendError(res, 404, createErrorPayload('goal_not_found', 'Goal not found'));
}

export function sendUnitImmutable(res: ServerResponse): void {
  sendError(res, 400, createErrorPayload('unit_immutable', 'unit cannot be changed after goal creation'));
}

export function sendTargetBelowProgress(res: ServerResponse): void {
  sendError(res, 409, createErrorPayload('target_below_progress', 'target_value cannot be less than current progress'));
}

export function sendInternalError(res: ServerResponse, message: string): void {
  sendError(res, 500, createErrorPayload('internal_error', message));
}

function normalizeAllowedMethods(methods: string[]): string[] {
  return methods.map(method => method.toUpperCase());
}

export function sendMethodNotAllowed(res: ServerResponse, allowedMethods: string[]): void {
  const normalizedMethods = normalizeAllowedMethods(allowedMethods);

  res.setHeader('Allow', normalizedMethods.join(', '));
  sendError(res, 405, createErrorPayload('method_not_allowed', 'Method not allowed'));
}
