import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantUsage } from './entities/tenant_usage.entity';

const TTL_SECONDS = 32 * 24 * 60 * 60; // 32 days

export type TenantUsageMetric =
  | 'apiCalls'
  | 'aiTokens'
  | 'storageBytes'
  | 'emailSends'
  | 'smsSends';

const METRICS: TenantUsageMetric[] = [
  'apiCalls',
  'aiTokens',
  'storageBytes',
  'emailSends',
  'smsSends',
];

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

  static async incrementApiCall(tenantId: string): Promise<number> {
    return TenantUsageService._increment(tenantId, 'apiCalls', 1);
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

  static async getUsage(
    tenantId: string,
    month?: string,
  ): Promise<{
    apiCalls: number;
    aiTokens: number;
    storageBytes: number;
    emailSends: number;
    smsSends: number;
  }> {
    const targetMonth = month ?? TenantUsageService.currentMonth();

    const keys = METRICS.map((m) => TenantUsageService.redisKey(tenantId, m, targetMonth));

    const results = await redis.mget(...keys);
    const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends, rawSmsSends] = results;

    const allNull = results.every((v) => v === null);

    if (!allNull) {
      return {
        apiCalls: rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0,
        aiTokens: rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0,
        storageBytes: rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0,
        emailSends: rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0,
        smsSends: rawSmsSends !== null ? parseInt(rawSmsSends, 10) : 0,
      };
    }

    // Fallback to DB
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantUsage);
    const row = await repo.findOne({ where: { tenantId, month: targetMonth } });

    if (!row) {
      return { apiCalls: 0, aiTokens: 0, storageBytes: 0, emailSends: 0, smsSends: 0 };
    }

    return {
      apiCalls: row.apiCalls,
      aiTokens: Number(row.aiTokens),
      storageBytes: Number(row.storageBytes),
      emailSends: row.emailSends,
      smsSends: row.smsSends ?? 0,
    };
  }

  static async flushToDb(tenantId: string, month: string): Promise<void> {
    const keys = METRICS.map((m) => TenantUsageService.redisKey(tenantId, m, month));

    const results = await redis.mget(...keys);
    const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends, rawSmsSends] = results;

    const apiCalls = rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0;
    const aiTokens = rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0;
    const storageBytes = rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0;
    const emailSends = rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0;
    const smsSends = rawSmsSends !== null ? parseInt(rawSmsSends, 10) : 0;

    if (
      apiCalls === 0 &&
      aiTokens === 0 &&
      storageBytes === 0 &&
      emailSends === 0 &&
      smsSends === 0
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
      });
    }
    row.apiCalls = apiCalls;
    row.aiTokens = aiTokens;
    row.storageBytes = storageBytes;
    row.emailSends = emailSends;
    row.smsSends = smsSends;
    await repo.save(row);
  }
}
