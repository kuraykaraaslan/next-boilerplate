import redis from '@/modules/redis';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantUsage } from './entities/tenant_usage.entity';

const TTL_SECONDS = 32 * 24 * 60 * 60; // 32 days

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

  static async incrementApiCall(tenantId: string): Promise<number> {
    const month = TenantUsageService.currentMonth();
    const key = TenantUsageService.redisKey(tenantId, 'apiCalls', month);
    const newCount = await redis.incr(key);
    if (newCount === 1) {
      await redis.expire(key, TTL_SECONDS);
    }
    return newCount;
  }

  static async incrementAiTokens(tenantId: string, tokens: number): Promise<void> {
    const month = TenantUsageService.currentMonth();
    const key = TenantUsageService.redisKey(tenantId, 'aiTokens', month);
    const newCount = await redis.incrby(key, tokens);
    if (newCount === tokens) {
      await redis.expire(key, TTL_SECONDS);
    }
  }

  static async incrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
    const month = TenantUsageService.currentMonth();
    const key = TenantUsageService.redisKey(tenantId, 'storageBytes', month);
    const newCount = await redis.incrby(key, bytes);
    if (newCount === bytes) {
      await redis.expire(key, TTL_SECONDS);
    }
  }

  static async getUsage(
    tenantId: string,
    month?: string,
  ): Promise<{ apiCalls: number; aiTokens: number; storageBytes: number; emailSends: number }> {
    const targetMonth = month ?? TenantUsageService.currentMonth();

    const keys = [
      TenantUsageService.redisKey(tenantId, 'apiCalls', targetMonth),
      TenantUsageService.redisKey(tenantId, 'aiTokens', targetMonth),
      TenantUsageService.redisKey(tenantId, 'storageBytes', targetMonth),
      TenantUsageService.redisKey(tenantId, 'emailSends', targetMonth),
    ];

    const results = await redis.mget(...keys);
    const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends] = results;

    const allNull = results.every((v) => v === null);

    if (!allNull) {
      return {
        apiCalls: rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0,
        aiTokens: rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0,
        storageBytes: rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0,
        emailSends: rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0,
      };
    }

    // Fallback to DB
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantUsage);
    const row = await repo.findOne({ where: { tenantId, month: targetMonth } });

    if (!row) {
      return { apiCalls: 0, aiTokens: 0, storageBytes: 0, emailSends: 0 };
    }

    return {
      apiCalls: row.apiCalls,
      aiTokens: Number(row.aiTokens),
      storageBytes: Number(row.storageBytes),
      emailSends: row.emailSends,
    };
  }

  static async flushToDb(tenantId: string, month: string): Promise<void> {
    const keys = [
      TenantUsageService.redisKey(tenantId, 'apiCalls', month),
      TenantUsageService.redisKey(tenantId, 'aiTokens', month),
      TenantUsageService.redisKey(tenantId, 'storageBytes', month),
      TenantUsageService.redisKey(tenantId, 'emailSends', month),
    ];

    const results = await redis.mget(...keys);
    const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends] = results;

    const apiCalls = rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0;
    const aiTokens = rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0;
    const storageBytes = rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0;
    const emailSends = rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0;

    if (apiCalls === 0 && aiTokens === 0 && storageBytes === 0 && emailSends === 0) {
      return;
    }

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantUsage);
    let row = await repo.findOne({ where: { tenantId, month } });
    if (!row) {
      row = repo.create({ tenantId, month, apiCalls: 0, aiTokens: 0, storageBytes: 0, emailSends: 0 });
    }
    row.apiCalls = apiCalls;
    row.aiTokens = aiTokens;
    row.storageBytes = storageBytes;
    row.emailSends = emailSends;
    await repo.save(row);
  }
}
