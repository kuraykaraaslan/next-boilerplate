/**
 * Public types for the observability facade. Kept dependency-free so callers
 * can import them without dragging Sentry / prom-client into client bundles.
 */

export interface ObservabilityTags {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  [k: string]: string | number | boolean | undefined;
}

export interface HttpRequestSample {
  tenantId?: string;
  route: string;
  method: string;
  status: number;
  latencyMs: number;
}

export interface TenantUsageSample {
  tenantId: string;
  metric: 'apiCalls' | 'aiTokens' | 'storageBytes' | 'emailSends' | 'smsSends' | (string & {});
  value: number;
}

export interface RecordErrorOptions {
  tenantId?: string;
  userId?: string;
  fingerprint?: string[];
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  extra?: Record<string, unknown>;
}
