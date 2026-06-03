# SEO Metadata

- **id:** `seo`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/seo/`
- **tags:** seo, metadata
- **icon:** `fas fa-search`
- **hasNextLayer:** true

Polymorphic SEO metadata (title, description, Open Graph, canonical, noIndex) attachable to any entity type via entityType + entityId pair.

## Dependencies

- **requires:** `db`, `redis`

## Services

- `seo.service.ts`

## DTOs

- `seo.dto.ts`

## Entities

- `seo_meta.entity.ts`

## Enums

- `seo.enums.ts`

## Message keys

- `seo.messages.ts`

## Owned API routes

- `tenant` GET/PUT `/tenant/[tenantId]/api/seo/[entityType]/[entityId]`

## TypeORM entities

- `SeoMeta` (system) — `modules/seo/entities/seo_meta.entity.ts`

## Next layer (modules_next/) surface

- `seo/ui/SeoPanel` _(ui, client)_

## README

# Seo Module

Polymorphic SEO-metadata store. A single `SeoMeta` row holds title, description, keywords, Open Graph, Twitter card, canonical URL and `noIndex` flags, attachable to any entity via an `entityType` + `entityId` pair. Every row is tenant-scoped and reads are Redis-cached.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `SeoMeta` | `seo_meta` | Polymorphic SEO metadata for one entity, unique per `(tenantId, entityType, entityId)` |

Lives in the **tenant DB**. Columns: `seoId` (uuid PK), `tenantId`, `entityType` (varchar 50), `entityId` (uuid), `title`, `description`, `keywords` (jsonb string array), `ogTitle`, `ogDescription`, `ogImageUrl`, `canonicalUrl`, `twitterTitle`, `twitterDescription`, `twitterCard`, `noIndex` (bool, default `false`), `updatedAt`. `tenantId`, `entityType` and `entityId` are indexed, with a `@Unique` constraint across the three.

### Entity types

`SeoEntityTypeEnum` (`seo.enums.ts`) constrains the polymorphic `entityType` at the route boundary:

| Value | Attaches to |
|---|---|
| `store_category` | Store category |
| `store_product` | Store product |
| `store_bundle` | Store bundle |
| `dynamic_page` | Dynamic page |

`entityId` is a bare cross-module uuid — there are no cross-DB foreign keys.

---

## Service / Responsibilities

`SeoService` (`seo.service.ts`) — static methods, all keyed by `(tenantId, entityType, entityId)` and resolving the per-tenant DataSource via `tenantDataSourceFor(tenantId)`:

| Method | Responsibility |
|---|---|
| `upsert(tenantId, entityType, entityId, dto)` | Find-or-create the row, `Object.assign` the DTO, save, then invalidate the cache key. Returns the parsed `SeoMeta`. |
| `get(tenantId, entityType, entityId)` | Read the row, wrapped in `singleFlight` on the cache key to collapse concurrent reads. Returns `SeoMeta` or `null`. |
| `delete(tenantId, entityType, entityId)` | Delete the row and invalidate the cache key. |

Results are validated/shaped through `SeoMetaSchema` (`seo.types.ts`) before return. Write payloads are validated by `UpsertSeoDTO` (`seo.dto.ts`): string length caps (title/og/twitter titles ≤ 200, descriptions ≤ 500, ≤ 30 keywords of ≤ 100 chars each), URL validation for `ogImageUrl`/`canonicalUrl`, and `noIndex` defaulting to `false`. `SEO_MESSAGES` (`seo.messages.ts`) holds the `NOT_FOUND` / `UPSERT_FAILED` message strings.

### Caching

`get` is cached under the tenant-namespaced Redis key `seo:{tenantId}:{entityType}:{entityId}`; `upsert` and `delete` `redis.del` that same key so the next read repopulates.

---

## API Routes

Tenant-scoped, **ADMIN+** (`TenantSessionNextService.authenticateTenantByRequest` with `requiredTenantRole: 'ADMIN'`), rate-limited via `Limiter.checkRateLimit`. `entityType` + `entityId` are validated with `SeoRouteParamsDTO` (enum + uuid).

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/seo/[entityType]/[entityId]` | Read SEO metadata (`{ seo }`, `null` if none) |
| PUT | `/tenant/[tenantId]/api/seo/[entityType]/[entityId]` | Upsert SEO metadata from an `UpsertSeoDTO` body |

---

## Settings

This module has no settings — no per-tenant or system-only setting keys. Behavior is identical across tenants; only the data varies.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A polymorphic SEO-metadata store (title/description/OpenGraph/Twitter/canonical/noIndex) attachable to any entity via entityType+entityId; fully per-tenant by data — every row is tenantId-keyed and read/written through tenantDataSourceFor(tenantId) — with no per-tenant settings or behavioral branching.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `SeoMeta` | `seo_meta` | entityType, entityId, title, description, keywords, ogTitle, ogDescription, ogImageUrl, canonicalUrl, twitterTitle, twitterDescription, twitterCard, noIndex |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `seo.service.ts` — All CRUD (upsert/get/delete) resolves the per-tenant DataSource via tenantDataSourceFor(tenantId) and filters every query by { tenantId, entityType, entityId }, so each tenant sees only its own SEO metadata rows; results are isolated by tenant-namespaced Redis cache key seo:{tenantId}:{entityType}:{entityId}.

---

## Seed

`seedSeo` (`seo.seed.ts`) seeds four demo `seo_meta` rows (product, category, bundle, dynamic page) per tenant, idempotently via `ctx.foc` keyed on the `@Unique` constraint. `entityId`s are read from `ctx.refs` (published by the store seed) with deterministic literal fallbacks; the dynamic-page row sets `noIndex: true`.

---

## Usage example

```typescript
import SeoService from '@/modules/seo/seo.service';

// Upsert SEO metadata for a store product
await SeoService.upsert(tenantId, 'store_product', productId, {
  title: 'Test Laptop — 15.6" Performance Notebook',
  description: 'A configurable 15.6" demo laptop.',
  keywords: ['laptop', 'notebook', 'SSD'],
  ogImageUrl: 'https://example.com/og.png',
  canonicalUrl: 'https://example.com/products/test-laptop',
  twitterCard: 'summary_large_image',
  noIndex: false,
});

// Read it back (Redis-cached, single-flighted)
const seo = await SeoService.get(tenantId, 'store_product', productId);
```

---

## Dependencies

Requires `db` (per-tenant DataSource) and `redis` (cache + `singleFlight`), per `module.json`.
