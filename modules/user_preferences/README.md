# user_preferences module

User UI/UX preferences: theme, language, timezone, date/time formats, notification channels, and week start day.

---

## Files

| File | Purpose |
|---|---|
| `user_preferences.service.ts` | Core: get, create, update |
| `user_preferences.types.ts` | `UserPreferences` type |
| `user_preferences.dto.ts` | Zod DTO |
| `user_preferences.enums.ts` | All preference enums |
| `entities/user_preferences.entity.ts` | TypeORM entity |

---

## Preference Options

| Preference | Options |
|---|---|
| `theme` | `LIGHT`, `DARK`, `SYSTEM` |
| `language` | `EN`, `ES`, `TR`, `FR`, `DE` |
| `dateFormat` | `DD_MM_YYYY`, `MM_DD_YYYY`, `YYYY_MM_DD` |
| `timeFormat` | `H24`, `H12` |
| `firstDayOfWeek` | `MON`–`SUN` |
| `emailNotifications` | `boolean` |
| `smsNotifications` | `boolean` |
| `pushNotifications` | `boolean` |
| `newsletter` | `boolean` |

---

## Usage

```typescript
import UserPreferencesService from '@/modules/user_preferences/user_preferences.service';

// Get (creates with defaults if missing)
const prefs = await UserPreferencesService.getOrCreate(userId);

// Update
await UserPreferencesService.update(userId, {
  theme: 'DARK',
  language: 'TR',
  timeFormat: 'H24',
});
```

---

## API Routes

```
GET /api/user/preferences
PUT /api/user/preferences
```
