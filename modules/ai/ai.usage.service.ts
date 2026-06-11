import Logger from '@/modules/logger';
import redis from '@/modules/redis';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';
import { AiUsageLog } from './entities/ai_usage_log.entity';
import type { AIProviderType, ChatCompletionResponse, EmbeddingResponse } from './ai.types';

export default class AIUsageService {

  // ──────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────

  private static readonly RATE_LIMIT_PREFIX = 'ai:rate-limit:';
  static readonly USAGE_PREFIX = 'ai:usage:';

  // ──────────────────────────────────────────────
  // Usage Tracking
  // ──────────────────────────────────────────────

  static async trackUsage(tenantId: string, provider: AIProviderType, tokens: number): Promise<void> {
    if (tokens <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `${AIUsageService.USAGE_PREFIX}${tenantId}:${provider}:${today}`;

    try {
      await redis.incrby(key, tokens);
      await redis.expire(key, 86400 * 30);
    } catch (error) {
      Logger.warn(`AIUsageService: Failed to track usage: ${error}`);
    }

    await TenantUsageService.incrementAiTokens(tenantId, tokens);
  }

  static async recordUsage(
    tenantId: string,
    provider: AIProviderType,
    response: ChatCompletionResponse,
    kind: 'chat' | 'stream',
  ): Promise<void> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AiUsageLog);
      const row = repo.create({
        tenantId,
        provider,
        model: response.model,
        kind,
        inputTokens: response.usage?.promptTokens ?? 0,
        outputTokens: response.usage?.completionTokens ?? 0,
        totalTokens: response.usage?.totalTokens ?? 0,
      });
      await repo.save(row);
    } catch (error) {
      Logger.warn(`AIUsageService.recordUsage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async recordEmbedUsage(
    tenantId: string,
    provider: AIProviderType,
    response: EmbeddingResponse,
  ): Promise<void> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AiUsageLog);
      const row = repo.create({
        tenantId,
        provider,
        model: response.model,
        kind: 'embed',
        inputTokens: response.usage?.totalTokens ?? 0,
        outputTokens: 0,
        totalTokens: response.usage?.totalTokens ?? 0,
      });
      await repo.save(row);
    } catch (error) {
      Logger.warn(`AIUsageService.recordEmbedUsage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getUsage(
    tenantId: string,
    provider: AIProviderType,
    days = 30,
  ): Promise<Record<string, number>> {
    const usage: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${AIUsageService.USAGE_PREFIX}${tenantId}:${provider}:${dateStr}`;
      try {
        const value = await redis.get(key);
        usage[dateStr] = parseInt(value || '0', 10);
      } catch {
        usage[dateStr] = 0;
      }
    }
    return usage;
  }

  static async getTotalUsage(tenantId: string, provider: AIProviderType, days = 30): Promise<number> {
    const usage = await AIUsageService.getUsage(tenantId, provider, days);
    return Object.values(usage).reduce((sum, val) => sum + val, 0);
  }

  // ──────────────────────────────────────────────
  // Rate Limiting
  // ──────────────────────────────────────────────

  static async isRateLimited(key: string): Promise<boolean> {
    const rateLimitKey = `${AIUsageService.RATE_LIMIT_PREFIX}${key}`;
    const existing = await redis.get(rateLimitKey);
    return !!existing;
  }

  static async setRateLimit(key: string, seconds: number): Promise<void> {
    const rateLimitKey = `${AIUsageService.RATE_LIMIT_PREFIX}${key}`;
    await redis.set(rateLimitKey, '1', 'EX', seconds);
  }
}
