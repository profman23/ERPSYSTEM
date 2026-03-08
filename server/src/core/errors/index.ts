export {
  AppError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  TenantSuspendedError,
  QuotaExceededError,
  RateLimitedError,
  ServiceUnavailableError,
} from './AppError';

export type { ErrorCode } from './AppError';
