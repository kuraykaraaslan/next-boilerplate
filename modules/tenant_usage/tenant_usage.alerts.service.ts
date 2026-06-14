import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { getDataSource } from '@/modules/db';
import WebhookService from '@/modules/webhook/webhook.service';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { TenantUsage } from './entities/tenant_usage.entity';
import { TenantUsageService, type TenantUsageMetric, type TenantUsageSnapshot } from './tenant_usage.service';

// Metered metrics that map to a per-month plan quota feature key.
const METRIC_QUOTA_KEY: Partial<Record<TenantUsageMetric, string>> = {
  aiTokens: FEATURE_KEYS.FEATURE_AI_MONTHLY_TOKENS,
  emailSends: FEATURE_KEYS.FEATURE_EMAIL_MONTHLY_QUOTA,
  smsSends: FEATURE_KEYS.FEATURE_SMS_MONTHLY_QUOTA,
  storageBytes: FEATURE_KEYS.FEATURE_STORAGE_QUOTA_BYTES,
};

// Alert thresholds (percent of quota) that fire a usage.threshold webhook.
const ALERT_THRESHOLDS = [80, 95];

export interface OverageRow {
  metric: TenantUsageMetric;
  used: number;
  limit: number | null;
  unlimited: boolean;
  overUnits: number;
  percent: number | null;
}

export class TenantUsageAlertsService {

  /** Once-per-month-per-threshold dedup so alerts don't re-fire each sweep. */
  private static async alreadyAlerted(tenantId: string, metric: string, marker: string): Promise<boolean> {
    const month = TenantUsageService.currentMonth();
    const key = `tenant:${tenantId}:usage:alerted:${month}:${metric}:${marker}`;
    try {
      const set = await redis.set(key, '1', 'EX', 40 * 24 * 60 * 60, 'NX');
      return set === null; // null = key already existed → already alerted
    } catch {
      return false; // fail-open: better to risk a duplicate alert than miss one
    }
  }

  /**
   * Evaluate a tenant's metered usage against plan quotas and fire
   * `usage.threshold` (pre-exhaustion alerting) and `usage.overage` (billing
   * trigger) webhooks. Idempotent within a month via per-threshold dedup.
   * Designed to be called from the periodic usage job.
   */
  static async evaluateAlerts(tenantId: string): Promise<{ thresholds: number; overages: number }> {
    const usage = await TenantUsageService.getUsage(tenantId).catch(() => null);
    if (!usage) return { thresholds: 0, overages: 0 };
    let thresholds = 0, overages = 0;

    for (const [metric, featureKey] of Object.entries(METRIC_QUOTA_KEY) as [TenantUsageMetric, string][]) {
      const used = usage[metric];
      if (used <= 0) continue;
      const access = await TenantFeatureGateService.checkFeatureAccess(tenantId, featureKey, used).catch(() => null);
      if (!access || access.type !== 'LIMIT' || access.unlimited || access.limit == null || access.limit <= 0) continue;

      const limit = access.limit;
      const percent = Math.round((used / limit) * 100);

      // Overage (billing trigger) — once per month per metric.
      if (used > limit && await this.alreadyAlerted(tenantId, metric, 'overage') === false) {
        await WebhookService.dispatchEvent(tenantId, 'usage.overage', {
          metric, used, limit, overUnits: used - limit, month: TenantUsageService.currentMonth(),
        }).catch((e) => Logger.warn(`[tenant_usage] overage webhook failed: ${e instanceof Error ? e.message : e}`));
        overages++;
        continue; // overage supersedes threshold alerts
      }

      // Pre-exhaustion threshold alerts (80% / 95%).
      for (const t of ALERT_THRESHOLDS) {
        if (percent >= t && percent < 100 && await this.alreadyAlerted(tenantId, metric, `t${t}`) === false) {
          await WebhookService.dispatchEvent(tenantId, 'usage.threshold', {
            metric, used, limit, percent, threshold: t, month: TenantUsageService.currentMonth(),
          }).catch((e) => Logger.warn(`[tenant_usage] threshold webhook failed: ${e instanceof Error ? e.message : e}`));
          thresholds++;
        }
      }
    }
    return { thresholds, overages };
  }

  /** Per-metric overage report (used vs plan limit) for billing/operator views. */
  static async overageReport(tenantId: string): Promise<OverageRow[]> {
    const usage = await TenantUsageService.getUsage(tenantId);
    const out: OverageRow[] = [];
    for (const [metric, featureKey] of Object.entries(METRIC_QUOTA_KEY) as [TenantUsageMetric, string][]) {
      const used = usage[metric];
      const access = await TenantFeatureGateService.checkFeatureAccess(tenantId, featureKey, used).catch(() => null);
      const limit = access?.type === 'LIMIT' ? access.limit : null;
      const unlimited = Boolean(access?.unlimited);
      out.push({
        metric, used, limit, unlimited,
        overUnits: !unlimited && limit != null && used > limit ? used - limit : 0,
        percent: !unlimited && limit && limit > 0 ? Math.round((used / limit) * 100) : null,
      });
    }
    return out;
  }

  /**
   * Platform-wide usage aggregation for an operator dashboard — summed across
   * all tenants for a month, plus the top tenants by API call volume.
   */
  static async getPlatformUsage(month?: string): Promise<{
    month: string;
    totals: TenantUsageSnapshot;
    tenantCount: number;
    topTenants: Array<{ tenantId: string; apiCalls: number; aiTokens: number; storageBytes: number }>;
  }> {
    const targetMonth = month ?? TenantUsageService.currentMonth();
    const ds = await getDataSource();
    const rows = await ds.getRepository(TenantUsage).find({ where: { month: targetMonth } });
    const totals: TenantUsageSnapshot = { apiCalls: 0, aiTokens: 0, storageBytes: 0, emailSends: 0, smsSends: 0, webhookCalls: 0 };
    for (const r of rows) {
      totals.apiCalls += r.apiCalls;
      totals.aiTokens += Number(r.aiTokens);
      totals.storageBytes += Number(r.storageBytes);
      totals.emailSends += r.emailSends;
      totals.smsSends += r.smsSends ?? 0;
      totals.webhookCalls += r.webhookCalls ?? 0;
    }
    const topTenants = [...rows]
      .sort((a, b) => b.apiCalls - a.apiCalls).slice(0, 20)
      .map((r) => ({ tenantId: r.tenantId, apiCalls: r.apiCalls, aiTokens: Number(r.aiTokens), storageBytes: Number(r.storageBytes) }));
    return { month: targetMonth, totals, tenantCount: rows.length, topTenants };
  }
}

export default TenantUsageAlertsService;
