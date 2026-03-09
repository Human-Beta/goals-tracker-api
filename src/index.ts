export { default as AxiosUtils } from './utils/AxiosUtils';
export { botServiceAuthGuard, parseBearerToken } from './auth/bot-service-auth';
export { getPrismaClient, prisma } from './db/prisma';
export { goalSelect, mapGoalResponse } from './goals/response';
export { resolveGoalForUser } from './goals/resolve-goal-for-user';
export { createGoalPayloadSchema, updateGoalPayloadSchema } from './goals/validation';
export { mapProgressEventResponse, progressEventSelect } from './progress/response';
export { recomputeGoalStatus } from './progress/status';
export { createProgressEventPayloadSchema, updateProgressEventPayloadSchema } from './progress/validation';
export { createErrorPayload, sendError, ERROR_CODES } from './http/error';
export {
  sendConflict,
  sendEventNotFound,
  sendGoalNotFound,
  sendInternalError,
  sendInvalidRequestBody,
  sendMethodNotAllowed,
  sendTargetBelowProgress,
  sendUnitImmutable,
  sendUserNotFound,
  sendValidationError,
} from './http/error-responses';
export {
  readBody,
  readJsonBody,
  readJsonBodyOrSendInvalidRequest,
  sendCreatedJson,
  sendJson,
  sendOkJson,
} from './http/json';
export { resolveGoalIdParam, extractGoalProgressEventParams } from './http/path-params';
export type { GoalProgressEventParams } from './http/path-params';
export { parseTelegramUserIdHeader } from './http/telegram-user-id';
export { resolveTelegramRequestUser } from './http/telegram-user-context';
export { withBotServiceAuth } from './http/with-bot-service-auth';
export { formatIsoDate, isIsoDate, parseIsoDate } from './utils/iso-date';
export { INT64_MAX, INT64_MIN, parseInt64 } from './utils/int64';
export { getUserLocalToday } from './utils/user-local-today';

export type { BotServiceAuthResult } from './auth/bot-service-auth';
export type { ErrorCode, ErrorPayload } from './http/error';
export type { TelegramUserIdParseResult } from './http/telegram-user-id';
export type { TelegramRequestUser } from './http/telegram-user-context';
export type { ApiHandler } from './http/with-bot-service-auth';
export type { GoalRecord } from './goals/response';
export type { ProgressEventRecord } from './progress/response';
