# User Preferences

- **id:** `user_preferences`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/user_preferences/`
- **tags:** identity, ux
- **icon:** `fas fa-sliders`
- **hasNextLayer:** false

Per-user preferences: theme, language, timezone, notification opt-ins.

## Dependencies

- **requires:** `db`, `user`

## Services

- `user_preferences.service.ts`

## DTOs

- `user_preferences.dto.ts`

## Entities

- `user_preferences.entity.ts`

## Enums

- `user_preferences.enums.ts`

## TypeORM entities

- `UserPreferences` (system) — `modules/user_preferences/entities/user_preferences.entity.ts`

## README

# User Preferences Module

Per-user UI/UX preferences: theme, language, timezone, date/time formats, notification opt-ins (email/SMS/push/newsletter), and week start day. One row per user, keyed by `userId`, with sensible defaults applied on creation.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `UserPreferences` | `user_preferences` | One preferences row per user (`userId` is `unique`). System-scoped — **no `tenantId` column**. |

Lives in the **system DB**. Defaults are baked into the entity columns: `theme=SYSTEM`, `language=EN`, `timezone=UTC`, `dateFormat=DD_MM_YYYY`, `timeFormat=H24`, `firstDayOfWeek=MON`, `emailNotifications=true`, `smsNotifications=false`, `pushNotifications=true`, `newsletter=true`.

---

## Files

| File | Purpose |
|---|---|
| `user_preferences.service.ts` | Core CRUD + Redis-cached reads (`getByUserId`, `create`, `update`, `upsert`, `delete`, `getOrCreateDefault`) |
| `user_preferences.types.ts` | `UserPreferences` type, `UserPreferencesSchema` (Zod), `UserPreferencesDefault` |
| `user_preferences.dto.ts` | `UpdatePreferencesRequestSchema` — request DTO for the PUT route |
| `user_preferences.enums.ts` | All preference enums |
| `entities/user_preferences.entity.ts` | TypeORM entity |
| `user_preferences.seed.ts` | Demo seed (3 system-scoped rows, keyed on `userId`) |

---

## Services / Responsibilities

`UserPreferencesService` (default export, static methods):

| Method | Responsibility |
|---|---|
| `getByUserId(userId)` | Read preferences (Redis-cached, single-flighted). Returns `null` if none exist. |
| `create(userId, data?)` | Insert a new row from `UserPreferencesDefault` merged with `data`. Throws if a row already exists. |
| `update(userId, data)` | Patch an existing row. Throws `Preferences not found` if missing. |
| `upsert(userId, data)` | Update if present, otherwise create from schema defaults merged with `data`. |
| `delete(userId)` | Delete the row. Throws `Preferences not found` if missing. |
| `getOrCreateDefault(userId)` | Return the existing row, or create one with defaults if missing. |

Every mutation calls `clearCache(userId)`; all reads/writes validate through `UserPreferencesSchema`.

---

## Preference Options

| Preference | Options | Default |
|---|---|---|
| `theme` | `LIGHT`, `DARK`, `SYSTEM` | `SYSTEM` |
| `language` | `EN`, `ES`, `FR`, `DE`, `CN`, `JP` | `EN` |
| `timezone` | free string (IANA tz, e.g. `Europe/Berlin`) | `UTC` |
| `dateFormat` | `DD_MM_YYYY`, `MM_DD_YYYY` | `DD_MM_YYYY` |
| `timeFormat` | `H24`, `H12` | `H24` |
| `firstDayOfWeek` | `MON`, `SUN` | `MON` |
| `emailNotifications` | `boolean` | `true` |
| `smsNotifications` | `boolean` | `false` |
| `pushNotifications` | `boolean` | `true` |
| `newsletter` | `boolean` | `true` |

---

## Usage

```typescript
import UserPreferencesService from '@/modules/user_preferences/user_preferences.service';

// Read (returns null if the user has no preferences yet)
const prefs = await UserPreferencesService.getByUserId(userId);

// Read-or-create with defaults
const ensured = await UserPreferencesService.getOrCreateDefault(userId);

// Update
await UserPreferencesService.update(userId, {
  theme: 'DARK',
  language: 'DE',
  timeFormat: 'H24',
});
```

---

## API Routes

Tenant-scoped under `/api/auth/me` (preferences are user-global; the tenant is used only to authenticate the session):

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/auth/me/preferences` | Read the authenticated user's preferences (`{ userPreferences }`, `null` if unset) |
| PUT | `/tenant/[tenantId]/api/auth/me/preferences` | Update preferences (body validated by `UpdatePreferencesRequestSchema`) |

Both routes authenticate via `TenantSessionNextService.authenticateTenantByRequest` and are rate-limited via `Limiter.checkRateLimit`. The PUT body accepts either `{ userPreferences: {...} }` or the fields at the top level.

---

## Caching

`getByUserId(userId)` is cached in Redis under `user_preferences:user:{userId}` (TTL = `SESSION_CACHE_TTL`, default 5 min). Null results are cached. Every mutation (`create`, `update`, `upsert`, `delete`) invalidates the key.

TTL is jittered (`jitter`) and reads are wrapped in in-process single-flight (`singleFlight`).

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Stores per-user UI/UX preferences (theme, language, timezone, notifications) in a system-scoped entity with no tenant variability — all users across all tenants share the same preferences table, keyed by userId only.

---

## Dependencies

Requires: `db`, `user`. Reads use `redis` (cache + single-flight) and `env` (`SESSION_CACHE_TTL`).
