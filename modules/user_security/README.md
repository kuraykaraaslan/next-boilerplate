# User Security Module

Manages per-user MFA/OTP state, TOTP secrets, backup codes, login-attempt lockout, password rotation history, and WebAuthn passkeys. The record is **system-scoped** — the entity has no `tenantId`, the service reads/writes the global `getDataSource()`, and the seed uses `systemRepo` — but lockout and password-history thresholds vary per tenant because the auth module resolves those policies per tenant and passes them in.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `UserSecurity` | `user_securities` | One row per user (`userId` is `unique`): OTP/MFA state, TOTP secret, backup codes, last-login metadata, failed-attempt counter + `lockedUntil`, password rotation history, and WebAuthn passkeys |

Lives in the **system DB** (no `tenantId` column).

Columns of note: `otpMethods` (enum array `EMAIL`/`SMS`/`TOTP_APP`), `otpSecret`, `otpBackupCodes` (jsonb), `lastLoginAt`/`lastLoginIp`/`lastLoginDevice`, `failedLoginAttempts`, `lockedUntil`, `passkeyEnabled`, `passkeys` (jsonb array of `StoredPasskey`), `passwordHistory` (jsonb, bcrypt hashes most-recent-first — **KD-7**), `passwordChangedAt`, `mustChangePassword` (**KD-4**).

---

## Files

| File | Purpose |
|---|---|
| `user_security.service.ts` | Core: fetch/cache, default-record creation, upsert/update, login-attempt + lockout logic, password history (KD-7), `mustChangePassword` (KD-4) |
| `user_security.passkey.service.ts` | WebAuthn registration & authentication via `@simplewebauthn/server` |
| `user_security.passkey.constants.ts` | Redis challenge-key builders, `PASSKEY_CHALLENGE_TTL_SECONDS` (300), `PASSKEY_MAX_PER_USER` (10) |
| `user_security.passkey.messages.ts` | `PasskeyMessages` error/success string enum |
| `user_security.types.ts` | `UserSecurity`, `SafeUserSecurity`, `StoredPasskey` Zod schemas + `SafeUserSecurityDefault` |
| `user_security.enums.ts` | `OTPMethodEnum` (`EMAIL`/`SMS`/`TOTP_APP`), `OTPActionEnum` (`enable`/`disable`/`authenticate`) |
| `user_security.setting.keys.ts` | `SecuritySettingKeySchema` — platform/system security keys (see *Settings*) |
| `user_security.seed.ts` | System-scoped demo seed (3 profiles: totp+passkey / sms / locked-out) |
| `entities/user_security.entity.ts` | TypeORM entity |

---

## Services & Responsibilities

### `UserSecurityService`

| Method | Responsibility |
|---|---|
| `getByUserId(userId)` | Full `UserSecurity` (includes `otpSecret`, backup codes, `passwordHistory`). Auto-creates a default record if none exists. Redis-cached. |
| `getSafeByUserId(userId)` | `SafeUserSecurity` with secrets stripped (`otpSecret`, `otpBackupCodes`, `passwordHistory` omitted). Redis-cached. |
| `createDefaultUserSecurity(userId)` | Insert an empty security row (throws if one already exists). |
| `updateUserSecurity(userId, data)` | Patch an existing record (throws if missing). |
| `upsertUserSecurity(userId, data)` | Insert-or-update. |
| `recordLoginAttempt(userId, success, ip?, device?, options?)` | On success: stamps `lastLoginAt/Ip/Device`, resets the counter, clears the lock. On failure: increments `failedLoginAttempts` and, once `>= maxAttempts`, sets `lockedUntil`. `options.maxAttempts` / `options.lockDurationMinutes` default to **5** / **15** when omitted. |
| `isLocked(userId)` | Returns whether `lockedUntil` is still in the future. **Always reads the DB** (never cached). |
| `pushPasswordHistory(userId, passwordHash, historyCount)` | KD-7: prepend a bcrypt hash, trim to `historyCount`, stamp `passwordChangedAt`, clear `mustChangePassword`. Callers must pass an already-hashed value. |
| `getPasswordHistory(userId)` | Returns the stored bcrypt-hash list. |
| `getPasswordChangedAt(userId)` | Returns `passwordChangedAt` or `null`. |
| `setMustChangePassword(userId, value)` | KD-4: toggle the force-change-on-next-login flag. |

### `UserSecurityPasskeyService`

| Method | Responsibility |
|---|---|
| `generateRegistrationOptions(user)` | Build WebAuthn registration options (excludes already-registered credentials), store the challenge in Redis. Enforces `PASSKEY_MAX_PER_USER`. |
| `verifyRegistration({ user, response, label? })` | Verify the attestation, append a `StoredPasskey`, set `passkeyEnabled`, clear the challenge. |
| `generateAuthenticationOptions(email?)` | Build authentication options. With an email it scopes to that user's credentials; without one it issues a resident-key (discoverable) challenge. |
| `verifyAuthentication({ response, email? })` | Resolve the user by credential id (jsonb lookup) or email, verify the assertion, bump the stored `counter` + `lastUsedAt`, return the `SafeUser`. |
| `deletePasskey(user, credentialId)` | Remove a passkey; clears `passkeyEnabled` when none remain. |
| `listPasskeys(userId)` | Return passkey metadata (`credentialId`, `label`, `createdAt`, `lastUsedAt`, `transports`) — no key material. |

WebAuthn relying-party identity comes from env: `RP_ID` = `WEBAUTHN_RP_ID` (falls back to the parsed `NEXT_PUBLIC_APPLICATION_HOST` hostname), `ORIGIN` = `WEBAUTHN_ORIGIN` (falls back to that host's origin), `RP_NAME` = `NEXT_PUBLIC_APPLICATION_NAME`.

---

## Lockout

After **5 consecutive failed login attempts** the account is locked for **15 minutes** — but only when no policy is passed. The auth module resolves the real thresholds per tenant (`lockoutMaxAttempts` / `lockoutDurationMinutes` via `AuthPolicyService.getLockoutPolicy(tenantId)`) and passes them into `recordLoginAttempt`; the `5` / `15` literals are only the in-service fallback.

```typescript
import UserSecurityService from '@/modules/user_security/user_security.service';

// Record an attempt (auto-locks when the failure count reaches maxAttempts)
await UserSecurityService.recordLoginAttempt(userId, false, ip, device, {
  maxAttempts: 5,
  lockDurationMinutes: 15,
});

// Check if locked (always hits the DB)
const locked = await UserSecurityService.isLocked(userId);

// A successful attempt clears the counter and the lock
await UserSecurityService.recordLoginAttempt(userId, true, ip, device);
```

---

## OTP / MFA

OTP state lives on the record (`otpMethods`, `otpSecret`, `otpBackupCodes`, `passkeyEnabled`). This module stores the state; the **auth** module (`auth.totp.service.ts`, OTP routes) drives the enable/disable/verify flows and writes through `updateUserSecurity` / `upsertUserSecurity`.

---

## Passkeys (WebAuthn)

```typescript
import PasskeyService from '@/modules/user_security/user_security.passkey.service';

// Registration
const options = await PasskeyService.generateRegistrationOptions(user);          // SafeUser
await PasskeyService.verifyRegistration({ user, response, label });

// Authentication
const authOptions = await PasskeyService.generateAuthenticationOptions(email);   // email optional
const safeUser = await PasskeyService.verifyAuthentication({ response, email });
```

Challenges are held in Redis for `PASSKEY_CHALLENGE_TTL_SECONDS` (300s); a user may register up to `PASSKEY_MAX_PER_USER` (10) passkeys.

---

## API Routes

This module exposes **no HTTP routes of its own** — the passkey/OTP services are consumed internally by the auth module. The only route that reads a `UserSecurity` directly is the tenant-scoped security overview:

```
GET /tenant/[tenantId]/api/auth/me/security   # SafeUserSecurity for the current member
```

TOTP and OTP flows live under `/tenant/[tenantId]/api/auth/totp/*` and `/tenant/[tenantId]/api/auth/otp/*` in the **auth** module.

---

## Caching

Security records are cached in Redis (TTL = `SESSION_CACHE_TTL`, default 5 min):

| Key | Returns | Used by |
|---|---|---|
| `user_security:user:{userId}` | `UserSecurity` (includes `otpSecret`, backup codes, `passwordHistory`) | `getByUserId` — TOTP/passkey flows |
| `user_security:safe:{userId}` | `SafeUserSecurity` (secrets stripped) | `getSafeByUserId` — UI/admin |

`createDefaultUserSecurity`, `updateUserSecurity`, `upsertUserSecurity`, `recordLoginAttempt`, `pushPasswordHistory`, and `setMustChangePassword` clear both keys. `recordLoginAttempt` invalidates even on success because it updates `lastLoginAt`, `failedLoginAttempts`, and (on lockout) `lockedUntil`.

**Not cached:** `isLocked(userId)` always reads the DB. Stale lockout state must never authorize a login, so this query stays uncached — its cost is acceptable for the correctness guarantee.

OTP secrets are stored in Redis the same way passwords already are (hashed at rest in the source DB, briefly held in Redis with a short TTL). If Redis is compromised, OTP secrets are exposed — the existing trust boundary applies.

TTL is jittered ±10% and reads are wrapped in in-process single-flight.

---

## Settings

`user_security.setting.keys.ts` declares `SecuritySettingKeySchema` — **platform/system-level** security keys configured once at the root tenant (rate-limit, CORS/security headers, reCAPTCHA, MaxMind GeoIP, blocked IPs, `cronSecret`). These keys are **not read inside this module**; they are owned and consumed elsewhere (e.g. `recaptchaServerKey` is read at `ROOT_TENANT_ID` by `auth.captcha.service.ts`). The per-tenant lockout/password-history thresholds this module reacts to are declared as **auth-module** keys, not here.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages per-user MFA/OTP state, TOTP secrets, backup codes, login-attempt lockout, password rotation history, and WebAuthn passkeys; it is system-scoped (entity has no tenantId, service uses the global getDataSource and seeds via systemRepo), but its lockout/password-history thresholds vary per tenant because callers in the auth module resolve those policies per tenant and pass them in.

### Per-tenant behavior

- `user_security.service.ts:recordLoginAttempt` — Lockout severity is driven by caller-supplied maxAttempts/lockDurationMinutes options. auth.service.ts resolves these per tenant via AuthPolicyService.getLockoutPolicy(tenantId) (keys lockoutMaxAttempts / lockoutDurationMinutes resolved system>tenant in auth.policy.service.ts) and passes them in, so after how many failures and for how long an account locks differs per tenant. The service's own ?? 5 / ?? 15 fallbacks only apply when no options are passed.
- `user_security.service.ts:pushPasswordHistory` — How many prior password hashes are retained is controlled by the caller-supplied historyCount. auth.password.service.ts passes policy.historyCount from AuthPolicyService.getPasswordPolicy(tenantId) (key passwordHistoryCount, resolved per tenant), so password-reuse history depth varies per tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Hardcoded lockout fallback thresholds maxAttempts=5 and lockDurationMinutes=15 when options are omitted. | `user_security.service.ts:recordLoginAttempt` | These are the default lockout severity whenever a caller does not pass the resolved policy. The tenant-aware values already exist as auth-module keys (lockoutMaxAttempts/lockoutDurationMinutes); the in-service fallbacks are global and could silently diverge from a tenant's configured policy. Lower risk than a true gap since auth.service does pass tenant values, but the literals remain a hardcoded global default in this module. | `lockoutMaxAttempts` |
| PASSKEY_MAX_PER_USER = 10 caps the number of WebAuthn passkeys a user may register. | `user_security.passkey.constants.ts (PASSKEY_MAX_PER_USER), enforced in user_security.passkey.service.ts:generateRegistrationOptions` | A hard global cap on passkeys per user; a tenant with stricter or looser device policies cannot adjust it. Plausibly a per-tenant security knob, currently a module-level constant. | `passkeyMaxPerUser` |
| WebAuthn relying-party identity (RP_ID, ORIGIN, RP_NAME) derived from global env vars. | `user_security.passkey.service.ts (RP_ID/ORIGIN/RP_NAME from env.WEBAUTHN_RP_ID/WEBAUTHN_ORIGIN/NEXT_PUBLIC_APPLICATION_*)` | Passkey challenges are bound to a single global RP id/origin/name. In a multi-tenant setup with per-tenant custom domains (tenant_domain module exists), passkeys ideally bind to the tenant's own domain/brand. Listed as a candidate, but realistically this is platform-global infra unless per-tenant custom-domain WebAuthn is a product goal. | — |
| PASSKEY_CHALLENGE_TTL_SECONDS = 300 (passkey challenge validity window). | `user_security.passkey.constants.ts` | Global challenge lifetime; tenants with stricter security postures might want shorter windows. Minor, likely fine as a global default. | — |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `rateLimitPerMinute` — Global API rate limit per minute (declared in user_security.setting.keys.ts under the 'System-level security configuration' section; not read in this module).
- `rateLimitPerHour` — Global API rate limit per hour.
- `rateLimitEnabled` — Master toggle for global rate limiting.
- `corsAllowedOrigins` — Platform-wide CORS allowed origins.
- `hstsEnabled` — Platform HSTS security header toggle.
- `xContentTypeOptions` — Platform X-Content-Type-Options header value.
- `xFrameOptions` — Platform X-Frame-Options header value.
- `blockedIps` — Platform-wide blocked IP list.
- `recaptchaEnabled` — Platform reCAPTCHA on/off.
- `recaptchaClientKey` — Platform reCAPTCHA public site key.
- `recaptchaServerKey` — Platform reCAPTCHA secret key; read only at ROOT_TENANT_ID by auth.captcha.service.ts (SettingService.getValue(ROOT_TENANT_ID, 'recaptchaServerKey')).
- `maxmindAccountId` — MaxMind GeoIP account id (provider credential).
- `maxmindApiKey` — MaxMind GeoIP API key (provider secret).
- `cronSecret` — Shared secret authenticating internal cron/job endpoints.

---

## Dependencies

Requires: `db`, `user`, `env`. Also uses `redis` (caching + passkey challenges) and `@simplewebauthn/server`. Consumed by the **auth** module (login, TOTP/OTP, password rotation, lockout) and the tenant-scoped `/api/auth/me/security` route.
