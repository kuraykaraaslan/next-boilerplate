/**
 * Minimum structured-log context every module should attach to log entries, so
 * logs are filterable by tenant/user/request/trace (and deployment region)
 * across the whole platform. All fields optional — attach what the call site
 * knows.
 *
 * Dependency-free: pure type contract, no runtime.
 */
export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  region?: string;
}
