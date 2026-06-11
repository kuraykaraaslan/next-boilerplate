# Setting

- **id:** `setting`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/setting/`
- **tags:** platform, configuration
- **icon:** `fas fa-gear`
- **hasNextLayer:** true

System-wide key-value settings store. Modules declare their keys in *.setting.keys.ts; the setting service stores/reads them.

## Dependencies

- **requires:** `db`, `env`

## Services

- `setting.service.ts`

## DTOs

- `setting.dto.ts`

## Entities

- `setting.entity.ts`

## Message keys

- `setting.messages.ts`

## Owned API routes

- `tenant` GET/POST/PUT/DELETE `/tenant/[tenantId]/api/settings`
- `tenant` GET/PUT/DELETE `/tenant/[tenantId]/api/settings/branding`
- `tenant` GET `/tenant/[tenantId]/api/settings/public`

## TypeORM entities

- `Setting` (system) — `modules/setting/entities/setting.entity.ts`

## Next layer (modules_next/) surface

- `setting/setting-fields.types` _(ui)_
- `setting/setting.types` _(ui)_
- `setting/ui/ModuleSettingsPage` _(ui, client)_
- `setting/ui/PlatformSettingsTabs` _(ui, client)_
- `setting/ui/settings-kit` _(ui, client)_
- `setting/ui/SettingsPanelHost` _(ui, client)_
- `setting/ui/tabs/platform-tab.shared` _(ui, client)_
- `setting/ui/tabs/PlatformAiTab` _(ui, client)_
- `setting/ui/tabs/PlatformAuthTab` _(ui, client)_
- `setting/ui/tabs/PlatformEmailTab` _(ui, client)_
- `setting/ui/tabs/PlatformNotificationsTab` _(ui, client)_
- `setting/ui/tabs/PlatformPaymentTab` _(ui, client)_
- `setting/ui/tabs/PlatformScimTab` _(ui, client)_
- `setting/ui/tabs/PlatformSecurityTab` _(ui, client)_
- `setting/ui/tabs/PlatformSmsTab` _(ui, client)_
- `setting/ui/tabs/PlatformStorageTab` _(ui, client)_
- `setting/ui/TenantSettingsPanels` _(ui, client)_

## README

# Setting Module

Generic **per-tenant** key/value configuration store. Every other module declares its keys in its own `*.setting.keys.ts` file and reads/writes them through `SettingService`, keyed by the request `tenantId`. Values are Redis-cached (10-min TTL) and namespaced per tenant.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `Setting` | `settings` | Per-tenant key/value row. Composite PK `(tenantId, key)`; `value` is always stored as `text`, with `group` bucketing keys for the admin UI and `type` (`string`/`number`/`boolean`/`json`/…) telling the reader how to coerce. |

Lives in the **tenant DB** — every row is isolated by `tenantId` via the per-tenant `DataSource` (`tenantDataSourceFor(tenantId)`).

---

## Service (`setting.service.ts`)

All methods take `tenantId` as the first argument and partition every read/write on `{ tenantId, key }`. The Redis cache key is namespaced per tenant (`settings:<tenantId>:<key>`, or `settings:<tenantId>:all` for the full list) so cached values never leak across tenants.

| Method | Responsibility |
|---|---|
| `getValue(tenantId, key)` | Single read path consumed by other modules; returns the tenant's value or `null` if unset. |
| `getByKey(tenantId, key)` | Full `Setting` row (cached) or `null`. |
| `getByKeys(tenantId, keys[])` | Bulk read → `Record<key, value>`; uses Redis `mget`, falls back to DB for misses, back-fills the cache. |
| `getAll(tenantId)` | All rows for the tenant (cached as the `:all` list). |
| `getAllAsRecord(tenantId)` | `getAll` flattened to `Record<key, value>`. |
| `getByGroup(tenantId, group)` | All rows in one `group` (uncached). |
| `create(tenantId, key, value, group?, type?)` | Upsert: inserts (defaults `group='general'`, `type='string'`) or updates an existing row. |
| `update(tenantId, key, value)` | Updates value of an existing row; throws `SETTING_NOT_FOUND` if missing. |
| `updateMany(tenantId, settings)` | Upserts a `Record<key, value>` batch (insert-or-update per key). Backs the admin `PUT`/`POST` route. |
| `delete(tenantId, key)` | Removes a row and its cache entry; returns the deleted row or `null`. |
| `clearCache(tenantId)` | Drops every cached per-key entry and the `:all` list for the tenant. |

Cache constants are module-wide and intentionally global: `REDIS_KEY_PREFIX = 'settings:'`, `REDIS_TTL = 600` (10 min). Cache reads/writes are best-effort (Redis errors are swallowed so a Redis outage degrades to direct DB access rather than failing).

---

## API Routes

`app/tenant/[tenantId]/api/admin-settings/route.ts` — tenant-scoped, **ADMIN+**.

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/admin-settings` | All settings for the tenant as a `Record<key, value>`. |
| PUT / POST | `/tenant/[tenantId]/api/admin-settings` | Upsert a `{ settings: Record<key, value> }` batch via `updateMany`. |

Each tenant owns its own row in the shared `settings` table — what used to be platform-wide super-admin config is now per-tenant. Guarded by `TenantSessionNextService.authenticateTenantByRequest({ requiredTenantRole: 'ADMIN' })` and rate-limited (`Limiter.checkRateLimit(request, 'api')`). `ROOT_TENANT_ID` is just another `tenantId` passed in by callers that want platform/system config — the store does not special-case it.

---

## Setting Keys

The setting module **declares no domain keys of its own**. Each module defines its own keys file (e.g. `auth.setting.keys.ts`, `ai.setting.keys.ts`) and `setting.types.ts` re-exports them all into one place; it also defines a few groups inline. Always import keys from the module that owns them — never hard-code key strings.

| Group | Source | Enum / `*_KEYS` |
|---|---|---|
| General, Auth | `@/modules/auth/auth.setting.keys` | `GeneralSettingKey` / `GENERAL_KEYS`, `AuthSettingKey` / `AUTH_KEYS` |
| Email, Notification | `@/modules/notification_mail/notification_mail.setting.keys` | `EmailSettingKey` / `EMAIL_KEYS`, `NotificationSettingKey` / `NOTIFICATION_KEYS` |
| SMS | `@/modules/notification_sms/notification_sms.setting.keys` | `SmsSettingKey` / `SMS_KEYS` |
| Storage | `@/modules/storage/storage.setting.keys` | `StorageSettingKey` / `STORAGE_KEYS` |
| AI | `@/modules/ai/ai.setting.keys` | `AiSettingKey` / `AI_KEYS` |
| Security | `@/modules/user_security/user_security.setting.keys` | `SecuritySettingKey` / `SECURITY_KEYS` |
| Payment | `@/modules/payment/payment.setting.keys` | `PaymentSettingKey` / `PAYMENT_KEYS` |
| Subscription | `@/modules/tenant_subscription/tenant_subscription.setting.keys` | `SubscriptionSettingKey` / `SUBSCRIPTION_KEYS` |
| Integrations | inline in `setting.types.ts` | `INTEGRATIONS_KEYS` — `discordWebhookUrl`, `discordDoormanWebhookUrl`, `githubTreeUrl`, `githubToken`, `githubUser` |
| Analytics | inline in `setting.types.ts` | `ANALYTICS_KEYS` — `googleTagId` |
| SEO | inline in `setting.types.ts` | `SEO_KEYS` — `metaRobots`, `sitemapEnabled`, `canonicalEnabled`, `ogDefaultImage`, `twitterCardType`, `googleSearchConsoleId`, `bingWebmasterId` |
| Social | inline in `setting.types.ts` | `SOCIAL_KEYS` — `facebookUrl`, `twitterUrl`, `instagramUrl`, `linkedinUrl`, `youtubeUrl`, `githubProfileUrl`, `tiktokUrl`, `pinterestUrl` |
| Localization | inline in `setting.types.ts` | `LOCALIZATION_KEYS` — `defaultTimezone`, `defaultLanguage`, `dateFormat`, `timeFormat`, `datetimeFormat`, `weekStartsOn`, `currencySymbol`, `currencyPosition`, `thousandSeparator`, `decimalSeparator` |

---

## Files

| File | Purpose |
|---|---|
| `setting.service.ts` | `SettingService` — tenant-scoped, Redis-cached CRUD (see above). |
| `setting.types.ts` | `Setting` zod schema/type + group enums, re-exports every module's setting keys. |
| `setting.dto.ts` | Request/response DTOs (`UpdateSettingsDTO`, `Get`/`Update` response DTOs, etc.). |
| `setting.messages.ts` | Error/success message strings. |
| `setting.seed.ts` | Demo-data seed: varied key/value rows across groups for a tenant (idempotent on `(tenantId, key)`). |
| `entities/setting.entity.ts` | TypeORM entity for the `settings` table. |

---

## Usage

```typescript
import SettingService from '@/modules/setting/setting.service';

// Read a single value for a tenant (null if unset)
const fromEmail = await SettingService.getValue(tenantId, 'fromEmail');

// Bulk read several keys at once (Redis mget + DB fallback)
const cfg = await SettingService.getByKeys(tenantId, ['mailProvider', 'fromEmail']);

// Upsert one key
await SettingService.create(tenantId, 'fromEmail', 'noreply@example.com', 'Email', 'string');

// Upsert a batch (backs the admin PUT/POST route)
await SettingService.updateMany(tenantId, {
  mailProvider: 'sendgrid',
  fromEmail: 'noreply@example.com',
});

// All settings in one group
const emailSettings = await SettingService.getByGroup(tenantId, 'Email');
```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The setting module is the generic per-tenant key/value configuration store (composite PK tenantId+key, Redis-cached) that every other module reads/writes through SettingService keyed by the request tenantId; it is deeply tenant-variable as infrastructure but declares no domain keys of its own.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Setting` | `settings` | key, value, group, type |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `setting.service.ts` — Every read/write is partitioned by tenant: getValue/getByKey/getByKeys/getAll/create/update/updateMany/delete all open tenantDataSourceFor(tenantId) and filter on { tenantId, key }, so each tenant has an isolated set of (key,value) rows. The Redis cache key is also namespaced per tenant (settings:<tenantId>:<key>), so cached values never leak across tenants.
- `setting.service.ts:getValue` — Returns each tenant's own override for a given key (or null if unset); this is the single read path consumed by other modules to drive per-tenant provider selection (mail/payment/storage providers, AI keys, auth/security policy, branding, webhooks, etc.) using the caller's request tenantId. ROOT_TENANT_ID is just another tenantId passed in by callers that want platform/system config -- the store itself does not special-case it.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Redis cache TTL and key prefix are hardcoded module-wide (REDIS_TTL = 600s, REDIS_KEY_PREFIX = 'settings:') | `setting.service.ts (SettingService.REDIS_TTL / REDIS_KEY_PREFIX)` | Intentionally global shared-infra constants -- a uniform settings cache TTL/prefix across all tenants is appropriate and a per-tenant TTL would add complexity with little benefit. Listed only for completeness; not recommended to make tenant-scoped. | — |

---

## Dependencies

`db` (per-tenant `DataSource`), `redis` (cache), `env`. The `tenant` module supplies `ROOT_TENANT_ID`.
