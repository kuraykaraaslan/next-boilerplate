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
GET  /system/api/settings
GET  /system/api/settings?group=Email
PUT  /system/api/settings
PUT  /system/api/settings/[key]
```

Requires `system:admin` scope.
