import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { AiUsageLog } from './entities/ai_usage_log.entity';

/**
 * AI module seed.
 *
 * The `ai` module owns a single auditable table — `ai_usage_logs` — one row per
 * AIService chat / stream / embed call. We seed a handful of varied rows so the
 * usage dashboards and the tenant_usage billing aggregation have realistic data
 * to render.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them. The entity has
 *    no DB-level @Unique constraint, so we compose a synthetic natural key from
 *    (tenantId, provider, model, kind) — stable across re-runs.
 *  - Use only valid string values: provider ∈ {openai, anthropic, google},
 *    kind ∈ {chat, stream, embed}, model from the AIModel lists in ai.types.ts.
 *  - Numbers are numbers (costUsd is a decimal mapped back to `number`).
 *  - tenantId column present → tenant-scoped repo + tenantId: ctx.tenantId.
 */
export async function seedAi(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module user ids: prefer published refs, fall back to seed constants.
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  // Concrete local type (no Partial<Entity> spread — keeps foc inference clean).
  type UsageDef = {
    provider: string;
    model: string;
    kind: string;
    userId?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd?: number;
    createdAt: Date;
  };

  // ── Usage logs (3 providers × varied kinds / tokens / cost / actors) ────────
  const usageDefs: UsageDef[] = [
    // OpenAI — a non-streamed chat completion by a regular user.
    {
      provider: 'openai',
      model: 'gpt-4o',
      kind: 'chat',
      userId,
      inputTokens: 1240,
      outputTokens: 386,
      totalTokens: 1626,
      costUsd: 0.012185,
      createdAt: daysAgo(6),
    },
    // OpenAI — an embedding call (no userId, system-triggered indexing).
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      kind: 'embed',
      inputTokens: 8192,
      outputTokens: 0,
      totalTokens: 8192,
      costUsd: 0.001229,
      createdAt: daysAgo(4),
    },
    // Anthropic — a streamed chat completion by an admin.
    {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      kind: 'stream',
      userId: adminUserId,
      inputTokens: 3050,
      outputTokens: 1124,
      totalTokens: 4174,
      costUsd: 0.025020,
      createdAt: daysAgo(2),
    },
    // Anthropic — a cheap Haiku chat completion (recent).
    {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      kind: 'chat',
      userId,
      inputTokens: 540,
      outputTokens: 210,
      totalTokens: 750,
      costUsd: 0.000852,
      createdAt: daysAgo(1),
    },
    // Google — a Gemini flash chat completion (no recorded cost).
    {
      provider: 'google',
      model: 'gemini-1.5-flash',
      kind: 'chat',
      userId: adminUserId,
      inputTokens: 2200,
      outputTokens: 640,
      totalTokens: 2840,
      createdAt: daysAgo(3),
    },
  ];

  const usageRepo = ctx.repo<AiUsageLog>(AiUsageLog);
  let firstUsageLogId: string | undefined;
  for (const def of usageDefs) {
    const row = await foc(usageRepo,
      { tenantId, provider: def.provider, model: def.model, kind: def.kind } as FindOptionsWhere<AiUsageLog>,
      { tenantId, ...def },
    );
    firstUsageLogId ??= row.aiUsageLogId;
  }

  // ── Publish references later modules might consume ──────────────────────────
  refs.aiUsageLogId = firstUsageLogId;

  ctx.log(`ai: ${usageDefs.length} usage logs (openai/anthropic/google · chat/stream/embed) for ${tenantId}`);
}
