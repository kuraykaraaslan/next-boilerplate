import {
  type TenantUsageMetric, type TenantUsageSnapshot,
  currentMonth, redisKey, currentDay, dailyKey, endpointKey,
} from './tenant_usage.keys';
import {
  incrementApiCall, incrementAiTokens, incrementStorageBytes,
  incrementEmailSends, incrementSmsSends, incrementWebhookCall, decrementStorageBytes,
} from './tenant_usage.increment.service';
import {
  getDailyUsage, getEndpointBreakdown, getPeak, getUsage, getHistory,
} from './tenant_usage.read.service';
import { flushToDb, purgeOldUsage } from './tenant_usage.flush.service';

export type { TenantUsageMetric, TenantUsageSnapshot };

/**
 * Tenant usage-tracking service facade. The implementation is split across
 * focused modules (`tenant_usage.keys`, `tenant_usage.increment.service`,
 * `tenant_usage.read.service`, `tenant_usage.flush.service`); this class
 * preserves the single `TenantUsageService.*` entry point its callers depend on.
 */
export class TenantUsageService {
  static currentMonth(): string {
    return currentMonth();
  }

  static redisKey(tenantId: string, metric: string, month: string): string {
    return redisKey(tenantId, metric, month);
  }

  static currentDay(): string {
    return currentDay();
  }

  static dailyKey(tenantId: string, metric: string, day: string): string {
    return dailyKey(tenantId, metric, day);
  }

  static endpointKey(tenantId: string, month: string): string {
    return endpointKey(tenantId, month);
  }

  static incrementApiCall(tenantId: string, endpoint?: string): Promise<number> {
    return incrementApiCall(tenantId, endpoint);
  }

  static getDailyUsage(tenantId: string, metric: TenantUsageMetric, days = 30): Promise<Array<{ day: string; value: number }>> {
    return getDailyUsage(tenantId, metric, days);
  }

  static getEndpointBreakdown(tenantId: string, month?: string): Promise<Record<string, number>> {
    return getEndpointBreakdown(tenantId, month);
  }

  static getPeak(tenantId: string, metric: TenantUsageMetric, month?: string): Promise<number> {
    return getPeak(tenantId, metric, month);
  }

  static incrementAiTokens(tenantId: string, tokens: number): Promise<void> {
    return incrementAiTokens(tenantId, tokens);
  }

  static incrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
    return incrementStorageBytes(tenantId, bytes);
  }

  static incrementEmailSends(tenantId: string, count: number = 1): Promise<void> {
    return incrementEmailSends(tenantId, count);
  }

  static incrementSmsSends(tenantId: string, count: number = 1): Promise<void> {
    return incrementSmsSends(tenantId, count);
  }

  static incrementWebhookCall(tenantId: string, count: number = 1): Promise<void> {
    return incrementWebhookCall(tenantId, count);
  }

  static decrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
    return decrementStorageBytes(tenantId, bytes);
  }

  static getUsage(tenantId: string, month?: string): Promise<TenantUsageSnapshot> {
    return getUsage(tenantId, month);
  }

  static flushToDb(tenantId: string, month: string): Promise<void> {
    return flushToDb(tenantId, month);
  }

  static getHistory(tenantId: string, months = 12): Promise<Array<TenantUsageSnapshot & { month: string }>> {
    return getHistory(tenantId, months);
  }

  static purgeOldUsage(tenantId: string, keepMonths = 24): Promise<number> {
    return purgeOldUsage(tenantId, keepMonths);
  }
}
