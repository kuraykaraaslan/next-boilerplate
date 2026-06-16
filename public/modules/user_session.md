# User Session

- **id:** `user_session`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/user_session/`
- **tags:** identity, auth, core
- **icon:** `fas fa-id-badge`
- **hasNextLayer:** false

JWT access/refresh issuance + revocation, Redis-backed session cache, CRUD on UserSession rows.

## Dependencies

- **requires:** `db`, `redis`, `env`, `user`, `user_agent`

## TypeORM entities

- `UserSession` (system) — `modules/user_session/server/entities/user_session.entity.ts`

## README

# User Session Module

JWT access/refresh token issuance, verification, rotation, and revocation backed by a Redis-cached `UserSession` row in the shared **system DB**. Supports device fingerprinting, multi-session tracking, impersonation sessions, and OTP-verification gating. Per-request session lifetime, idle timeout, and single-session enforcement are gated by `AuthPolicyService` settings (per tenant).

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `UserSession` | `user_sessions` | One row per login session: hashed access/refresh tokens, device fingerprint, user agent, IP, `sessionStatus`, `otpVerifyNeeded`, `sessionExpiry`, and a JSONB `metadata` blob (used for impersonation). |

Lives in the **system DB** — there is **no `tenantId` column**; sessions are system-scoped and seeded via `ctx.systemRepo`. `accessToken` and `refreshToken` are stored as SHA-256 hashes (never the raw token).

---

## Files

| File | Purpose |
|---|---|
| `user_session.service.ts` | Facade: binds and re-exports the token / cache / CRUD sub-services |
| `user_session.token.service.ts` | JWT generation & verification, token hashing, device-fingerprint hashing |
| `user_session.crud.service.ts` | DB CRUD + Redis cache/idle logic: create, get, refresh, update, delete sessions |
| `user_session.cache.service.ts` | Redis session-cache invalidation per user |
| `user_session.entity.ts` (`entities/`) | TypeORM entity for the `user_sessions` table |
| `user_session.types.ts` | Zod schemas + `UserSession`, `SafeUserSession`, `SessionMeta` types |
| `user_session.enums.ts` | `SessionStatusEnum` (`ACTIVE` / `EXPIRED` / `REVOKED`) |
| `user_session.messages.ts` | `UserSessionMessages` error/status string enum |
| `user_session.seed.ts` | Demo seed: active/OTP/expired/revoked sessions for the seed users |

---

## Session Status

| Status | Meaning |
|---|---|
| `ACTIVE` | Valid and usable |
| `EXPIRED` | Past `sessionExpiry` (or idle-timeout) |
| `REVOKED` | Manually invalidated |

---

## Services / Responsibilities

**`UserSessionTokenService`** — stateless JWT/crypto helper:
- `generateAccessToken` / `generateRefreshToken` — sign payloads with env secrets; access TTL `ACCESS_TOKEN_EXPIRES_IN` (default `1h`), refresh TTL `REFRESH_TOKEN_EXPIRES_IN` (default `7d`), refresh token has a 5s `notBefore`.
- `verifyAccessToken` / `verifyRefreshToken` — verify issuer/audience, optionally enforce device fingerprint; map JWT errors to `TOKEN_EXPIRED` / `INVALID_TOKEN`.
- `hashToken` — SHA-256 hash stored in the DB instead of the raw token.
- `generateDeviceFingerprint` — SHA-256 of `ip|userAgent|acceptLanguage`.

**`UserSessionCrudService`** — session lifecycle (per-tenant policy aware):
- `createSession` — issues a new session; caps `sessionExpiry` at `min(SESSION_EXPIRY_MS, absoluteMaxHours)`, seeds the Redis idle key, and purges all prior sessions first when `singleSessionOnly` is set.
- `createImpersonationSession` — issues a short-lived (1h) session carrying impersonation `metadata`; refresh of these is rejected.
- `getSession` — verifies the access token, serves from / repopulates the Redis cache, enforces idle timeout (Redis idle key + DB `updatedAt` grace window), and gates on `otpVerifyNeeded`.
- `refreshTokens` — rotates access+refresh tokens; detects refresh-token reuse (purges all user sessions on reuse), and enforces the absolute-lifetime ceiling (`createdAt + absoluteMaxHours`).
- `updateSession` — patch `otpVerifyNeeded` / `sessionStatus`.
- `deleteSession` / `deleteOtherSessions` / `deleteAllSessions` — revoke one / all-but-current / all sessions for a user, clearing the cache.
- `getUserSessions` — list a user's `ACTIVE`, non-expired sessions (newest first).

**`UserSessionCacheService`** — `clearUserSessionCache(userId)` deletes all `session:<userId>:*` Redis keys.

**`UserSessionService`** — facade exposing all of the above as bound static methods.

---

## Usage

```typescript
import UserSessionService from '@/modules/user_session/user_session.service';

// Create a new session after login (tenantId gates lifetime/idle/single-session policy)
const { userSession, rawAccessToken, rawRefreshToken } = await UserSessionService.createSession({
  user,
  userSecurity,
  deviceFingerprint,
  userAgent: request.headers['user-agent'],
  ipAddress: '1.2.3.4',
  tenantId,
});

// Resolve / validate a session from an access token
const session = await UserSessionService.getSession({ accessToken, deviceFingerprint, tenantId });

// Rotate tokens (refresh flow)
const rotated = await UserSessionService.refreshTokens(rawRefreshToken);

// Revoke (logout) a single session, or all of a user's sessions
await UserSessionService.deleteSession(userSession.userSessionId);
await UserSessionService.deleteAllSessions(user.userId);
```

---

## API Routes (tenant-scoped, under `/tenant/[tenantId]/api/auth`)

| Method | Path | Description |
|---|---|---|
| GET | `/auth/me/sessions` | List the authenticated user's active sessions (`getUserSessions`) |
| DELETE | `/auth/me/sessions/[sessionId]` | Revoke one of the user's own sessions (`deleteSession`) |
| POST | `/auth/refresh` | Rotate access/refresh tokens (`refreshTokens`) |

The service is also consumed by sibling auth routes (`/auth/session`, `/auth/change-password`) and by impersonation flows.

---

## Settings

This module owns **no `settings.fields.ts`**; its per-tenant behavior is driven by `AuthPolicyService` (`modules/auth/auth.policy.service.ts`), read via `getSessionPolicy(tenantId)` / `getAccessPolicy(tenantId)`. The relevant keys are documented under *Tenant Variability* below. JWT secrets and token TTLs come from env (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`); session record / cache TTLs come from `SESSION_EXPIRY_MS` (default 7 days) and `SESSION_CACHE_TTL` (default 1800s).

---

## Security

- Tokens are stored **hashed** (SHA-256) — the raw access/refresh tokens never touch the DB, and `SafeUserSession` omits `accessToken`, `refreshToken`, and `deviceFingerprint`.
- **Refresh-token reuse detection**: if a presented refresh token no longer matches the stored hash, all of the user's sessions are purged and `REFRESH_TOKEN_REUSED` is thrown.
- **Device-fingerprint binding**: when a fingerprint is supplied, both `verifyAccessToken` and `getSession` reject a mismatch (`DEVICE_FINGERPRINT_MISMATCH`).
- **OTP gating**: a session with `otpVerifyNeeded` cannot be resolved (or refreshed) until verification, unless explicitly bypassed.
- **Idle timeout**: enforced via a Redis `session:idle:<id>` key (TTL = `idleTimeoutMinutes`) plus a DB-level grace window against `updatedAt`.
- **Absolute lifetime ceiling**: a session record can never outlive `createdAt + absoluteMaxHours`, even across refreshes.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Issues, stores, verifies, refreshes and revokes JWT-backed user login sessions in the shared system DB; sessions have no tenantId column, but session lifetime/idle/single-session behavior is gated per request tenant via AuthPolicyService settings.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `sessionAbsoluteMaxHours` | number | `8` | tenant | Absolute ceiling on a session's total lifetime (hours); createSession caps sessionExpiry at min(SESSION_EXPIRY_MS, absoluteMaxHours) and refreshTokens kills the session past createdAt+absoluteMaxHours. | `user_session.crud.service.ts` |
| `sessionIdleTimeoutMinutes` | number | `30` | tenant | Idle-timeout window; sets the Redis session:idle:<id> TTL so a session expires after this many minutes of inactivity (enforced in getSession and seeded in createSession). | `user_session.crud.service.ts` |
| `singleSessionOnly` | boolean | `false` | tenant | When true, createSession deletes all prior active sessions for the user before issuing the new one (single concurrent session per user). | `user_session.crud.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Per-tenant behavior

- `user_session.crud.service.ts:createSession` — Calls AuthPolicyService.getSessionPolicy(tenantId) and getAccessPolicy(tenantId): per-tenant absoluteMaxHours caps the new session's expiry, idleTimeoutMinutes sets the initial Redis idle-key TTL, and singleSessionOnly (per tenant) decides whether all of the user's prior sessions are purged first.
- `user_session.crud.service.ts:getSession` — Calls getSessionPolicy(tenantId); per-tenant idleTimeoutMinutes determines the Redis idle-key TTL and the DB-level idle grace window, so the same access token can expire from inactivity sooner/later depending on the tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| refreshTokens computes the absolute-lifetime deadline from AuthPolicyService.getSessionPolicy() called WITHOUT a tenantId, so token refresh always uses the platform/default sessionAbsoluteMaxHours instead of the session owner's tenant policy. | `user_session.crud.service.ts:refreshTokens` | Inconsistent with createSession/getSession which pass tenantId; a tenant that tightens sessionAbsoluteMaxHours has its ceiling silently bypassed on refresh. The tenant context (or session's tenant) should be threaded through so the same per-tenant policy already in settings is honored on refresh. | — |
| Session record TTL is the global SESSION_EXPIRY_MS (env, default 7 days) and the cache TTL is global env SESSION_CACHE_TTL; only the absolute-max cap is per tenant. | `user_session.crud.service.ts:SESSION_EXPIRY_MS` | A tenant cannot set its own baseline session duration (only an upper cap via sessionAbsoluteMaxHours); the underlying refresh-window duration is shared across all tenants. Plausibly should be a per-tenant override for tenants wanting shorter default sessions without lowering the absolute cap. | `sessionDurationMs` |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `jwtAccessTokenSecret` — Platform JWT signing config; tokens are signed/verified with global env secrets (ACCESS_TOKEN_SECRET) in user_session.token.service.ts, not per tenant.
- `jwtAccessTokenExpiresIn` — Global access-token TTL (env ACCESS_TOKEN_EXPIRES_IN, default 1h) used for all tenants when signing access tokens.
- `jwtRefreshTokenExpiresIn` — Global refresh-token TTL (env REFRESH_TOKEN_EXPIRES_IN, default 7d) used for all tenants when signing refresh tokens.

---

## Dependencies

Requires: `db`, `redis`, `env`, `user`, `user_agent`. Reads per-tenant policy from `auth` (`AuthPolicyService`); consumes `user` / `user_security` types and `tenant_member` role enum (impersonation metadata).
