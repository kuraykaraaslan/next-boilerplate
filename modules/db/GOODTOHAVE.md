# Good to Have — Database

> All selected items shipped.

## Row-Level Security Activation

### ✅ RLS Session Variable Hook on Connection Checkout
`withTenantRLS(tenantId, callback)` in `db.ts` issues `SET LOCAL app.current_tenant = $1` inside a transaction so PostgreSQL RLS policies from `001_tenant_rls.sql` are enforced on every query.

### ✅ Typed BYPASSRLS Role Abstraction
`getSystemDataSource()` + `withSystemRLS(callback)` provide a typed entry point for cross-tenant cron jobs and GDPR sweeps. `SET LOCAL app.bypass_rls = 'on'` is transaction-scoped and cannot leak.

## Connection Pooling & Performance

### ✅ PgBouncer / Connection Pool Configuration
`buildDataSourceOptions` passes `extra: { max: env.DB_POOL_MAX }` so pool size is configurable per deployment via `DB_POOL_MAX` env var.

### ✅ Read Replica Routing
`getReadDataSource()` returns a separate `DataSource` pointed at `DATABASE_READ_REPLICA_URL`. Falls back to the primary when the env var is unset.

### Per-Tenant Connection Pool Sizing
**Why:** Every tenant's DataSource uses identical pool settings.
**Complexity:** Medium — not yet implemented.

## Migration Management

### ✅ Formal Migration Runner Integration
Migration files live in `modules/db/migrations/`. TypeORM migration runner can apply them via `datasource.runMigrations()` in a deployment script; `synchronize: true` is disabled in non-development environments.

### Per-Tenant DB Provisioning API
**Why:** No service/API for creating and migrating per-tenant databases.
**Complexity:** High — not yet implemented.

## Observability & Health

### ✅ DataSource Health Check Endpoint
`checkDataSourceHealth()` queries `SELECT 1` on both the default and read-replica DataSources and returns a structured `{ default, replica }` status object consumed by the `/health` route.

### ✅ Slow-Query Logging with Tenant Context
`TenantContextLogger` in `db.utils.ts` tags slow queries (> `DB_SLOW_QUERY_THRESHOLD_MS`) with the `tenantId` from `tenantQueryContext` (AsyncLocalStorage).

## Schema Isolation

### Postgres Schema-Per-Tenant Mode
**Why:** No middle path between full shared-DB and full per-tenant DB.
**Complexity:** High — not yet implemented.

## Per-Tenant Query Timeout ★ New Feature

### ✅ Per-Tenant Statement Timeout
`withQueryTimeout(tenantId, timeoutMs, callback)` in `db.ts` issues `SET LOCAL statement_timeout = $1` so a runaway query from one tenant cannot block DB connections for others. Controlled via `DB_QUERY_TIMEOUT_MS` env var (0 = disabled).
