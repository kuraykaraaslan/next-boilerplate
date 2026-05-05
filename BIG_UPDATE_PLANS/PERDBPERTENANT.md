# Per-Tenant Database Provisioning

## Context

Currently all tenants share a single tenant database (`TENANT_DATABASE_URL`). The infrastructure for per-tenant isolation is already partially in place:

- `libs/typeorm/entities/tenant_database.entity.ts` — `TenantDatabase` entity (maps `tenantId → databaseUrl`)
- `libs/typeorm/tenant.ts` — `tenantDataSourceFor(tenantId)` with LRU cache (max 100) and `TenantDatabase` lookup, falls back to `TENANT_DATABASE_URL` when no record found
- `tenant.dto.ts` — `region` field already exists (prepared for multi-region support)

**What is missing:** When a tenant is created, nothing provisions a dedicated schema/database, no `TenantDatabase` record is inserted, and no migration system exists for tenant schemas (`migrations: []` and `synchronize: false` in both `defaultTenantDataSource` and `tenantDataSourceFor`).

**Chosen isolation mode:** Schema-based isolation (same PostgreSQL server, one schema per tenant). The existing `parseDbUrl()` in `tenant.ts` already parses `?schema=` parameters. The `TenantDatabase.databaseUrl` supports both schema-based URLs (`?schema=tenant_xyz`) and fully separate database URLs, so upgrading to full-database isolation later is possible without changing the consumer API.

---

## Files to Create / Modify

### 1. Update Entity — `libs/typeorm/entities/tenant_database.entity.ts`
Add three new columns:
- `status: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'ERROR'` (default `'PENDING'`)
- `mode: 'schema' | 'database'` (default `'schema'`)
- `errorMessage: string | null` (nullable, stores last provisioning error)

### 2. New Migration Directory — `migrations/tenant/`
```
migrations/
└── tenant/
    ├── index.ts                                   ← exports TENANT_MIGRATIONS array
    └── 1748000000000-InitialTenantSchema.ts       ← generated from current entities
```

Generated with:
```bash
npx typeorm migration:generate migrations/tenant/InitialTenantSchema \
  --dataSource libs/typeorm/tenant.ts
```

`index.ts` statically imports and re-exports all migration classes (Next.js does not support runtime glob imports):
```typescript
import { InitialTenantSchema1748000000000 } from './1748000000000-InitialTenantSchema';
export const TENANT_MIGRATIONS = [InitialTenantSchema1748000000000];
```

### 3. Update `libs/typeorm/tenant.ts`
- Import `TENANT_MIGRATIONS` and add to both DataSource definitions: `migrations: TENANT_MIGRATIONS`
- Add helper function `provisionTenantSchema(schemaName: string, baseUrl: string)`:
  - Opens a temporary DataSource with `synchronize: false`
  - Runs `CREATE SCHEMA IF NOT EXISTS "<schemaName>"` via `QueryRunner`
  - Runs `dataSource.runMigrations()` to apply all migrations
  - Destroys the temporary DataSource

### 4. New Module — `modules/tenant_database/`
```
modules/tenant_database/
├── tenant_database.enums.ts
├── tenant_database.types.ts
├── tenant_database.dto.ts
├── tenant_database.messages.ts
├── tenant_database.service.ts
└── README.md
```

### 5. New API Routes
```
app/system/api/tenants/[tenantId]/database/
├── route.ts                   ← GET (status), POST (provision), DELETE (deprovision)
├── migrate/route.ts           ← POST (run migrations for this tenant)
├── migration-status/route.ts  ← GET (applied / pending count)
└── sync/route.ts              ← POST (synchronize — dev/emergency only)

app/system/api/admin/tenant-databases/
├── route.ts                   ← GET (paginated list of all TenantDatabase records)
└── migrate-all/route.ts       ← POST (enqueue bulk migration BullMQ job)
```

All routes require `system:admin` scope.

### 6. Modify `modules/tenant/tenant.service.ts`
In `create()`, after saving the tenant record, call:
```typescript
if (env.TENANT_DB_AUTO_PROVISION) {
  await TenantDatabaseService.provision(tenant.tenantId);
}
```

### 7. New BullMQ Queue — `tenant-db-migration`
Add to existing queue infrastructure:
```typescript
// Queue: 'tenant-db-migration'
// Job payload: { tenantId: string }
// Worker: fetches DataSource via tenantDataSourceFor(tenantId), runs runMigrations()
// Concurrency: 5
```

### 8. New Admin UI Page — `app/system/admin/tenants/[tenantId]/database/page.tsx`

### 9. Update existing pages
- `app/system/admin/tenants/page.tsx` — add "DB Status" column to tenant list table
- `app/system/api/health/route.ts` — add tenant DB provisioning statistics

---

## TenantDatabaseService Methods

| Method | Description |
|---|---|
| `provision(tenantId, mode?)` | Create schema, run all migrations, insert `TenantDatabase` record |
| `runMigrations(tenantId)` | Run pending migrations on an already-provisioned tenant schema |
| `migrateAll()` | Enqueue `tenant-db-migration` BullMQ jobs for all ACTIVE tenant databases |
| `getMigrationStatus(tenantId)` | Return `{ applied: number, pending: number, migrations: string[] }` |
| `sync(tenantId)` | Emergency: call `dataSource.synchronize()` — dev only, never production |
| `getStatus(tenantId)` | Return the `TenantDatabase` record |
| `getAll(opts)` | Paginated list of all `TenantDatabase` records, filterable by status |
| `deprovision(tenantId)` | Delete `TenantDatabase` record, evict LRU cache (schema drop is opt-in) |

---

## Provisioning Flow (New Tenant)

```
TenantService.create(dto)
  ↓
INSERT INTO tenants (...)                       ← default tenant DB
  ↓
TenantDatabaseService.provision(tenantId)
  ↓
1. Check TenantDatabase record exists → skip if already ACTIVE
2. INSERT TenantDatabase { tenantId, status: 'PROVISIONING', mode: 'schema' }
3. Derive schema name:
     schemaName = 'tenant_' + tenantId.replace(/-/g, '_')
4. Parse base URL from TENANT_DATABASE_URL (strip ?schema= param)
5. Run: CREATE SCHEMA IF NOT EXISTS "<schemaName>"        ← via QueryRunner
6. Open temporary DataSource:
     { url: baseUrl, schema: schemaName, migrations: TENANT_MIGRATIONS, synchronize: false }
7. Run: dataSource.runMigrations()
     → creates `typeorm_migrations` table inside the new schema
     → applies all migration classes in order
8. Destroy temporary DataSource
9. UPDATE TenantDatabase SET status='ACTIVE', databaseUrl='...?schema=<schemaName>'
10. clearTenantDsCache(tenantId)
     → next call to tenantDataSourceFor() opens fresh DataSource pointing to tenant schema
```

If any step fails:
```
UPDATE TenantDatabase SET status='ERROR', errorMessage='...'
throw AppError(...)
```

---

## Migration Strategy for Ongoing Schema Changes

### When a new entity is added or a column changes

1. Generate migration:
   ```bash
   npx typeorm migration:generate migrations/tenant/AddColumnX \
     --dataSource libs/typeorm/tenant.ts
   ```
2. Add the new class to `migrations/tenant/index.ts` → `TENANT_MIGRATIONS`
3. Deploy the application (DataSource now knows about the new migration)
4. Trigger bulk migration:
   ```
   POST /system/api/admin/tenant-databases/migrate-all
   ```
   → Enqueues one BullMQ job per active tenant
   → Each worker calls `dataSource.runMigrations()` (idempotent — already-applied migrations are skipped via `typeorm_migrations` table in each schema)

### Why TypeORM code-first migrations instead of synchronize?

| Approach | Risk | Verdict |
|---|---|---|
| `synchronize: true` permanent | Drops columns/tables on rename | Never use in production |
| `synchronize()` on demand | Same risk, manual trigger | Dev/emergency only |
| Raw SQL scripts | Manual sync with entities | Error-prone at scale |
| **TypeORM migration files** | Idempotent, tracked per schema, safe | **Chosen approach** |

TypeORM tracks applied migrations in a `typeorm_migrations` table **inside each schema**. `runMigrations()` is safe to call repeatedly — it only applies unapplied migrations.

---

## Enums and Types

```typescript
// tenant_database.enums.ts
export const TenantDatabaseStatusEnum = z.enum(['PENDING', 'PROVISIONING', 'ACTIVE', 'ERROR']);
export const TenantDatabaseModeEnum = z.enum(['schema', 'database']);

// tenant_database.types.ts
export const TenantDatabaseSchema = z.object({
  tenantId: z.string().uuid(),
  databaseUrl: z.string(),
  status: TenantDatabaseStatusEnum,
  mode: TenantDatabaseModeEnum,
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TenantMigrationStatusSchema = z.object({
  applied: z.number(),
  pending: z.number(),
  appliedMigrations: z.string().array(),
  pendingMigrations: z.string().array(),
});
```

---

## New Environment Variables (`libs/env.ts`)

```env
TENANT_DB_AUTO_PROVISION=true        # provision schema on tenant creation (default: true)
TENANT_DB_PROVISION_MODE=schema      # 'schema' | 'database'
TENANT_DB_SCHEMA_PREFIX=tenant_      # schema name prefix
```

---

## Admin UI — `app/system/admin/tenants/[tenantId]/database/page.tsx`

Reuses components from `/home/kuray/01_NextJS_Components`:

| Section | Component |
|---|---|
| Status card (schema name, mode, URL, status) | `Widget.tsx` + `Badge.tsx` |
| Migration status (applied N / pending N) | `Badge.tsx` + `Skeleton.tsx` |
| "Provision" button (shown if not yet provisioned) | `Button.tsx` + `Modal.tsx` (confirmation) |
| "Run Migrations" button | `Button.tsx` + `Spinner.tsx` |
| "Sync Schema" button (emergency, dev only) | `Button.tsx` + `AlertBanner.tsx` (warning) |
| Error message display | `AlertBanner.tsx` |
| Deprovision (destructive) | `Button.tsx` (danger variant) + `Modal.tsx` |

Tab is added to the existing tenant detail navigation (alongside Members, Domains, etc.).

---

## Reused Functions / Utilities

| Function | File | Usage |
|---|---|---|
| `tenantDataSourceFor(tenantId)` | `libs/typeorm/tenant.ts` | Get tenant DataSource after provisioning |
| `clearTenantDsCache(tenantId)` | `libs/typeorm/tenant.ts` | Evict stale DataSource after provisioning |
| `getSystemDataSource()` | `libs/typeorm/system.ts` | CRUD on `TenantDatabase` entity |
| `parseDbUrl(url)` | `libs/typeorm/tenant.ts` | Strip `?schema=` for base URL derivation |
| `UserSessionNextService.authenticateUserByRequest()` | `modules/user_session/` | Auth middleware in API routes |
| `AppError` | `libs/app-error.ts` | Standardized error throwing |
| `env` | `libs/env.ts` | Access `TENANT_DATABASE_URL`, new env vars |

---

## Implementation Order

1. Generate `InitialTenantSchema` migration from existing entities
2. Create `migrations/tenant/index.ts` with `TENANT_MIGRATIONS` array
3. Update `libs/typeorm/tenant.ts` — add `TENANT_MIGRATIONS` to both DataSources + add `provisionTenantSchema()` helper
4. Add `status`, `mode`, `errorMessage` columns to `TenantDatabase` entity
5. Create `modules/tenant_database/` module (enums → types → messages → dto → service)
6. Add `tenant-db-migration` BullMQ queue + worker
7. Create API routes (provision, migrate, migration-status, sync, deprovision, migrate-all)
8. Add auto-provision hook to `modules/tenant/tenant.service.ts`
9. Create `app/system/admin/tenants/[tenantId]/database/page.tsx`
10. Update tenant list page — add DB status column
11. Update health check — add pending migrations count + ACTIVE/ERROR tenant DB counts
12. Add new env vars to `libs/env.ts` + `.env.example`

---

## Verification

1. `POST /system/api/tenants` — new tenant created → `tenant_databases` row with `status: ACTIVE`, PostgreSQL schema `tenant_<id>` exists with all tables
2. `GET /system/api/tenants/[tenantId]/database` → `{ status: 'ACTIVE', mode: 'schema', databaseUrl: '...?schema=tenant_...' }`
3. `GET /system/api/tenants/[tenantId]/database/migration-status` → `{ applied: N, pending: 0 }`
4. Add new migration file → `POST /database/migrate` → `applied` increases, `pending` returns to 0
5. `POST /system/api/admin/tenant-databases/migrate-all` → BullMQ jobs enqueued, all tenants updated
6. `TENANT_DB_AUTO_PROVISION=false` → create tenant → no `TenantDatabase` record, `tenantDataSourceFor()` falls back to shared DB
7. Admin UI — Database tab shows status badge, migration counts, action buttons
8. `GET /system/api/health` — includes `{ tenantDatabases: { active: N, error: N, pendingMigrations: N } }`