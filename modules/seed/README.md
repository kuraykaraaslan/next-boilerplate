# Seed

Demo-data seeding framework. Each domain module ships a `<module>.seed.ts` that
exports `seed<Module>(ctx: SeedContext)`; the runner invokes them in dependency
order against a target tenant.

## Run

```bash
npm run seed                                   # seeds the ROOT tenant
SEED_TENANT_ID=<tenant-uuid> npm run seed      # seeds a specific tenant
```

Idempotent — every seeder uses `ctx.foc(repo, where, create)` (find-or-create by
a natural key), so re-running reuses existing rows instead of duplicating them.

## Authoring a module seed

```ts
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { Thing } from './entities/thing.entity';

export async function seedMyModule(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;
  await foc(ctx.repo<Thing>(Thing),
    { tenantId, code: 'demo-1' } as FindOptionsWhere<Thing>,
    { tenantId, code: 'demo-1', /* … */ },
  );
  // publish anything later modules need: refs.thingId = thing.thingId
}
```

Rules:

- Always `foc` with a natural key in `where` (slug / code / sku / composite).
- Use **valid enum values** — read the module's `*.enums.ts` (store status is
  `DRAFT|ACTIVE|ARCHIVED|OUT_OF_STOCK`, never `PUBLISHED`).
- Numbers are numbers; never pass stringified decimals.
- Cover each entity with **2–3 varied** rows.
- Read cross-module dependencies from `ctx.refs` (e.g. `ctx.refs.productId`,
  `ctx.refs.userId`); publish your own outputs back into `ctx.refs`.

[store.seed.ts](../store/store.seed.ts) is the reference implementation.
