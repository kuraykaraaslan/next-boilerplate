# ADR 0003 — SQL-first migrations with RLS as defense-in-depth

**Status:** Accepted (2026-05)

## Context

The boilerplate's TypeORM DataSources currently run `synchronize: true` in development. That auto-generates schema changes from entity decorators but is unsafe for production:

- It cannot drop columns or change column types without data loss.
- It does not version the schema — every deploy is "whatever the entities say right now."
- It cannot express policies that don't live in entity metadata (RLS, partial indexes, triggers, materialized views).

For a multi-tenant boilerplate the schema needs more than entity sync. Specifically, application-layer `where: { tenantId }` guards are best-effort: a single missing clause in a hot path leaks across tenants. Postgres row-level security solves that — but only if we can deliver the `CREATE POLICY` statements alongside schema changes.

## Decision

Migrations are versioned SQL files under [`modules/db/migrations/`](../../modules/db/migrations/), applied in numbered order. They are:

- **Plain SQL.** No ORM-specific DSL — runs against any Postgres tooling (psql, Flyway, Sqitch, node-pg-migrate, TypeORM migration runner). Operators pick the runner.
- **Idempotent where practical.** `CREATE … IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, etc., so re-running against an already-migrated database is safe.
- **Numbered four-digit.** `001_tenant_rls.sql`, `002_…`, never reused.

TypeORM `synchronize: true` is retained for local development convenience, but production deploys must:
1. Set `synchronize: false`.
2. Apply numbered SQL migrations through the chosen runner during deploy.

Defense-in-depth: migration `001_tenant_rls.sql` enables Postgres row-level security on every tenant-scoped table with a `tenant_isolation` policy that checks `"tenantId" = app_current_tenant()`. The application sets `SET LOCAL app.current_tenant = $1` on connection checkout (TypeORM subscriber / query hook).

## Consequences

**Positive**
- Schema changes are explicit, reviewable, and version-controlled.
- RLS guarantees: even if a service forgets `where: { tenantId }`, Postgres still filters by the session-variable tenant. A leak now requires both a missing app-layer guard AND an explicit `BYPASSRLS` role or session opt-in.
- The migration directory becomes the canonical record of "how this database evolved."

**Negative**
- Two ways to change schema (entity decorators for dev synchronize, SQL for prod) creates drift risk. Mitigation: a CI step that runs the migrations and then `synchronize` against an empty DB and asserts the resulting schema matches the entities (TBD).
- RLS adds a per-query session-variable round-trip. Mitigation: TypeORM connection pool reuse + `SET LOCAL` is cheap.
- Existing scripts that do cross-tenant work (`scripts/migrate-to-root-tenant.ts`, cron jobs) must connect as a role with `BYPASSRLS` or explicitly `SET LOCAL app.bypass_rls = 'on'`. Documented in [`modules/db/migrations/001_tenant_rls.sql`](../../modules/db/migrations/001_tenant_rls.sql).

## Alternatives considered

- **TypeORM migration CLI only.** Rejected: keeps schema changes in TypeScript, harder to express raw policy/trigger DDL, harder for non-Node ops tooling to apply.
- **Prisma.** Rejected: another ORM in the project; the boilerplate already standardises on TypeORM.
- **Application-layer guards alone.** Rejected by the threat model: one forgotten `where` clause is a P0 incident. RLS is cheap insurance.
