import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantUsage } from './entities/tenant_usage.entity';
import TenantUsageMessages from './tenant_usage.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const TTL_SECONDS = 32 * 24 * 60 * 60; // 32 days

export type TenantUsageMetric =
  | 'apiCalls'
  | 'aiTokens'
  | 'storageBytes'
  | 'emailSends'
  | 'smsSends'
  | 'webhookCalls';

const METRICS: TenantUsageMetric[] = [
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

export class TenantUsageService {
  static currentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  static redisKey(tenantId: string, metric: string, month: string): string {
    return `tenant:${tenantId}:usage:${metric}:${month}`;
  }

  /** Current day key (YYYY-MM-DD) for daily-granularity counters. */
  static currentDay(): string {
    return new Date().toISOString().slice(0, 10);
  }

  static dailyKey(tenantId: string, metric: string, day: string): string {
    return `tenant:${tenantId}:usage:${metric}:day:${day}`;
  }

  static endpointKey(tenantId: string, month: string): string {
    return `tenant:${tenantId}:usage:endpoint:${month}`;
  }

  /**
   * Generic increment helper. Used by all increment* methods so that the
   * Redis key format / TTL handling stays consistent. Increment failures are
   * logged but never thrown — usage tracking is best-effort, never blocking
   * the originating action (chat / upload / mail / sms).
   */
  private static async _increment(
    tenantId: string,
    metric: TenantUsageMetric,
    delta: number,
  ): Promise<number> {
    if (!tenantId || delta <= 0) return 0;
    const month = TenantUsageService.currentMonth();
    const key = TenantUsageService.redisKey(tenantId, metric, month);
    try {
      const newCount = await redis.incrby(key, delta);
      if (newCount === delta) {
        await redis.expire(key, TTL_SECONDS);
      }
      // Daily-granularity counter (within the month) — best-effort.
      try {
        const dayKey = TenantUsageService.dailyKey(tenantId, metric, TenantUsageService.currentDay());
        const dayCount = await redis.incrby(dayKey, delta);
        if (dayCount === delta) await redis.expire(dayKey, TTL_SECONDS);
      } catch { /* ignore daily counter errors */ }
      // Peak/watermark for gauge-style metrics (e.g. storageBytes).
      if (metric === 'storageBytes') {
        try {
          const peakKey = `${key}:peak`;
          const peak = Number(await redis.get(peakKey)) || 0;
          if (newCount > peak) { await redis.set(peakKey, String(newCount)); await redis.expire(peakKey, TTL_SECONDS); }
        } catch { /* ignore */ }
      }
      return newCount;
    } catch (error) {
      Logger.warn(
        `TenantUsageService._increment failed for ${metric}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  static async incrementApiCall(tenantId: string, endpoint?: string): Promise<number> {
    // Per-endpoint breakdown (not just total) — best-effort hash counter.
    if (endpoint) {
      try {
        const hkey = TenantUsageService.endpointKey(tenantId, TenantUsageService.currentMonth());
        await redis.hincrby(hkey, endpoint, 1);
        await redis.expire(hkey, TTL_SECONDS);
      } catch { /* ignore */ }
    }
    return TenantUsageService._increment(tenantId, 'apiCalls', 1);
  }

  /** Daily usage series for a metric (most recent `days`, oldest first). */
  static async getDailyUsage(tenantId: string, metric: TenantUsageMetric, days = 30): Promise<Array<{ day: string; value: number }>> {
    const out: Array<{ day: string; value: number }> = [];
    const keys: string[] = [];
    const dayLabels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10);
      dayLabels.push(day);
      keys.push(TenantUsageService.dailyKey(tenantId, metric, day));
    }
    let vals: (string | null)[] = [];
    try { vals = await redis.mget(...keys); } catch { vals = keys.map(() => null); }
    dayLabels.forEach((day, i) => out.push({ day, value: vals[i] ? parseInt(vals[i] as string, 10) : 0 }));
    return out;
  }

  /** Per-endpoint API-call breakdown for a month. */
  static async getEndpointBreakdown(tenantId: string, month?: string): Promise<Record<string, number>> {
    const hkey = TenantUsageService.endpointKey(tenantId, month ?? TenantUsageService.currentMonth());
    try {
      const h = await redis.hgetall(hkey);
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(h)) out[k] = parseInt(v, 10) || 0;
      return out;
    } catch { return {}; }
  }

  /** Peak observed value for a gauge metric this month (e.g. storageBytes). */
  static async getPeak(tenantId: string, metric: TenantUsageMetric, month?: string): Promise<number> {
    const key = `${TenantUsageService.redisKey(tenantId, metric, month ?? TenantUsageService.currentMonth())}:peak`;
    try { return Number(await redis.get(key)) || 0; } catch { return 0; }
  }

  static async incrementAiTokens(tenantId: string, tokens: number): Promise<void> {
    await TenantUsageService._increment(tenantId, 'aiTokens', tokens);
  }

  static async incrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
    await TenantUsageService._increment(tenantId, 'storageBytes', bytes);
  }

  static async incrementEmailSends(tenantId: string, count: number = 1): Promise<void> {
    await TenantUsageService._increment(tenantId, 'emailSends', count);
  }

  static async incrementSmsSends(tenantId: string, count: number = 1): Promise<void> {
    await TenantUsageService._increment(tenantId, 'smsSends', count);
  }

  static async incrementWebhookCall(tenantId: string, count: number = 1): Promise<void> {
    await TenantUsageService._increment(tenantId, 'webhookCalls', count);
  }

  static async decrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
    if (!tenantId || bytes <= 0) return;
    const month = TenantUsageService.currentMonth();
    const key = TenantUsageService.redisKey(tenantId, 'storageBytes', month);
    try {
      await redis.decrby(key, bytes);
    } catch (error) {
      Logger.warn(
        `TenantUsageService.decrementStorageBytes failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  static async getUsage(
    tenantId: string,
    month?: string,
  ): Promise<TenantUsageSnapshot> {
    const targetMonth = month ?? TenantUsageService.currentMonth();

    const keys = METRICS.map((m) => TenantUsageService.redisKey(tenantId, m, targetMonth));

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

  static async flushToDb(tenantId: string, month: string): Promise<void> {
    const keys = METRICS.map((m) => TenantUsageService.redisKey(tenantId, m, month));

    let results: (string | null)[];
    try { results = await redis.mget(...keys); }
    catch (err) {
      Logger.warn(`[TenantUsage] flushToDb Redis read failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends, rawSmsSends, rawWebhookCalls] = results;

    const apiCalls = rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0;
    const aiTokens = rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0;
    const storageBytes = rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0;
    const emailSends = rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0;
    const smsSends = rawSmsSends !== null ? parseInt(rawSmsSends, 10) : 0;
    const webhookCalls = rawWebhookCalls !== null ? parseInt(rawWebhookCalls, 10) : 0;

    if (
      apiCalls === 0 &&
      aiTokens === 0 &&
      storageBytes === 0 &&
      emailSends === 0 &&
      smsSends === 0 &&
      webhookCalls === 0
    ) {
      return;
    }

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantUsage);
    let row = await repo.findOne({ where: { tenantId, month } });
    if (!row) {
      row = repo.create({
        tenantId,
        month,
        apiCalls: 0,
        aiTokens: 0,
        storageBytes: 0,
        emailSends: 0,
        smsSends: 0,
        webhookCalls: 0,
      });
    }
    row.apiCalls = apiCalls;
    row.aiTokens = aiTokens;
    row.storageBytes = storageBytes;
    row.emailSends = emailSends;
    row.smsSends = smsSends;
    row.webhookCalls = webhookCalls;
    await repo.save(row);
  }

  /**
   * Multi-month usage history (most recent first), read from the persisted
   * monthly rows. `months` bounds the window (default 12).
   */
  static async getHistory(tenantId: string, months = 12): Promise<Array<TenantUsageSnapshot & { month: string }>> {
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

  /**
   * Retention purge: delete persisted usage rows older than `keepMonths`
   * (default 24). Meant for a scheduled job. Returns the number deleted.
   */
  static async purgeOldUsage(tenantId: string, keepMonths = 24): Promise<number> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - keepMonths);
    const cutoffMonth = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
    const ds = await tenantDataSourceFor(tenantId);
    const res = await ds.getRepository(TenantUsage)
      .createQueryBuilder()
      .delete()
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('month < :cutoffMonth', { cutoffMonth })
      .execute();
    return res.affected ?? 0;
  }
}
