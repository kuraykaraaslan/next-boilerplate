# db

Tek bir TypeORM `DataSource` üzerinden tüm entity'lere erişim. Default `getDataSource()` `env.DATABASE_URL`'i kullanır; opsiyonel olarak `tenantDataSourceFor(tenantId)` ile bir tenant kendine ait DB'ye (`TenantDatabase` row'u varsa) yönlendirilebilir. Yoksa default'a düşer.

## Public API

| Export | Source | Use |
|---|---|---|
| `getDataSource()` | [db.ts](db.ts) | Init+cache'lenmiş default DataSource. Tüm callsite'lar için. Idempotent. |
| `tenantDataSourceFor(tenantId)` | [db.ts](db.ts) | `TenantDatabase` row'u varsa o DB'ye giden ayrı DataSource (LRU cache, max 100). Yoksa `getDataSource()`'ı döner. |
| `clearTenantDsCache(tenantId)` | [db.ts](db.ts) | Per-tenant override cache'inden bir tenant'ı düşür. |
| `TenantDatabase` | [entities/tenant_database.entity.ts](entities/tenant_database.entity.ts) | `tenantId → databaseUrl` mapping. |
| `parseDbUrl(url)` | [db.utils.ts](db.utils.ts) | Postgres URL'ini `{ url, schema }` olarak ayırır. |

## Entity listesi

Tüm uygulama entity'leri tek bir array'de ([db.ts](db.ts)): User, UserProfile, UserSecurity, UserPreferences, UserSession, UserSocialAccount, SigningCertificate, TrustListEntry, TenantDatabase, Tenant, TenantDomain, TenantMember, TenantInvitation, TenantSubscription, Payment, PaymentTransaction, AuditLog, ApiKey, CouponRedemption, Webhook, WebhookDelivery, SamlConfig, Setting, Coupon, SubscriptionPlan, PlanFeature, PushSubscription, Invoice, InvoiceLine, TenantUsage, UploadedFile, AiUsageLog, NotificationLog, StoreCategory, StoreCategorySpec, StoreProduct, StoreProductImage, StoreProductSpecValue, StoreVariantGroup, StoreVariantGroupItem, StoreBundle, StoreBundleItem, SeoMeta, MediaGallery, MediaGalleryItem.

Yeni entity eklendiğinde [db.ts](db.ts) içindeki `ENTITIES` array'ine ekle.

## Usage

```ts
import { getDataSource, tenantDataSourceFor } from "@/modules/db";

// Default path — uygulamanın %99'u
const ds = await getDataSource();
const users = await ds.getRepository(User).find();

// Per-tenant DB override (opsiyonel; row yoksa default'a düşer)
const tds = await tenantDataSourceFor(tenantId);
const members = await tds.getRepository(TenantMember).find();
```

## Connection URL

Tek env var: `DATABASE_URL` (örn. `postgresql://postgres:postgres@localhost:5432/next_boilerplate?schema=public`).

Bir tenant'a ayrı DB tahsis etmek için `tenant_databases` tablosuna `{ tenantId, databaseUrl }` row'u yaz; `tenantDataSourceFor(tenantId)` o DB'ye düşer.

## Rules

- No `next/*`, no `react`. Service-layer only.
- Helper'lar her zaman `await` — ilk çağrıda lazy `initialize()` yapar.
- Test'lerde bu helper'lar mock'lanır; production'da asla `new DataSource()` çağrılmaz.
