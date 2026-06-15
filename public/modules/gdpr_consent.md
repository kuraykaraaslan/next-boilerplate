# GDPR Consent

- **id:** `gdpr_consent`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/gdpr_consent/`
- **tags:** platform, gdpr, privacy, consent, compliance
- **icon:** `fas fa-shield-halved`
- **hasNextLayer:** true

Per-tenant cookie-consent banner configuration plus an append-only consent ledger that records each subject's grant/withdraw decision per purpose (necessary/functional/analytics/marketing). Public capture for anonymous visitors, latest-wins state derivation, and audit-logged writes. Data export/erasure is handled by tenant_export.

## Dependencies

- **requires:** `db`, `env`, `redis`, `common`, `audit_log`, `setting`

## Services

- `gdpr_consent.service.ts`

## DTOs

- `gdpr_consent.dto.ts`

## Entities

- `consent_record.entity.ts`

## Enums

- `gdpr_consent.enums.ts`

## Message keys

- `gdpr_consent.messages.ts`

## Setting keys

- `gdpr_consent.setting.keys.ts`

## TypeORM entities

- `ConsentRecord` (system) — `modules/gdpr_consent/entities/consent_record.entity.ts`

## Next layer (modules_next/) surface

- `gdpr_consent/ui/ConsentBanner` _(ui, client)_

## README

# gdpr_consent

Tenant-scoped **cookie / consent management** — a configurable consent banner and
an **append-only consent ledger** that records every subject's grant/withdraw
decision per purpose. Framework-agnostic (`modules/` layer); the Next bindings
(admin UI, public banner component, API routes) live under `app/` and
`modules_next/`.

> Data **export / erasure** (GDPR portability and right-to-be-forgotten) is
> handled by `tenant_export` — this module is **consent capture only** and does
> not duplicate that surface.

## What it does

A subject is identified by **either** an authenticated `subjectUserId` **or** an
anonymous `subjectAnonymousId` (banner visitors). Each consent decision appends
ONE immutable row to the ledger — rows are never updated or deleted. The current
state for a subject is derived by taking the **latest decision per purpose**
(later wins). The `necessary` purpose is strictly required and is always reported
as granted.

Purposes: `necessary` · `functional` · `analytics` · `marketing`.
Sources: `banner` · `api` · `import` · `admin`.

## Public API

```ts
import { GdprConsentService } from "@/modules/gdpr_consent";

// Anonymous banner submission (one row per decision)
await GdprConsentService.recordMany(
  tenantId,
  [{ purpose: "analytics", granted: true }, { purpose: "marketing", granted: false }],
  { anonymousId },
  { ipAddress, userAgent, source: "banner" },
);

// Single decision / withdrawal
await GdprConsentService.record(tenantId, { purpose: "marketing", granted: true, userId });
await GdprConsentService.withdraw(tenantId, "marketing", { userId });

// Current state (latest per purpose; necessary always true)
const state = await GdprConsentService.getState(tenantId, { userId });

// Admin ledger + banner config
const { data, total } = await GdprConsentService.list(tenantId, { page: 0, pageSize: 50 });
const cfg = await GdprConsentService.getBannerConfig(tenantId);
await GdprConsentService.updateBannerConfig(tenantId, { enabled: true }, actorId);
```

The pure state deriver is exported for unit use / edge contexts:
`deriveConsentState(records)`.

## Entities

| Entity | Table | Notes |
|---|---|---|
| `ConsentRecord` | `consent_records` | Append-only. Indexed on `tenantId`, `subjectUserId`, `subjectAnonymousId`. `@CreateDateColumn` only — no update column. |

## Settings

Stored via `SettingService` (keys owned by this module — `GDPR_CONSENT_KEYS`):

| Key | Meaning |
|---|---|
| `consentBannerEnabled` | `'true'`/`'false'` — show the banner |
| `consentPolicyVersion` | policy version captured on each decision |
| `consentBannerTitle` | banner heading |
| `consentBannerMessage` | banner body text |
| `consentPurposes` | JSON array of `{ key, label, description, required }` |

`getBannerConfig` falls back to sensible defaults (disabled, version `1`, the four
standard purposes) when keys are unset or malformed.

## Dependencies

`db`, `env`, `redis`, `common`, `audit_log`, `setting`.

## HTTP surface

- `POST /tenant/{tenantId}/api/consent` — **public** record (single or many decisions); rate-limited, captures IP + user-agent, source `banner`.
- `GET /tenant/{tenantId}/api/consent?userId=|anonymousId=` — **public** current state; rate-limited.
- `GET /tenant/{tenantId}/api/consent/config` — **public** banner config (so the banner can render).
- `PATCH /tenant/{tenantId}/api/consent/config` — **admin** update banner config.
- `GET /tenant/{tenantId}/api/consent/records` — **admin** paginated ledger.

UI: public banner `modules_next/gdpr_consent/ui/ConsentBanner.tsx`; admin page
`/tenant/{tenantId}/admin/consent`.
