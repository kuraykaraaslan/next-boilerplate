# Database migrations

Raw SQL migrations. Numbered, applied in order. Idempotent where reasonable so re-running against an already-migrated database is safe.

| # | File | Purpose |
|---|---|---|
| 001 | [`001_tenant_rls.sql`](001_tenant_rls.sql) | Postgres row-level security for tenant-scoped tables — defense-in-depth on top of service-layer `where: { tenantId }` guards. |

## Applying

```bash
psql "$TENANT_DATABASE_URL" -f modules/db/migrations/001_tenant_rls.sql
```

For production, integrate these into your migration runner of choice (Flyway, Sqitch, `node-pg-migrate`, or TypeORM's `migration:run`). The boilerplate currently relies on `synchronize: true` in development — see [ADR 0003 — migrations](../../../docs/adr/) (to be written) for the production story.

## Runtime contract (RLS)

After `001_tenant_rls.sql` is applied, every TypeORM `tenantDataSourceFor(tenantId)` connection MUST set the session variable on checkout:

```sql
SET LOCAL app.current_tenant = '<tenantId>'
```

Without this, every `SELECT` against an RLS-protected table returns 0 rows.

For cron jobs / CLI scripts that legitimately need cross-tenant access, connect as a role with `BYPASSRLS` (or use `SET LOCAL app.bypass_rls = 'on'`) — see comments inside [`001_tenant_rls.sql`](001_tenant_rls.sql) for the role split.
