import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { TenantUsage } from './entities/tenant_usage.entity';
import TenantUsageMessages from './tenant_usage.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import {
  METRICS, type TenantUsageMetric, type TenantUsageSnapshot,
  currentMonth, redisKey, dailyKey, endpointKey,
} from './tenant_usage.keys';

/** Daily usage series for a metric (most recent `days`, oldest first). */
export async function getDailyUsage(tenantId: string, metric: TenantUsageMetric, days = 30): Promise<Array<{ day: string; value: number }>> {
  const out: Array<{ day: string; value: number }> = [];
  const keys: string[] = [];
  const dayLabels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    dayLabels.push(day);
    keys.push(dailyKey(tenantId, metric, day));
  }
  let vals: (string | null)[] = [];
  try { vals = await redis.mget(...keys); } catch { vals = keys.map(() => null); }
  dayLabels.forEach((day, i) => out.push({ day, value: vals[i] ? parseInt(vals[i] as string, 10) : 0 }));
  return out;
}

/** Per-endpoint API-call breakdown for a month. */
export async function getEndpointBreakdown(tenantId: string, month?: string): Promise<Record<string, number>> {
  const hkey = endpointKey(tenantId, month ?? currentMonth());
  try {
    const h = await redis.hgetall(hkey);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(h)) out[k] = parseInt(v, 10) || 0;
    return out;
  } catch { return {}; }
}

/** Peak observed value for a gauge metric this month (e.g. storageBytes). */
export async function getPeak(tenantId: string, metric: TenantUsageMetric, month?: string): Promise<number> {
  const key = `${redisKey(tenantId, metric, month ?? currentMonth())}:peak`;
  try { return Number(await redis.get(key)) || 0; } catch { return 0; }
}

export async function getUsage(
  tenantId: string,
  month?: string,
): Promise<TenantUsageSnapshot> {
  const targetMonth = month ?? currentMonth();

  const keys = METRICS.map((m) => redisKey(tenantId, m, targetMonth));

  let redisResults: (string | null)[] | null = null;
  try { redisResults = await redis.mget(...keys); } catch { /* fall through to DB */ }

  if (redisResults) {
    const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends, rawSmsSends, rawWebhookCalls] = redisResults;
    const allNull = redisResults.every((v) => v === null);
    if (!allNull) {
      return {
        apiCalls: rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0,
        aiTokens: rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0,
        storageBytes: rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0,
        emailSends: rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0,
        smsSends: rawSmsSends !== null ? parseInt(rawSmsSends, 10) : 0,
        webhookCalls: rawWebhookCalls !== null ? parseInt(rawWebhookCalls, 10) : 0,
      };
    }
  }

  // Fallback to DB
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantUsage);
    const row = await repo.findOne({ where: { tenantId, month: targetMonth } });

    if (!row) {
      return { apiCalls: 0, aiTokens: 0, storageBytes: 0, emailSends: 0, smsSends: 0, webhookCalls: 0 };
    }

    return {
      apiCalls: row.apiCalls,
      aiTokens: Number(row.aiTokens),
      storageBytes: Number(row.storageBytes),
      emailSends: row.emailSends,
      smsSends: row.smsSends ?? 0,
      webhookCalls: row.webhookCalls ?? 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error(`[TenantUsage] getUsage DB fallback failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new AppError(TenantUsageMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Multi-month usage history (most recent first), read from the persisted
 * monthly rows. `months` bounds the window (default 12).
 */
export async function getHistory(tenantId: string, months = 12): Promise<Array<TenantUsageSnapshot & { month: string }>> {
  const ds = await tenantDataSourceFor(tenantId);
  const rows = await ds.getRepository(TenantUsage).find({
    where: { tenantId },
    order: { month: 'DESC' },
    take: Math.min(Math.max(months, 1), 120),
  });
  return rows.map((r) => ({
    month: r.month,
    apiCalls: r.apiCalls,
    aiTokens: Number(r.aiTokens),
    storageBytes: Number(r.storageBytes),
    emailSends: r.emailSends,
    smsSends: r.smsSends ?? 0,
    webhookCalls: r.webhookCalls ?? 0,
  }));
}
