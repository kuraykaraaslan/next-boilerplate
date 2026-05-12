export const ErrorCode = {
  // Authentication & Session
  UNAUTHORIZED:               'UNAUTHORIZED',
  SESSION_EXPIRED:            'SESSION_EXPIRED',
  INVALID_CREDENTIALS:        'INVALID_CREDENTIALS',
  OTP_REQUIRED:               'OTP_REQUIRED',
  TOTP_REQUIRED:              'TOTP_REQUIRED',

  // Authorization
  FORBIDDEN:                  'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS:   'INSUFFICIENT_PERMISSIONS',
  INSUFFICIENT_SCOPE:         'INSUFFICIENT_SCOPE',

  // Tenant
  TENANT_NOT_FOUND:           'TENANT_NOT_FOUND',
  TENANT_INACTIVE:            'TENANT_INACTIVE',
  TENANT_SUSPENDED:           'TENANT_SUSPENDED',
  NOT_TENANT_MEMBER:          'NOT_TENANT_MEMBER',

  // Billing
  SUBSCRIPTION_REQUIRED:      'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED:       'SUBSCRIPTION_EXPIRED',
  GRACE_PERIOD_EXPIRED:       'GRACE_PERIOD_EXPIRED',
  SEAT_LIMIT_REACHED:         'SEAT_LIMIT_REACHED',
  FEATURE_NOT_AVAILABLE:      'FEATURE_NOT_AVAILABLE',
  QUOTA_EXCEEDED:             'QUOTA_EXCEEDED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED:        'RATE_LIMIT_EXCEEDED',

  // Resources
  NOT_FOUND:                  'NOT_FOUND',
  CONFLICT:                   'CONFLICT',
  VALIDATION_ERROR:           'VALIDATION_ERROR',

  // Server
  INTERNAL_ERROR:             'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(
    message: string,
    public readonly statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }

  toJSON(): { code: ErrorCode; message: string } {
    return { code: this.code, message: this.message };
  }
}

export function toErrorResponse(error: unknown): { code: string; message: string } {
  if (error instanceof AppError) return error.toJSON();
  if (error instanceof Error) return { code: ErrorCode.INTERNAL_ERROR, message: error.message };
  return { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred' };
}
