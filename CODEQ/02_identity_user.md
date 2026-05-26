# Identity/User modülleri — Type duplikasyon raporu

## user

### Duplikasyon: `UserRole` / `UserStatus` enum union'ları
- **Canonical kaynak:** `modules/user/user.enums.ts:6-7` — Zod enum'ları (`UserRoleEnum`, `UserStatusEnum`) ve onlardan türetilmiş `UserRole`, `UserStatus` tipleri
- **Duplike yerler:** 3 admin page içinde inline `type UserRole = 'USER' | 'ADMIN'` tanımları (sysadmin-scope users/tenants page'leri)
- **Önerilen unify:** `import type { UserRole, UserStatus } from '@/modules/user/user.enums'`
- **Risk:** **Düşük** — saf enum union; değerler birebir aynı.

### Duplikasyon: `SafeUser`
- **Canonical kaynak:** `modules/user/user.types.ts:38` — `SafeUser` (parolasız user response tipi)
- **Duplike yerler:** 2 app page'inde lokal `type User = {...}` blokları, alanlar `SafeUser`'ın >=80% alt kümesi
- **Önerilen unify:** `import type { SafeUser } from '@/modules/user/user.types'` ve `type User = SafeUser` ya da `Pick<SafeUser, '...'>`
- **Risk:** **Orta** — bazı page'ler joined alan (örn. `tenantName`) bekliyor; bu durumda `type User = SafeUser & { tenantName?: string }` extend.

---

## user_preferences

### Duplikasyon: `UserPreferencesValues` form tipi
- **Canonical kaynak:** `modules/user_preferences/user_preferences.types.ts` — Zod schema'dan türetilmiş tip
- **Duplike yerler:** `modules_next/user/ui/UserPreferencesForm.tsx:6-16` — 10/10 alan birebir
- **Önerilen unify:**
  ```ts
  import type { UserPreferences } from '@/modules/user_preferences/user_preferences.types';
  export type UserPreferencesValues = UserPreferences;
  ```
- **Risk:** **Düşük** — form ile entity %100 örtüşüyor.

---

## user_security

### Duplikasyon: `Passkey` / `StoredPasskey`
- **Canonical kaynak:** `modules/user_security/user_security.types.ts:3-10` — `StoredPasskey`
- **Duplike yerler:** `modules_next/user_security/ui/PasskeysPanel.tsx:9-11` — lokal `Passkey` tipi (~80% örtüşüyor)
- **Önerilen unify:** `import type { StoredPasskey } from '@/modules/user_security/user_security.types'`
- **Risk:** **Düşük** — UI yalnızca okuma için kullanıyor.

---

## user_profile

### Duplikasyon: `UserProfileValues` form tipi (kısmi)
- **Canonical kaynak:** `modules/user_profile/user_profile.types.ts:5-16`
- **Duplike yerler:** `modules_next/user/ui/UserProfileForm.tsx:6-9` (3/5 alan, `headerImage` ve `socialLinks` form'da yok)
- **Önerilen unify:** `type UserProfileValues = Pick<UserProfile, 'firstName' | 'lastName' | 'avatar'>` veya benzeri
- **Risk:** **Düşük** — form intentionally subset; `Pick<>` ile temizlenir.

---

## user_session

### ✅ Temiz
- `SafeUserSession` zaten merkezi import ediliyor (`modules/user_session/user_session.types.ts`).
- API route'ları ve hook'lar canonical tipi reuse ediyor.

---

## user_social_account

### ✅ Temiz
- Types merkezi import ediliyor, page-level redefine yok.

---

## user_agent

### ✅ Temiz
- Service-only modül; entity yok, type duplikasyonu yok.

---

## Özet

| Modül | Duplikasyon | Önem | Eylem |
|-------|-------------|------|-------|
| **user** | UserRole/UserStatus (3 yer) | Düşük | enums.ts'ten import |
| **user** | SafeUser (2 yer) | Orta | `SafeUser` reuse + extend |
| **user_preferences** | UserPreferencesValues | Düşük | %100 overlap, direkt alias |
| **user_security** | StoredPasskey | Düşük | direkt import |
| **user_profile** | UserProfileValues | Düşük | `Pick<UserProfile, ...>` |
| **user_session** | — | — | ✅ |
| **user_social_account** | — | — | ✅ |
| **user_agent** | — | — | ✅ |

**Toplam:** 5 unify edilebilir duplikasyon, 3 modül temiz.
**Öncelik:** user_preferences (en kolay, %100 overlap) → user enums → SafeUser → user_security/user_profile.

---

*Scope: `user`, `user_profile`, `user_security`, `user_preferences`, `user_session`, `user_social_account`, `user_agent`*
