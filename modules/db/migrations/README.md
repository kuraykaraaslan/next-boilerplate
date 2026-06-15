# Database migrations

Raw SQL migrations. Numbered, applied in order. Idempotent where reasonable so re-running against an already-migrated database is safe.

| # | File | Purpose |
|---|---|---|
| 001 | [`001_tenant_rls.sql`](001_tenant_rls.sql) | Postgres row-level security for tenant-scoped tables — defense-in-depth on top of service-layer `where: { tenantId }` guards. |
| 002 | [`002_drop_api_key_keyprefix.sql`](002_drop_api_key_keyprefix.sql) | Drop the display-only `keyPrefix` column from `api_keys` — keys are shown once at creation and only the SHA-256 `keyHash` is stored. |
| 003 | [`003_webhook_endpoint_capabilities.sql`](003_webhook_endpoint_capabilities.sql) | Add webhook endpoint capability columns (custom headers, event filters, tags, circuit-breaker counters, IP allowlist, per-endpoint rate limit) + a `webhook_deliveries(event)` index for metrics. |
| 008 | [`008_user_preferences_language_iso639.sql`](008_user_preferences_language_iso639.sql) | Normalise `user_preferences.language` from the legacy uppercase enum (`EN`/`DE`/`JP`…) to lowercase ISO 639-1 codes (`en`/`de`/`ja`…), now single-sourced from `@/modules/common`. Also sets the column default to `'en'`. |

## Applying

```bash
npm run db:deploy
```

[`scripts/db-deploy.ts`](../../../scripts/db-deploy.ts) is the production runner and is wired into `vercel-build`, so every Vercel deploy brings the database fully up to date. Two idempotent phases over the direct (unpooled) connection:

1. **Schema sync** — create/alter tables from the TypeORM entities (`synchronize`). This is what creates `tenant_databases` et al. in production, where the runtime DataSource keeps `synchronize: false`.
2. **SQL migrations** — apply every `*.sql` file here in numbered order exactly once, tracked in a `_sql_migrations` table so re-runs are no-ops.
3. **Bootstrap seed** — only on a fresh database (no tenant rows): create the `PLATFORM` (root) and `ACME` (demo) tenants and their admin users. Skipped entirely once any tenant exists, so it never touches an established database.

Safe to re-run. A single file can still be applied by hand with `psql "$DATABASE_URL" -f modules/db/migrations/00X_*.sql`.

## Runtime contract (RLS)

After `001_tenant_rls.sql` is applied, every TypeORM `tenantDataSourceFor(tenantId)` connection MUST set the session variable on checkout:

```sql
SET LOCAL app.current_tenant = '<tenantId>'
```

Without this, every `SELECT` against an RLS-protected table returns 0 rows.

For cron jobs / CLI scripts that legitimately need cross-tenant access, connect as a role with `BYPASSRLS` (or use `SET LOCAL app.bypass_rls = 'on'`) — see comments inside [`001_tenant_rls.sql`](001_tenant_rls.sql) for the role split.
