# Authentication

- **id:** `auth`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/auth/`
- **tags:** identity, auth, core
- **icon:** `fas fa-shield-halved`
- **hasNextLayer:** true

Credential auth: login, register, password reset, email verify, OTP, TOTP. Coordinates user, user_session, user_security, notification_mail.

## Dependencies

- **requires:** `user`, `user_session`, `user_security`, `notification_mail`, `notification_sms`, `setting`, `tenant`, `tenant_invitation`, `audit_log`, `webhook`, `observability`, `db`, `env`, `redis`, `common`

## Services

- `auth.captcha.service.ts`
- `auth.credential.lifecycle.service.ts`
- `auth.credential.login.service.ts`
- `auth.credential.register.service.ts`
- `auth.credential.service.ts`
- `auth.otp.service.ts`
- `auth.password.service.ts`
- `auth.policy.loader.service.ts`
- `auth.policy.service.ts`
- `auth.policy.validator.service.ts`
- `auth.service.ts`
- `auth.totp.service.ts`
- `auth.verification.service.ts`

## DTOs

- `auth.dto.ts`

## Entities

- `user_consent.entity.ts`

## Message keys

- `auth.messages.ts`

## Setting keys

- `auth.setting.keys.ts`

## Jobs

- `auth.dormant.job.ts`

## Owned API routes

- `system` GET `/api/auth/acs`
- `system` GET/POST `/api/auth/acs/[provider]/callback`
- `system` GET `/api/auth/acs/[provider]/initiate`
- `system` GET `/api/auth/acs/[provider]/metadata`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/notifications/stream`

## TypeORM entities

- `UserConsent` (system) — `modules/auth/server/entities/user_consent.entity.ts`

## Next layer (modules_next/) surface

- `auth/ui/auth-settings.page` _(ui, client)_
- `auth/ui/callback.page` _(ui, client)_
- `auth/ui/complete-profile.page` _(ui, client)_
- `auth/ui/create-tenant.page` _(ui, client)_
- `auth/ui/forgot-password-form.component` _(ui, client)_
- `auth/ui/forgot-password.page` _(ui, client)_
- `auth/ui/login-form.component` _(ui, client)_
- `auth/ui/login.page` _(ui, client)_
- `auth/ui/logout.page` _(ui, client)_
- `auth/ui/o-auth-buttons.component` _(ui, client)_
- `auth/ui/register-form.component` _(ui, client)_
- `auth/ui/register.page` _(ui, client)_
- `auth/ui/select-tenant.page` _(ui, client)_
- `auth/ui/session-expired-banner.component` _(ui, client)_

## README

# Auth Module

Core credential authentication: login, registration, email verification, password management (change/forgot/reset), OTP (email/SMS), TOTP/2FA, CAPTCHA brute-force gating, and dormant-account sweeps. Operates against the **global `User` table** and is tenant-aware via `AuthPolicyService`, which resolves password / lockout / session / dormant / admin / access policies per request tenant (system ROOT value wins, tenant value applied as fallback). Uses bcrypt for hashing and Redis for token TTLs and rate limiting.

---

## Entities

The auth module owns **one** table — `user_consents` (GTH-7) — and reads/mutates entities owned by sibling modules, all in the **system (global) DB**:

| Entity | Table | Owner module | Used for |
|---|---|---|---|
| `UserConsent` | `user_consents` | **auth** | GTH-7: append-only ToS/Privacy consent records (document type + version + timestamp) captured at registration. Migration `006_auth_consent.sql`; registered in `@/modules/db`. |
| `User` | `users` | `user` | Identity, password hash, `userStatus`, `emailVerifiedAt`, `consentVersion`/`consentAcceptedAt` |
| `UserSecurity` | `user_securities` | `user_security` | Lockout state, login attempts, password history, OTP/TOTP secrets, backup codes, `lastLoginAt` |
| `UserSession` | `user_sessions` | `user_session` | Sessions issued after authentication |

Settings are read via the `setting` module; transactional mail/SMS via `notification_mail` / `notification_sms`.

---

## Services / Responsibilities

| Service | File | Responsibility |
|---|---|---|
| `AuthService` | `auth.service.ts` | Orchestrator: `login`, `register`, `changePassword`, `sendEmailVerification` / `verifyEmail`, `disableDormantAccounts`, `checkIfUserHasRole`, password hashing. Wires in policy, captcha, lockout, audit logging. |
| `AuthPolicyService` | `auth.policy.service.ts` | Resolves per-tenant policies (`getPasswordPolicy`, `getLockoutPolicy`, `getSessionPolicy`, `getDormantPolicy`, `getAdminPolicy`, `getAccessPolicy`) with sysadmin > tenant precedence and code defaults. Also `validatePassword` (complexity, identity-substring, sequential/repeated runs) and `isAdminIpAllowed` (exact IP + IPv4 CIDR). |
| `PasswordService` | `auth.password.service.ts` | `forgotPassword` (rate-limited reset token), `resetPassword` (policy + history enforced), `validateResetToken`, `invalidateResetToken`. |
| `OTPService` | `auth.otp.service.ts` | One-time codes over EMAIL/SMS: `requestOTP`, `verifyOTP`, `invalidateSessionOTPs`. Redis-backed TTL, rate limit, and attempt caps. |
| `TOTPService` | `auth.totp.service.ts` | Authenticator-app 2FA via `otplib`: `requestSetup`, `verifyAndEnable`, `verifyAuthenticate`, `verifyAuthenticateOrBackup`, `disable`, `generateBackupCodes`, `consumeBackupCode`. |
| `CaptchaService` | `auth.captcha.service.ts` | KD-19 brute-force gate: per-identity failure counter (30 min rolling window) and reCAPTCHA token verification (fail-closed when `recaptchaServerKey` unset). |

Supporting files: `auth.dto.ts` (Zod DTOs for every flow), `auth.messages.ts` (error/success message keys), `auth.setting.keys.ts` (`AUTH_KEYS` / `AuthSettingKeySchema`), `auth.dormant.job.ts` (BullMQ scheduled sweep), `dictionaries/{en,es,tr}.json` (localization).

---

## Auth Flows

### Login
```typescript
import AuthService from '@/modules/auth/auth.service';

const { user, mustChangePassword } = await AuthService.login({
  email, password, captchaToken, tenantId, ipAddress, userAgent,
});
// Throws AuthMessages.CAPTCHA_REQUIRED/INVALID, ACCOUNT_LOCKED/DISABLED,
// INVALID_EMAIL_OR_PASSWORD, or MFA_ENROLLMENT_REQUIRED depending on policy.
```
Login short-circuits in policy order: CAPTCHA gate (before bcrypt), unknown identity, non-`ACTIVE` status, lockout, password compare, password-age forced-change flag, then `externalRequireMfa` enrolment check. All failure/success paths are audit-logged.

### Register
```typescript
const { user } = await AuthService.register({ email, password, phone, tenantId });
// Enforces password policy, seeds password history, provisions a personal
// tenant, and auto-accepts any pending invitations for the email.
```

### Change password
```typescript
await AuthService.changePassword({ userId, newPassword, tenantId });
// Enforces complexity + rejects reuse of current password or history hashes.
// Caller must verify the current password first.
```

### OTP (email/SMS one-time code)
```typescript
import OTPService from '@/modules/auth/auth.otp.service';

await OTPService.requestOTP({ user, userSession, method: 'EMAIL', action: 'authenticate' });
await OTPService.verifyOTP({ user, userSession, method: 'EMAIL', action: 'authenticate', otpToken });
```

### TOTP (authenticator app)
```typescript
import TOTPService from '@/modules/auth/auth.totp.service';

const { secret, otpauthUrl } = await TOTPService.requestSetup({ user, userSession });
const { enabled, backupCodes } = await TOTPService.verifyAndEnable({ user, userSession, otpToken });
await TOTPService.verifyAuthenticateOrBackup({ user, otpToken }); // TOTP, falls back to a backup code
```

### Forgot / reset password
```typescript
import PasswordService from '@/modules/auth/auth.password.service';

const { resetToken } = await PasswordService.forgotPassword({ email });
await PasswordService.resetPassword({ email, resetToken, newPassword, tenantId });
```

---

## API Routes

All auth routes are **tenant-scoped** under `/tenant/[tenantId]/api/auth/...` (the route layer derives the tenant context).

| Method | Path | Purpose |
|---|---|---|
| POST | `/tenant/[tenantId]/api/auth/login` | Credential login |
| POST | `/tenant/[tenantId]/api/auth/register` | Self-registration |
| POST | `/tenant/[tenantId]/api/auth/logout` | End session |
| POST | `/tenant/[tenantId]/api/auth/refresh` | Refresh tokens |
| POST | `/tenant/[tenantId]/api/auth/change-password` | Change password (authenticated) |
| POST | `/tenant/[tenantId]/api/auth/forgot-password` | Request reset token |
| POST | `/tenant/[tenantId]/api/auth/reset-password` | Reset password with token |
| POST | `/tenant/[tenantId]/api/auth/verify-email/send` · `/verify` | Send / consume email-verification token |
| POST | `/tenant/[tenantId]/api/auth/otp/send` · `/verify` | Request / verify OTP code |
| POST | `/tenant/[tenantId]/api/auth/totp/setup` · `/enable` · `/disable` | TOTP lifecycle |
| GET | `/tenant/[tenantId]/api/auth/me/*` | Current-user profile, sessions, security, social accounts, notifications, preferences |
| — | `/tenant/[tenantId]/api/auth/{sso,saml,callback,csrf,session,impersonate,e-signature}/*` | Provider/SSO, SAML, OAuth callback, CSRF, session, impersonation, e-signature surfaces |

---

## Dormant-account sweep

`AuthService.disableDormantAccounts(tenantId?)` marks `ACTIVE` accounts `INACTIVE` when last activity (`user_securities.lastLoginAt`, falling back to `users.createdAt`) predates the dormant cutoff. With `dormantAccountAutoDisable=false` it becomes a dry-run (scans, disables nothing). Returns `{ scanned, disabled, erased }`. When `dormantDeleteAfterDays > 0` (GTH-8), accounts dormant beyond that window are additionally anonymised via `eraseUserData` (right-to-erasure).

`auth.dormant.job.ts` exposes the BullMQ queue/worker (`auth-dormant-sweep`). Two trigger paths:
- **Self-hosted:** call `scheduleDormantSweepJob()` once at startup (default cron `0 3 * * *`).
- **Serverless:** `POST /api/cron/dormant-sweep` on the root tenant with the `CRON_SECRET` bearer token.

---

## Settings

Setting keys are declared in `auth.setting.keys.ts` (`AUTH_KEYS` / `AuthSettingKeySchema`). Policy-bearing keys are resolved at request time by `AuthPolicyService` with **system ROOT value > tenant value > code default** precedence. See the Tenant Variability section below for the full per-tenant list and defaults, and the platform/root-only credential keys.

---

## Security

- **Password hashing:** bcrypt, cost 10. Password complexity (length, char classes), identity-substring rejection, and sequential/repeated-run detection live in `AuthPolicyService.validatePassword`; reuse is blocked against the current hash and the rotation history (`passwordHistoryCount`).
- **Lockout (KD-9):** failed attempts are recorded via `UserSecurityService`; the lock is checked **before** bcrypt to avoid a timing oracle. Thresholds from `lockoutMaxAttempts` / `lockoutDurationMinutes`.
- **CAPTCHA (KD-19):** consecutive failures per identity (including unknown identities, to stop username probing) trigger a required reCAPTCHA after `captchaTriggerAttempts`; verification is **fail-closed** when `recaptchaServerKey` is unset.
- **Tokens:** email-verification, OTP, and reset tokens are random (`crypto.randomInt` / `randomBytes`), stored **hashed** (SHA-256) in Redis with TTLs and per-identity rate limits; only the hash is persisted.
- **Generic errors:** dormant/suspended/locked accounts return generic messages so account liveness isn't leaked; failed logins for unknown identities are still audited (actorId null) and counted toward the CAPTCHA threshold.
- **Admin hardening (KD-13):** `AuthPolicyService.isAdminIpAllowed` gates admin surfaces against the tenant's `adminPanelIpAllowlist` (exact IP + IPv4 CIDR); `adminRequireMfa` forces MFA for admin access.
- **Transactional auth mail/SMS** now route through the **request tenant's** own provider config + branding (`tenantId ?? ROOT_TENANT_ID`), so white-label tenants surface their own `From:` and DKIM/DMARC alignment (GTH-5).

---

## GOODTOHAVE features (implemented)

### Security
- **GTH-1 / GTH-12 — `allowRegistration` & `emailVerificationRequired` enforced.** `register` rejects with `REGISTRATION_DISABLED` when self-registration is off (invite-only). `login` blocks with `EMAIL_VERIFICATION_REQUIRED` when a verified email is required and the user is unverified. Resolved in `AuthPolicyService.getAccessPolicy`.
- **GTH-2 — per-provider SSO allow-list.** `getAccessPolicy` exposes `ssoAllowedProviders`; `AuthPolicyService.isSsoProviderAllowed` / `filterAllowedProviders` narrow the offered provider list (empty list = all allowed; `disableSocialLogin` still denies everything).
- **GTH-3 — per-tenant OTP / reset / email-verify TTLs & limits.** New policies `getOtpPolicy`, `getResetPolicy`, `getEmailVerifyPolicy` read per-tenant settings, falling back to the historical env vars then code defaults. The OTP/password/verification services consume them.
- **GTH-4 — per-tenant TOTP issuer.** `TOTPService.getIssuer(tenantId)` reads the `totpIssuer` setting; falls back to `env.TOTP_ISSUER`.
- **GTH-5 — per-tenant auth email delivery.** OTP, verification, forgot/reset mail is routed through the request tenant's mail provider/branding. Localized subject via the auth dictionaries (GTH-10).
- **GTH-6 — per-tenant bcrypt cost.** `getCredentialPolicy(tenantId)` reads `bcryptCost` (validated 4–15, default 10). `hashPassword(password, tenantId)` and `resetPassword` honour it.

### Compliance
- **GTH-7 — consent-at-registration capture.** `register` writes a `UserConsent` row (document type + version) when `consentVersion` is supplied. Entity + migration `006_auth_consent.sql`.
- **GTH-8 — right-to-erasure in the dormant sweep.** `dormantDeleteAfterDays` (0 = disable-only). When set, `disableDormantAccounts` anonymises PII via `eraseUserData` for accounts dormant beyond the window. Returns `{ scanned, disabled, erased }`.
- **GTH-9 — `passwordMinAgeDays` guard.** `changePassword` rejects with `PASSWORD_CHANGED_TOO_RECENTLY` when the current password is younger than `minAgeDays`.

### i18n
- **GTH-10 — per-locale auth email subjects.** `auth.i18n.ts:authEmailSubject` resolves localized subjects from `dictionaries/{en,tr,es}.json` (`email_subjects`), threaded through the mail templates.
- **GTH-11 — locale-aware error messages.** `auth.i18n.ts:resolveLocale` (Accept-Language → supported locale) + `translateAuthMessage` resolve `AuthMessages` keys against the `errors` namespace of the dictionaries. The route layer passes the header in (modules/ stays framework-free).

### Multi-tenancy
- **GTH-12 — dead setting keys revived.** `allowRegistration`, `emailVerificationRequired`, `ssoAllowedProviders` are now enforced; lockout uses `lockoutMaxAttempts` (the canonical key).
- **GTH-13 — tenant MFA method allow-list.** `mfaAllowedMethods` (TOTP_APP/EMAIL/SMS; empty = all). Enforced in `OTPService.requestOTP` and `TOTPService.requestSetup`; helper `AuthPolicyService.isMfaMethodAllowed`.

### DX
- **GTH-15 — dormant-sweep tests.** Service-level (dry-run, disable, erase) + the `CRON_SECRET`-gated `POST /api/cron/dormant-sweep` path (`tests/auth.dormant.test.ts`, `tests/auth.dormant.cron.test.ts`).
- **GTH-16 — OpenAPI / JSON-Schema export.** `auth.openapi.ts` (Zod v4 `z.toJSONSchema`, no extra dep) exposes every auth DTO at `GET /tenant/[tenantId]/api/auth/openapi`.

### Monitoring
- **GTH-17 — per-tenant login-failure metrics.** Each failure path emits `ObservabilityService.recordTenantUsage({ tenantId, metric: 'auth_login_failure:<reason>' })` (Prometheus counter labelled by tenant).
- **GTH-18 — account-lockout webhook.** When a bad attempt crosses the lockout threshold, `WebhookService.dispatchEvent(tenantId, 'auth.account_locked', { … })` fires (best-effort, never blocks login).

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The auth module handles login, registration, password/OTP/TOTP, captcha, and dormant-account sweeps against the global User table, and is tenant-aware via AuthPolicyService, which resolves password/lockout/session/dormant/admin/access policies per request tenant (system ROOT value wins, tenant value applied as fallback).

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `passwordMinLength` | number | `8` | tenant | Minimum password length enforced at register/change/reset. | `auth.policy.service.ts` |
| `passwordRequireUppercase` | boolean | `true` | tenant | Require an uppercase letter in passwords. | `auth.policy.service.ts` |
| `passwordRequireLowercase` | boolean | `true` | tenant | Require a lowercase letter in passwords. | `auth.policy.service.ts` |
| `passwordRequireDigit` | boolean | `true` | tenant | Require a digit in passwords. | `auth.policy.service.ts` |
| `passwordRequireSpecial` | boolean | `true` | tenant | Require a special character in passwords. | `auth.policy.service.ts` |
| `passwordHistoryCount` | number | `3` | tenant | How many prior password hashes are kept and blocked from reuse. | `auth.policy.service.ts` |
| `passwordMaxAgeDays` | number | `42` | tenant | Password expiry age; on login, older passwords force a change (0 disables). | `auth.policy.service.ts` |
| `lockoutMaxAttempts` | number | `5` | tenant | Failed-login attempts before the account is locked. | `auth.policy.service.ts` |
| `lockoutDurationMinutes` | number | `15` | tenant | How long an account stays locked after exceeding max attempts. | `auth.policy.service.ts` |
| `sessionAbsoluteMaxHours` | number | `8` | tenant | Absolute max session lifetime before forced re-auth. | `auth.policy.service.ts` |
| `sessionIdleTimeoutMinutes` | number | `30` | tenant | Idle timeout before a session is invalidated. | `auth.policy.service.ts` |
| `dormantAccountDays` | number | `90` | tenant | Inactivity threshold (days) after which accounts are swept as dormant (0 disables). | `auth.policy.service.ts` |
| `dormantAccountAutoDisable` | boolean | `true` | tenant | Whether the dormant sweep actually disables accounts (false = dry-run/report). | `auth.policy.service.ts` |
| `adminPanelIpAllowlist` | text | — | tenant | Comma-separated IP/CIDR allowlist for admin surfaces (empty = open). | `auth.policy.service.ts` |
| `adminRequireMfa` | boolean | `true` | tenant | Require MFA for admin-panel access. | `auth.policy.service.ts` |
| `externalRequireMfa` | boolean | `false` | tenant | Force MFA enrollment/verification for logins originating outside the LAN; login blocked until enrolled. | `auth.policy.service.ts` |
| `disableSocialLogin` | boolean | `false` | tenant | Completely disable social/OAuth login for the tenant. | `auth.policy.service.ts` |
| `captchaTriggerAttempts` | number | `3` | tenant | Consecutive failed-login attempts (per identity) that trigger a CAPTCHA requirement on next attempt (0 disables). | `auth.policy.service.ts` |
| `singleSessionOnly` | boolean | `false` | tenant | When true, a new session invalidates all other active sessions for the same user. | `auth.policy.service.ts` |
| `allowRegistration` | boolean | `true` | tenant | GTH-1: when false, self-registration is rejected (invite-only). | `auth.credential.service.ts` |
| `emailVerificationRequired` | boolean | `false` | tenant | GTH-1/12: require a verified email before credential login. | `auth.credential.service.ts` |
| `ssoAllowedProviders` | text | — | tenant | GTH-2: CSV/JSON provider allow-list (empty = all). | `auth.policy.validator.service.ts` |
| `mfaAllowedMethods` | text | — | tenant | GTH-13: CSV allow-list of MFA methods (TOTP_APP/EMAIL/SMS; empty = all). | `auth.otp.service.ts`, `auth.totp.service.ts` |
| `totpIssuer` | text | env | tenant | GTH-4: authenticator-app brand label; falls back to `env.TOTP_ISSUER`. | `auth.totp.service.ts` |
| `otpLength` | number | env/6 | tenant | GTH-3: OTP digit count. | `auth.otp.service.ts` |
| `otpExpirySeconds` | number | env/600 | tenant | GTH-3: OTP lifetime. | `auth.otp.service.ts` |
| `otpRateLimitSeconds` | number | env/60 | tenant | GTH-3: OTP rate-limit window. | `auth.otp.service.ts` |
| `otpMaxAttempts` | number | env/5 | tenant | GTH-3: OTP attempt cap. | `auth.otp.service.ts` |
| `resetTokenExpirySeconds` | number | env/3600 | tenant | GTH-3: password-reset token lifetime. | `auth.password.service.ts` |
| `resetTokenLength` | number | env/6 | tenant | GTH-3: reset token digit count (min 4). | `auth.password.service.ts` |
| `emailVerifyTtlSeconds` | number | env/86400 | tenant | GTH-3: email-verification token lifetime. | `auth.verification.service.ts` |
| `emailVerifyRateLimitSeconds` | number | env/300 | tenant | GTH-3: verification-email resend interval. | `auth.verification.service.ts` |
| `bcryptCost` | number | `10` | tenant | GTH-6: bcrypt cost factor (validated 4–15). | `auth.credential.service.ts` |
| `passwordMinAgeDays` | number | `0` | tenant | GTH-9: minimum age before a password may be changed again (0 disables). | `auth.credential.service.ts` |
| `dormantDeleteAfterDays` | number | `0` | tenant | GTH-8: anonymise dormant accounts after this many days of inactivity (0 = disable-only). | `auth.credential.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant). New GTH keys are surfaced in the Authentication settings page (`app/tenant/[tenantId]/admin/(tenant-scope)/auth/settings`) backed by `auth.settings.fields.ts`.*

### Per-tenant behavior

- `auth.service.ts:login` — CAPTCHA gating (captchaTriggerAttempts), lockout thresholds (lockoutMaxAttempts/lockoutDurationMinutes), password-age forced change (passwordMaxAgeDays), and external-MFA enforcement (externalRequireMfa) are all resolved via AuthPolicyService.get*Policy(tenantId), so login behavior differs per tenant.
- `auth.service.ts:register` — Password complexity and history seeding use getPasswordPolicy(tenantId) (passwordMinLength/require*/passwordHistoryCount), so accepted passwords vary per tenant.
- `auth.service.ts:changePassword` — Password complexity + reuse-history depth resolved from getPasswordPolicy(tenantId).
- `auth.service.ts:disableDormantAccounts` — Dormant cutoff window and whether accounts are actually disabled come from getDormantPolicy(tenantId) (dormantAccountDays/dormantAccountAutoDisable).
- `auth.password.service.ts:resetPassword` — Reset password complexity + history enforced via getPasswordPolicy(tenantId).
- `auth.policy.service.ts:getAdminPolicy / isAdminIpAllowed` — Admin IP allowlist (adminPanelIpAllowlist) and admin MFA requirement (adminRequireMfa) are resolved per tenant; isAdminIpAllowed gates admin access against the tenant CIDR/IP list.
- `user_session.crud.service.ts:createSession/getSession` — Session lifetime/idle timeout (getSessionPolicy(tenantId)) and single-session enforcement (getAccessPolicy(tenantId).singleSessionOnly) vary per tenant; note getSession at line ~201 calls getSessionPolicy() with NO tenantId, falling back to system/defaults.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| allowRegistration is declared in AuthSettingKeySchema and seeded per-tenant ('true') but no auth service reads it; self-registration is unconditionally allowed in AuthService.register. | `auth.service.ts:register (key declared in auth.setting.keys.ts, seeded in setting.seed.ts)` | A tenant that wants invite-only signup cannot turn off open registration; the key exists and is seeded but is never consulted, so the per-tenant toggle is inert. | `allowRegistration` |
| emailVerificationRequired is declared and seeded per-tenant but never read; AuthService never gates login/registration on a verified email. | `auth.service.ts (key declared in auth.setting.keys.ts, seeded in setting.seed.ts)` | Tenants requiring verified email before access have no enforcement path; the setting is dead. | `emailVerificationRequired` |
| maxLoginAttempts is declared and seeded per-tenant ('5') but unused; lockout actually uses the separate lockoutMaxAttempts key, leaving two overlapping knobs where one is inert. | `auth.setting.keys.ts / setting.seed.ts (lockout read in auth.policy.service.ts via lockoutMaxAttempts)` | Redundant/dead per-tenant key that can confuse tenant admins versus the lockoutMaxAttempts key that is actually enforced. | `lockoutMaxAttempts` |
| ssoAllowedProviders is declared and seeded per-tenant as a JSON list but no auth code reads it; disableSocialLogin only toggles all social login on/off. | `auth.setting.keys.ts / setting.seed.ts` | Tenants cannot restrict which specific OAuth providers are offered (e.g. allow Google but not GitHub); the per-tenant provider allowlist is declared but never enforced. | `ssoAllowedProviders` |
| Email-verification token TTL and rate-limit window are hardcoded from env (EMAIL_VERIFY_TTL_SECONDS, EMAIL_VERIFY_RATE_LIMIT_SECONDS), global across all tenants. | `auth.service.ts (EMAIL_VERIFY_TTL_SECONDS / EMAIL_VERIFY_RATE_LIMIT_SECONDS)` | Plausibly per-tenant (different security postures want different verification windows), but currently a single global env value. | `emailVerifyTtlSeconds` |
| Password-reset token TTL/length and forgot-password rate limit are hardcoded from env/constants, global across tenants. | `auth.password.service.ts (RESET_TOKEN_EXPIRY_SECONDS, RESET_TOKEN_LENGTH, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS)` | Reset-link lifetime and reset rate limiting are reasonable per-tenant security knobs but are fixed globally. | `resetTokenExpirySeconds` |
| OTP length, expiry, rate-limit window and max attempts are hardcoded from env, global across tenants. | `auth.otp.service.ts (OTP_LENGTH, OTP_EXPIRY_SECONDS, OTP_RATE_LIMIT_SECONDS, OTP_MAX_ATTEMPTS)` | MFA delivery code lifetime/attempt budget could vary per tenant security policy; currently a single global config. | `otpExpirySeconds` |
| TOTP issuer label, step, window and digits are hardcoded from env (issuer defaults to 'Relatia'), global across tenants. | `auth.totp.service.ts (TOTP_ISSUER, TOTP_STEP_SECONDS, TOTP_WINDOW, TOTP_DIGITS)` | Authenticator-app issuer label is brand-facing and would ideally match each tenant's name/branding, but is a single global value. | `totpIssuer` |
| All transactional auth emails/SMS (verify, OTP, forgot/reset) are sent with tenantId: ROOT_TENANT_ID, so they always use platform mail/SMS provider config and branding, never the request tenant's. | `auth.service.ts:sendEmailVerification, auth.otp.service.ts:requestOTP, auth.password.service.ts:forgotPassword/resetPassword` | Tenants with their own mail provider/branding (tenant_branding) won't have it applied to auth emails because delivery is hardcoded to the root tenant context. | — |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `recaptchaServerKey` — Google reCAPTCHA secret used to verify CAPTCHA tokens; read only at ROOT_TENANT_ID in auth.captcha.service.ts (fail-closed when unset).
- `jwtAccessTokenSecret` — Platform JWT access-token signing secret (declared in auth.setting.keys.ts; platform credential).
- `jwtRefreshTokenSecret` — Platform JWT refresh-token signing secret (platform credential).
- `jwtAccessTokenExpiresIn` — Platform JWT access-token lifetime (declared in auth.setting.keys.ts).
- `jwtRefreshTokenExpiresIn` — Platform JWT refresh-token lifetime (declared in auth.setting.keys.ts).
- `googleClientId` — Google OAuth client id (platform OAuth credential, declared in auth.setting.keys.ts).
- `googleClientSecret` — Google OAuth client secret (platform OAuth credential).
- `githubClientId` — GitHub OAuth client id (platform OAuth credential).
- `githubClientSecret` — GitHub OAuth client secret (platform OAuth credential).
- `appleClientId` — Apple Sign-in client id (platform OAuth credential).
- `appleTeamId` — Apple developer team id (platform OAuth credential).
- `appleKeyId` — Apple key id (platform OAuth credential).
- `applePrivateKey` — Apple private key for Sign-in (platform OAuth credential).
- `metaClientId` — Meta/Facebook OAuth client id (platform OAuth credential).
- `metaClientSecret` — Meta/Facebook OAuth client secret (platform OAuth credential).
- `autodeskClientId` — Autodesk OAuth client id (platform OAuth credential).
- `autodeskClientSecret` — Autodesk OAuth client secret (platform OAuth credential).
- `gitlabToken` — GitLab integration token (platform credential).
- `gitlabUser` — GitLab integration user (platform credential).
- `oauthGoogle` — Enable/disable Google OAuth provider (declared in auth.setting.keys.ts).
- `oauthGitHub` — Enable/disable GitHub OAuth provider (declared in auth.setting.keys.ts).
- `oauthMicrosoft` — Enable/disable Microsoft OAuth provider (declared in auth.setting.keys.ts).
- `oauthLinkedIn` — Enable/disable LinkedIn OAuth provider (declared in auth.setting.keys.ts).
- `oauthApple` — Enable/disable Apple OAuth provider (declared in auth.setting.keys.ts).
- `oauthTwitter` — Enable/disable Twitter OAuth provider (declared in auth.setting.keys.ts).
- `oauthMeta` — Enable/disable Meta OAuth provider (declared in auth.setting.keys.ts).
- `oauthAutodesk` — Enable/disable Autodesk OAuth provider (declared in auth.setting.keys.ts).

---

## Dependencies

Requires: `user`, `user_session`, `user_security`, `notification_mail`, `notification_sms`, `setting`, `tenant`, `tenant_invitation`, `audit_log`, `webhook` (GTH-18), `observability` (GTH-17), `db`, `env`, `redis`, `common`. Dormant sweep additionally uses BullMQ via `redis/redis.bullmq`. TOTP uses `otplib`; password/token hashing uses `bcrypt` and Node `crypto`. OpenAPI export uses Zod v4's built-in `z.toJSONSchema()`.
