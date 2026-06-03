# Seed

- **id:** `seed`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/seed/`
- **tags:** infrastructure, tooling
- **icon:** `fas fa-seedling`
- **hasNextLayer:** false

Demo-data seeding framework. Each domain module ships a <module>.seed.ts exporting seed<Module>(ctx); the runner invokes them in dependency order against a target tenant.

## Dependencies

- **requires:** `db`, `tenant`

## README

# Seed Module

Demo-data seeding framework. Each domain module ships a `<module>.seed.ts` that
exports `seed<Module>(ctx: SeedContext)`; the runner invokes them in dependency
order against a target tenant. The framework owns no entities and no settings of
its own — it orchestrates the other modules' seeders.

---

## Responsibilities

| File | Responsibility |
|---|---|
| `seed.context.ts` | Builds the `SeedContext` passed to every seeder: tenant-scoped + system `DataSource`s, the `refs` bag of cross-module ids, `foc` (find-or-create), `repo`/`systemRepo` helpers, and a `log` line. Also exports the deterministic ids `SEED_USER_ID`, `SEED_ADMIN_USER_ID`, `SEED_ORDER_ID`. |
| `seed.runner.ts` | Holds the ordered `SEEDERS` list and `runSeed(tenantId?)`. Resolves the target tenant, opens both data sources, then runs every seeder in order. |
| `index.ts` | Public surface: re-exports `makeSeedContext`, `runSeed`, `SEEDERS`, the deterministic ids, and the `SeedContext`/`SeedRefs`/`ModuleSeeder` types. |

`runSeed` is idempotent and fault-tolerant: each seeder runs inside its own
`try/catch`, so a failing module is logged (`✗ <name> failed: …`) and skipped
while the rest still run; the first error is rethrown at the end. The target
tenant is `tenantId` arg → `process.env.SEED_TENANT_ID` → `ROOT_TENANT_ID`.

The ordered `SEEDERS` list groups seeders by dependency tier — identity/system
base, catalog, pricing infra, payments, promotions, orders, order-/catalog-
dependent commerce, billing docs, content, then cross-cutting (`audit_log`)
last. Order affects how connected the data is, not correctness, because every
cross-reference also has a constant fallback. `payment_sell` and
`payment_subscription` ship seeders but are intentionally excluded — their
entities duplicate the canonical `payment` module's tables and are not
registered in the DataSource, so running them would collide.

---

## SeedContext

| Member | Purpose |
|---|---|
| `ds` | Tenant-scoped `DataSource` — for entities with a `tenantId` column. |
| `systemDs` | System/global `DataSource` — for entities **without** a `tenantId` column. |
| `tenantId` | The target tenant being seeded. |
| `refs` | `SeedRefs` bag of cross-module ids a seeder produces for later seeders to consume (e.g. `productId`, `orderId`, `couponCode`). Seeded with `userId`/`adminUserId`. |
| `foc(repo, where, create)` | Find-or-create by a natural key — the idempotency primitive every seeder uses. |
| `repo(Entity)` | Tenant-scoped repository (`ds.getRepository`). |
| `systemRepo(Entity)` | System-scoped repository (`systemDs.getRepository`). |
| `log(message)` | Prints a `[seed] …` progress line. |

The deterministic ids (`SEED_USER_ID`, `SEED_ADMIN_USER_ID`, `SEED_ORDER_ID`)
are plain uuids shared across every seeder so cross-references stay stable across
re-runs. Tenant DBs store these as plain columns without cross-database FK
constraints, so a referenced row need not physically exist in another database.

---

## Run

```bash
npm run seed                                   # seeds the ROOT tenant
SEED_TENANT_ID=<tenant-uuid> npm run seed      # seeds a specific tenant
```

`npm run seed` runs `tsx scripts/seed.ts`, which calls `runSeed()` and exits
non-zero on the first rethrown error.

Idempotent — every seeder uses `ctx.foc(repo, where, create)` (find-or-create by
a natural key), so re-running reuses existing rows instead of duplicating them.

---

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
- System-table entities (no `tenantId` column) must use `ctx.systemRepo` /
  `ctx.systemDs`, not the tenant-scoped `ctx.repo` / `ctx.ds`.

Once written, register the seeder in the `SEEDERS` array in `seed.runner.ts` at
the right dependency tier.

[store.seed.ts](../store/store.seed.ts) is the reference implementation.

---

## Entities

None. The seed module defines no entities of its own; it writes rows owned by
the other modules through their repositories.

---

## Settings

None. The seed framework has no settings. The only runtime input is the target
tenant, supplied via the `tenantId` argument or the `SEED_TENANT_ID` env var.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Demo-data seeding framework that orchestrates module seeders in dependency order against a target tenant; no per-tenant settings, entities, or behavior variation.

---

## Dependencies

- `db` — `getDataSource` (system) and `tenantDataSourceFor` (tenant-scoped).
- `tenant` — `ROOT_TENANT_ID` default target.
- Every seeded domain module via its `<module>.seed.ts` (imported by `seed.runner.ts`).
