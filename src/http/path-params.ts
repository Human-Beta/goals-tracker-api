import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendValidationError } from './error-responses';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getPathSegments(req: IncomingMessage): string[] {
  const url = req.url ?? '';
  const pathname = new URL(url, 'http://localhost').pathname;

  return pathname.split('/').filter(Boolean);
}

export function resolveGoalIdParam(req: IncomingMessage, res: ServerResponse): string | null {
  const segments = getPathSegments(req);
  const goalsIndex = segments.lastIndexOf('goals');

  if (goalsIndex < 0 || goalsIndex + 1 >= segments.length) {
    sendValidationError(res, 'goalId is required');
    return null;
  }

  const goalId = segments[goalsIndex + 1];
  if (!goalId) {
    sendValidationError(res, 'goalId is required');
    return null;
  }

  if (!UUID_REGEX.test(goalId)) {
    sendValidationError(res, 'goalId must be a valid UUID');
    return null;
  }

  return goalId;
}

export type GoalProgressEventParams = {
  goalId: string;
  eventId: string;
};

export function extractGoalProgressEventParams(
  req: IncomingMessage,
  res: ServerResponse
): GoalProgressEventParams | null {
  const segments = getPathSegments(req);
  const progressIndex = segments.lastIndexOf('progress');

  if (progressIndex <= 0) {
    sendValidationError(res, 'goalId is required');
    return null;
  }

  const goalId = segments[progressIndex - 1];
  if (!goalId) {
    sendValidationError(res, 'goalId is required');
    return null;
  }

  if (!UUID_REGEX.test(goalId)) {
    sendValidationError(res, 'goalId must be a valid UUID');
    return null;
  }

  if (progressIndex + 1 >= segments.length) {
    sendValidationError(res, 'eventId is required');
    return null;
  }

  const eventId = segments[progressIndex + 1];
  if (!eventId) {
    sendValidationError(res, 'eventId is required');
    return null;
  }

  if (!UUID_REGEX.test(eventId)) {
    sendValidationError(res, 'eventId must be a valid UUID');
    return null;
  }

  return { goalId, eventId };
}
