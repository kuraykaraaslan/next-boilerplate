// @vitest-environment node
/**
 * Full demo-data seed, exercised against the REAL database through the module
 * runner. **Skipped by default** so `npm test` never touches the DB.
 *
 * Run it explicitly (equivalent to `npm run seed`):
 *   SEED=1 npx vitest run modules/store/seed.test.ts
 *   SEED=1 SEED_TENANT_ID=<tenant-uuid> npx vitest run modules/store/seed.test.ts
 *
 * The per-module data lives in each module's `<module>.seed.ts`; the dependency
 * order and orchestration live in `modules/seed/seed.runner.ts`. This test just
 * runs the whole thing and asserts the cross-module references got published.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { runSeed } from '@kuraykaraaslan/seed/server/seed.runner';

const ENABLED = process.env.SEED === '1';

describe.skipIf(!ENABLED)('full demo seed', () => {
  let ctx: SeedContext;

  beforeAll(async () => {
    ctx = await runSeed();
  }, 300_000);

  afterAll(async () => {
    const seen = new Set<DataSource>();
    for (const d of [ctx?.ds, ctx?.systemDs]) {
      if (d && d.isInitialized && !seen.has(d)) {
        seen.add(d);
        await d.destroy().catch(() => {});
      }
    }
  });

  it('publishes core catalog references', () => {
    expect(ctx.refs.categoryId).toBeTruthy();
    expect(ctx.refs.productId).toBeTruthy();
    expect(ctx.refs.bundleId).toBeTruthy();
  });

  it('publishes payment + subscription references', () => {
    expect(ctx.refs.paymentId).toBeTruthy();
    expect(ctx.refs.subscriptionPlanId).toBeTruthy();
  });
});
