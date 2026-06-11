import Logger from '@/modules/logger';
import redis from '@/modules/redis';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';
import { AiUsageLog } from './entities/ai_usage_log.entity';
import type { AIProviderType, ChatCompletionResponse, EmbeddingResponse } from './ai.types';

// Per-million-token pricing in USD { input, output }. Updated periodically.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o':           { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':      { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':      { input: 10.00, output: 30.00 },
  'gpt-4':            { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo':    { input: 0.50,  output: 1.50  },
  'o1':               { input: 15.00, output: 60.00 },
  'o1-mini':          { input: 3.00,  output: 12.00 },
  'o1-preview':       { input: 15.00, output: 60.00 },
  // Anthropic
  'claude-opus-4-20250514':       { input: 15.00, output: 75.00 },
  'claude-sonnet-4-20250514':     { input: 3.00,  output: 15.00 },
  'claude-3-7-sonnet-20250219':   { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20241022':   { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku-20241022':    { input: 1.00,  output: 5.00  },
  'claude-3-opus-20240229':       { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229':     { input: 3.00,  output: 15.00 },
  'claude-3-haiku-20240307':      { input: 0.25,  output: 1.25  },
  // Google
  'gemini-2.0-flash':       { input: 0.075,  output: 0.30  },
  'gemini-2.0-flash-lite':  { input: 0.0375, output: 0.15  },
  'gemini-1.5-pro':         { input: 1.25,   output: 5.00  },
  'gemini-1.5-flash':       { input: 0.075,  output: 0.30  },
  'gemini-1.5-flash-8b':    { input: 0.0375, output: 0.15  },
};

function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return undefined;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

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
      const inputTokens = response.usage?.promptTokens ?? 0;
      const outputTokens = response.usage?.completionTokens ?? 0;
      const row = repo.create({
        tenantId,
        provider,
        model: response.model,
        kind,
        inputTokens,
        outputTokens,
        totalTokens: response.usage?.totalTokens ?? 0,
        costUsd: calcCostUsd(response.model, inputTokens, outputTokens),
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
      const embedTokens = response.usage?.totalTokens ?? 0;
      const row = repo.create({
        tenantId,
        provider,
        model: response.model,
        kind: 'embed',
        inputTokens: embedTokens,
        outputTokens: 0,
        totalTokens: embedTokens,
        costUsd: calcCostUsd(response.model, embedTokens, 0),
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
