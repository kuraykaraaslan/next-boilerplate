import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { Tenant } from './entities/tenant.entity';

/**
 * Tenant registry seed.
 *
 * The `tenants` table is the global registry of every tenant in the platform.
 * It lives in the SYSTEM DataSource: its `tenantId` column is its own primary
 * key (the tenant's identity), NOT a tenant-scope foreign key — so it is
 * system-scoped and we go through `ctx.systemRepo`, never setting a separate
 * scope id.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows. There is no `@Unique` constraint here, so
 *    the natural keys are the primary key (for the active seeded tenant) and
 *    `name` (for the extra demo rows).
 *  - Use *valid* enum values only. `tenantStatus` is one of
 *    ACTIVE / INACTIVE / PENDING / SUSPENDED / DELETED / ARCHIVED.
 *  - Timestamps are real `Date` objects.
 *  - Cover the module's lifecycle features with varied rows (a healthy active
 *    tenant, a pending one, and one in the soft-deletion grace window).
 */
export async function seedTenant(ctx: SeedContext): Promise<void> {
  const { tenantId, foc } = ctx;
  const tenantRepo = ctx.systemRepo<Tenant>(Tenant);

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // ── The active seeded tenant (matched by its own primary key) ───────────────
  // This is the tenant every other module seeds against, so make sure the
  // registry row for it exists and is ACTIVE.
  await foc(tenantRepo,
    { tenantId } as FindOptionsWhere<Tenant>,
    {
      tenantId,
      name: 'Acme Demo Workspace',
      description: 'Primary seeded demo tenant used across all module seeds.',
      tenantStatus: 'ACTIVE',
      createdAt: daysAgo(120),
      updatedAt: daysAgo(2),
    },
  );

  // ── A freshly-signed-up tenant awaiting activation ──────────────────────────
  await foc(tenantRepo,
    { name: 'Globex Trial (Pending)' } as FindOptionsWhere<Tenant>,
    {
      name: 'Globex Trial (Pending)',
      description: 'Sign-up completed, onboarding not yet finished.',
      tenantStatus: 'PENDING',
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
  );

  // ── A tenant in the soft-deletion grace window ──────────────────────────────
  await foc(tenantRepo,
    { name: 'Initech Legacy (Closing)' } as FindOptionsWhere<Tenant>,
    {
      name: 'Initech Legacy (Closing)',
      description: 'Owner requested account closure; pending hard-delete sweep.',
      tenantStatus: 'SUSPENDED',
      createdAt: daysAgo(400),
      updatedAt: daysAgo(10),
      deletionRequestedAt: daysAgo(10),
      deleteAfter: daysFromNow(20),
    },
  );

  ctx.log(`tenant: 3 registry rows (active/pending/suspended) incl. ${tenantId}`);
}
