# Good to Have — Database

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Row-Level Security Activation

### RLS Session Variable Hook on Connection Checkout
**Why:** Migration `001_tenant_rls.sql` enables Postgres RLS on 22 tenant-scoped tables but `tenantDataSourceFor` never issues `SET LOCAL app.current_tenant = $1`, leaving the entire RLS layer dormant and tenant isolation relying solely on application-layer `where: { tenantId }` guards.
**Complexity:** Medium
**Multi-tenant relevance:** Without the hook, a missing `where` clause in any service silently returns or mutates rows belonging to a different tenant; the RLS layer is the last line of defence that currently does nothing.
**Multi-country relevance:** Regulatory data-residency requirements (GDPR, KVKK, PIPEDA) demand provable database-level isolation between tenants in different jurisdictions; dormant RLS cannot satisfy an audit.

### Typed BYPASSRLS Role Abstraction
**Why:** Platform-level cron jobs and migrations need cross-tenant DB access, but there is no helper or typed constant that encodes "use the admin role that bypasses RLS", leaving every job to re-implement `SET LOCAL app.bypass_rls = 'on'` ad hoc.
**Complexity:** Low
**Multi-tenant relevance:** A centralised `getSystemDataSource()` that uses the `app_admin` Postgres role prevents accidental cross-tenant data exposure in jobs that forget the bypass step.
**Multi-country relevance:** Regional maintenance windows and data export jobs (e.g. GDPR right-to-erasure sweeps) need guaranteed cross-tenant access that is granted consistently, not per-job.

## Connection Pooling & Performance

### PgBouncer / Connection Pool Configuration
**Why:** TypeORM opens a new connection per `DataSource`; with 100 cached per-tenant DataSources and a serverless deployment each pod may exhaust Postgres `max_connections` under load.
**Complexity:** High
**Multi-tenant relevance:** Each new tenant added to the system eventually adds a cached DataSource; without pooling, a platform with 200+ active tenants will hit connection limits.
**Multi-country relevance:** Multi-region deployments multiply the connection count by the number of regions; pooling per region (or using a PgBouncer sidecar) is essential for geographic scale.

### Read Replica Routing
**Why:** The current `DataSource` points to a single Postgres URL; there is no mechanism to route read-heavy queries (`SELECT`, analytics) to a replica, forcing all traffic through the primary write node.
**Complexity:** High
**Multi-tenant relevance:** Analytics-heavy tenants (reporting dashboards, audit log queries) can saturate the primary and cause write latency for all other tenants sharing the same DB.
**Multi-country relevance:** Deploying read replicas in the same region as users (e.g. an EU replica for European tenants) reduces read latency significantly for geographically distributed tenant populations.

### Per-Tenant Connection Pool Sizing
**Why:** Every tenant's `DataSource` uses identical default pool settings; an enterprise tenant generating 1000 req/s shares the same pool cap as a free-plan tenant generating 5 req/s.
**Complexity:** Medium
**Multi-tenant relevance:** Fair-use isolation requires capping the connection concurrency available to any single tenant's `DataSource` so one tenant cannot starve others.
**Multi-country relevance:** Regions with high network latency (e.g. connecting from a US pod to an EU DB) need a larger pool to maintain throughput; pool sizing should account for regional topology.

## Migration Management

### Formal Migration Runner Integration
**Why:** The project relies on `synchronize: true` in development and has no production migration runner; the three hand-crafted SQL files in `migrations/` have no automated apply/rollback mechanism.
**Complexity:** High
**Multi-tenant relevance:** Per-tenant DB overrides (separate physical databases via `TenantDatabase`) each need migrations run independently; a manual `psql` workflow does not scale to N tenant databases.
**Multi-country relevance:** Country-specific data-model changes (e.g. adding a VAT registration number column for EU tenants) must be deployed to tenant DBs selectively; a migration runner that can target a subset of tenant databases is required.

### Per-Tenant DB Provisioning API
**Why:** There is a `TenantDatabase` entity and a `tenantDataSourceFor` helper but no service or API for creating, migrating, and decommissioning per-tenant databases; the operator must manually insert rows and run migrations.
**Complexity:** High
**Multi-tenant relevance:** Scaling from shared-DB to dedicated-DB tenants (typical enterprise upsell) requires an automated provisioning flow; manual SQL inserts are error-prone at scale.
**Multi-country relevance:** Data-residency laws may require spinning up a dedicated database in a specific country's cloud region; an API that accepts a `region` parameter and provisions the DB there is required.

## Observability & Health

### DataSource Health Check Endpoint
**Why:** There is no exported health-check function that verifies the default `DataSource` is connected, leaving the `/health` endpoint unable to report DB status accurately.
**Complexity:** Low
**Multi-tenant relevance:** When a per-tenant database goes offline (network partition, credential rotation), there is no programmatic way to detect and surface this before a tenant's next request fails.
**Multi-country relevance:** Multi-region deployments need per-region DB health signals to drive traffic failover decisions; a health-check function per DataSource is the prerequisite.

### Slow-Query Logging with Tenant Context
**Why:** TypeORM logging is global and binary; there is no hook that tags slow queries with the `tenantId` that triggered them, making performance root-cause analysis across tenants impossible.
**Complexity:** Medium
**Multi-tenant relevance:** Identifying which tenant's query pattern is causing table scans requires the `tenantId` to appear in the slow-query log; without it, performance issues are unattributable.
**Multi-country relevance:** Regional databases may have different index strategies and data volumes; per-region slow-query tagging enables targeted index tuning without a shared global log.

## Schema Isolation

### Postgres Schema-Per-Tenant Mode
**Why:** The current design supports only full per-tenant DB isolation or full shared-DB; there is no middle path of Postgres schema-per-tenant (`search_path = tenant_<id>`) which gives schema isolation without the overhead of a separate connection pool.
**Complexity:** High
**Multi-tenant relevance:** Schema-per-tenant enables tenant data deletion via `DROP SCHEMA` (useful for GDPR erasure), table-level backup per tenant, and logical isolation without separate Postgres instances.
**Multi-country relevance:** Regulatory requirements in some countries mandate provable schema-level separation (not just row-level); schema-per-tenant satisfies this requirement at lower infrastructure cost than full DB isolation.
