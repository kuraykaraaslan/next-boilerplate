export const TTL_SECONDS = 32 * 24 * 60 * 60; // 32 days

export type TenantUsageMetric =
  | 'apiCalls'
  | 'aiTokens'
  | 'storageBytes'
  | 'emailSends'
  | 'smsSends'
  | 'webhookCalls';

export const METRICS: TenantUsageMetric[] = [
  'apiCalls',
  'aiTokens',
  'storageBytes',
  'emailSends',
  'smsSends',
  'webhookCalls',
];

export interface TenantUsageSnapshot {
  apiCalls: number;
  aiTokens: number;
  storageBytes: number;
  emailSends: number;
  smsSends: number;
  webhookCalls: number;
}

export function currentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function redisKey(tenantId: string, metric: string, month: string): string {
  return `tenant:${tenantId}:usage:${metric}:${month}`;
}

/** Current day key (YYYY-MM-DD) for daily-granularity counters. */
export function currentDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyKey(tenantId: string, metric: string, day: string): string {
  return `tenant:${tenantId}:usage:${metric}:day:${day}`;
}

export function endpointKey(tenantId: string, month: string): string {
  return `tenant:${tenantId}:usage:endpoint:${month}`;
}
