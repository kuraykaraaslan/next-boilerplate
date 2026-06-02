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
- `setting/ui/TenantSettingsPanels` _(ui, client)_

## README

# setting module

System-wide key-value settings with Redis caching (10-min TTL). Aggregates and re-exports setting keys from all other modules.

---

## Files

| File | Purpose |
|---|---|
| `setting.service.ts` | Core: get, set, bulk update, group query |
| `setting.types.ts` | `Setting` type + re-exports from all module setting key files |
| `setting.dto.ts` | `UpdateSettingDTO`, `BulkUpdateSettingsDTO` |
| `setting.messages.ts` | Error/success message strings |
| `entities/setting.entity.ts` | TypeORM entity |

---

## Setting Groups

Settings are organized into groups for the admin UI:

`General` · `Auth` · `Email` · `SMS` · `Storage` · `AI` · `Security` · `Payment` · `Subscription` · `Integrations` · `Analytics` · `SEO` · `Social` · `Localization`

---

## Usage

```typescript
import SettingService from '@/modules/setting/setting.service';

// Read a single value
const value = await SettingService.get('MAIL_FROM_ADDRESS');

// Read as typed (returns null if not set)
const maxSize = await SettingService.getNumber('STORAGE_MAX_FILE_SIZE_MB');
const enabled = await SettingService.getBoolean('AUTH_REGISTRATION_ENABLED');

// Write
await SettingService.set('MAIL_FROM_ADDRESS', 'noreply@example.com');

// Bulk update
await SettingService.bulkUpdate([
  { key: 'MAIL_PROVIDER', value: 'sendgrid' },
  { key: 'MAIL_SENDGRID_API_KEY', value: 'SG.xxx' },
]);

// Get all settings in a group
const emailSettings = await SettingService.getGroup('Email');
```

---

## Setting Keys

Each module defines its own setting keys file (e.g. `auth.setting.keys.ts`, `ai.setting.keys.ts`). `setting.types.ts` re-exports them all. Always import keys from the module that owns them — never hard-code key strings.

---

## API Routes

```
GET  /tenant/{ROOT_TENANT_ID}/api/admin-settings
GET  /tenant/{ROOT_TENANT_ID}/api/admin-settings?group=Email
PUT  /tenant/{ROOT_TENANT_ID}/api/admin-settings
POST /tenant/{ROOT_TENANT_ID}/api/admin-settings
```

Root-tenant-only — guarded by `authenticateRootTenantAdmin` + `isRootTenant(tenantId)` check.
