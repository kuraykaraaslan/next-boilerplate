import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { TenantUsage } from './entities/tenant_usage.entity';

/**
 * Demo-data seed for the `tenant_usage` module.
 *
 * Mirrors the reference `store.seed.ts`:
 *  - Tenant-scoped entity (has a `tenantId` column) → `ctx.repo<Entity>(Entity)`.
 *  - Natural key = the `@Unique(['tenantId', 'month'])` constraint, so `foc`
 *    reuses an existing month bucket on re-run instead of duplicating it.
 *  - Numbers are numbers; `aiTokens` / `storageBytes` are bigint columns but the
 *    seeded values stay well within the safe-integer range.
 *
 * `TenantUsage` is the monthly rollup the cron job flushes from Redis. We seed a
 * trailing window of months with *varied*, realistic counters so dashboards have
 * something to chart: an early low-traffic month, a busy growth month, and the
 * current (partial) month.
 */
export async function seedTenantUsage(ctx: SeedContext): Promise<void> {
  const { tenantId, foc } = ctx;

  // Current month as 'YYYY-MM' plus the two preceding months, computed from a
  // real Date (this file runs under tsx/Node, so the Date constructor exists).
  const fmtMonth = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const now = new Date();
  const monthOffset = (back: number): string =>
    fmtMonth(new Date(now.getFullYear(), now.getMonth() - back, 1));

  type UsageDef = {
    month: string;
    apiCalls: number;
    aiTokens: number;
    storageBytes: number;
    emailSends: number;
    smsSends: number;
  };

  // Three contrasting buckets: quiet onboarding month → busy month → current.
  const usageDefs: UsageDef[] = [
    {
      month: monthOffset(2),
      apiCalls: 1_240,
      aiTokens: 85_000,
      storageBytes: 268_435_456, // 256 MB
      emailSends: 42,
      smsSends: 0,
    },
    {
      month: monthOffset(1),
      apiCalls: 28_750,
      aiTokens: 2_450_000,
      storageBytes: 5_368_709_120, // 5 GB
      emailSends: 1_310,
      smsSends: 96,
    },
    {
      month: monthOffset(0),
      apiCalls: 9_865,
      aiTokens: 740_000,
      storageBytes: 7_516_192_768, // 7 GB
      emailSends: 388,
      smsSends: 24,
    },
  ];

  const usageRepo = ctx.repo<TenantUsage>(TenantUsage);
  let firstUsageId: string | undefined;
  for (const def of usageDefs) {
    const row = await foc(usageRepo,
      { tenantId, month: def.month } as FindOptionsWhere<TenantUsage>,
      { tenantId, ...def },
    );
    firstUsageId ??= row.usageId;
  }

  // Publish a reference in case a later module wants to point at a usage bucket.
  ctx.refs.tenantUsageId = firstUsageId;

  ctx.log(`tenant_usage: ${usageDefs.length} monthly usage buckets for ${tenantId}`);
}
