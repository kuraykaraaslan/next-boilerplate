# Admin Impersonation

- **id:** `auth_impersonation`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/auth_impersonation/`
- **tags:** identity, auth, admin
- **icon:** `fas fa-user-secret`
- **hasNextLayer:** true

Allow a system admin to assume a target user's session (always audited).

## Dependencies

- **requires:** `user`, `user_session`, `audit_log`, `setting`, `webhook`, `redis`, `auth`, `env`

## Services

- `impersonation.flow.service.ts`
- `impersonation.mint.service.ts`
- `impersonation.service.ts`
- `impersonation.session.service.ts`
- `impersonation.settings.service.ts`

## DTOs

- `impersonation.dto.ts`

## Message keys

- `impersonation.messages.ts`

## Setting keys

- `impersonation.setting.keys.ts`

## Next layer (modules_next/) surface

- `auth_impersonation/ui/impersonation-settings.page` _(ui, client)_

## README

# Auth Impersonation Module

Lets a system admin (platform super-admin) or a tenant `OWNER`/`ADMIN` assume a target user's session for testing and support. Every impersonation is gated by role checks, requires a **mandatory reason**, optionally requires **step-up re-authentication**, runs in a dedicated tracked session with a **per-tenant TTL**, is **rate-limited per impersonator**, and is written to the audit log + emitted as a webhook. The module composes `user`, `user_session`, `tenant_member`, `audit_log`, `setting`, `webhook`, `redis`, and `auth` (TOTP step-up only).

---

## Files

| File | Purpose |
|---|---|
| `impersonation.service.ts` | Core logic: start (system / tenant flows), end, look up the active session, banner/expiry context, per-tenant settings resolvers, step-up verification, concurrency cap, anomaly alerting. |
| `impersonation.dto.ts` | `StartSystemImpersonationDTO`, `StartTenantImpersonationDTO`, `StepUpCredentialDTO` (Zod). Both start DTOs require `reason` and accept an optional `stepUp`. |
| `impersonation.messages.ts` | `ImpersonationMessages` error/status string enum. |
| `impersonation.setting.keys.ts` | `ImpersonationSettingKeySchema` (Zod enum) + named accessors + defaults. |
| `impersonation.settings.fields.ts` | `IMPERSONATION_SETTINGS_FIELDS` — admin-UI metadata for the settings page. |
| `module.json` | Module manifest. |

Impersonation sessions are stored as ordinary `UserSession` rows (in the **system DB**) tagged with `metadata.impersonation` (now also carrying `impersonationSessionId` and `reason`).

---

## Settings (per-tenant)

All keys are read against the **target tenant** (the tenant whose user is being impersonated), so a high-security tenant constrains how its users may be impersonated regardless of which flow initiates the request. Edit them at
`/tenant/[tenantId]/admin/impersonation/settings` (ModuleSettingsPage).

| Key | Type | Default | Effect |
|---|---|---|---|
| `impersonationSessionTtlMinutes` | number | `60` | Per-tenant impersonation session lifetime (clamped to `[1, 1440]`). Consumed by the user_session orchestrator via `getImpersonationTtlMs`. |
| `impersonationRequireStepUp` | boolean | `false` | When `true`, the start flow requires a step-up credential (password re-entry or TOTP). |
| `impersonationMaxConcurrentPerImpersonator` | number | `0` (unlimited) | Max simultaneous active impersonation sessions a single admin may hold against this tenant. |
| `impersonationDisabled` | boolean | `false` | When `true`, **all** impersonation of this tenant's users is blocked — including the platform/system flow. |
| `impersonationAlertStartsPerHour` | number | `0` (off) | Emit an anomaly signal (audit + log) when one admin exceeds this many starts within an hour. |

### TTL resolver (for the user_session orchestrator)

```ts
ImpersonationService.getImpersonationTtlMs(tenantId: string): Promise<number>
```

Reads `impersonationSessionTtlMinutes` from the target tenant, clamps to `[1, 1440]` minutes, falls back to 60 minutes on unset/invalid, and returns **milliseconds**. The orchestrator in `user_session` calls this when minting the impersonation session.

---

## Service responsibilities (`ImpersonationService`)

| Method | Responsibility |
|---|---|
| `startSystemImpersonation` | Platform-admin flow. Requires `reason`. Blocks if the tenant opted out. Loads the target `User`, asserts not-self + **global role dominance** (`{ USER: 0, ADMIN: 1 }`). Enforces **step-up** (if the tenant requires it) and the **per-impersonator concurrency cap**. Resolves the target's tenant role from `TenantMember` (defaulting to `'USER'`) unless `targetTenantRole` is supplied, mints the session, logs `IMPERSONATION_STARTED` (`flow: 'system'`), and emits `impersonation.started`. |
| `startTenantImpersonation` | Tenant `OWNER`/`ADMIN` flow. Requires `reason`. Blocks if the tenant opted out. Returns a **generic `TARGET_NOT_FOUND`** whether the user does not exist *or* is not a member of this tenant (closes cross-tenant enumeration). Throws `TARGET_MUST_BE_TENANT_USER` unless `memberRole === 'USER'`. Enforces step-up + concurrency cap, mints the session (`targetTenantRole: 'USER'`), logs/emits as above (`flow: 'tenant'`). |
| `endImpersonationSession` | Deletes the impersonation `UserSession`. When an `actorId` is provided, logs `IMPERSONATION_ENDED` with the **computed duration** (from `startedAtMs`) and the shared `impersonationSessionId` linking START→END, and emits `impersonation.ended`. |
| `getActiveImpersonationSession` | Hashes the raw access token and returns the session only if it carries `metadata.impersonation` and has not expired — otherwise `null`. |
| `getImpersonationContext` | Disclosure-banner + auto-expiry context: `{ isImpersonating, impersonatorUserId, targetUserId, tenantId, targetTenantRole, impersonationSessionId, expiresAt, remainingMs }`, or `null`. |
| `getImpersonationTtlMs` | Per-tenant TTL resolver (see above). |
| `isImpersonationDisabled` | Whether the tenant has opted out. |

Both start flows return `{ userSession, rawAccessToken, rawRefreshToken }`.

---

## Step-up re-authentication

When the target tenant sets `impersonationRequireStepUp=true`, the start flow requires a `stepUp` credential:

- **password** — verified locally against the impersonator's stored bcrypt hash (`STEP_UP_INVALID_PASSWORD` on mismatch).
- **totp** — delegated to `auth.totp.service` (`STEP_UP_INVALID_TOTP` on mismatch).

Missing credential → `STEP_UP_REQUIRED` (401). No usable method (e.g. no password on file) → `STEP_UP_METHOD_UNAVAILABLE`.

## Tenant opt-out

`impersonationDisabled=true` makes both flows throw `IMPERSONATION_DISABLED_FOR_TENANT` (403) — the system/platform flow is **not** exempt. Use for high-sensitivity tenants whose contracts prohibit vendor-side access.

---

## Role hierarchy

- **Global (system flow):** `{ USER: 0, ADMIN: 1 }` — impersonator must strictly outrank the target (`CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE`). Unknown roles fall back to `0`.
- **Tenant flow:** the target must be a member of the tenant with `memberRole === 'USER'`.
- No self-impersonation (`CANNOT_IMPERSONATE_SELF`).

---

## API Routes

| Method | Path | Scope | Description |
|---|---|---|---|
| POST | `/tenant/[tenantId]/api/admin/impersonate` | **platform super-admin** (root-tenant `ADMIN`) | **System flow.** `StartSystemImpersonationDTO` (`targetUserId`, `tenantId`, `reason`, optional `targetTenantRole`, optional `stepUp`). Gated by `authenticateAdminRequest`. Sets impersonation tokens and backs up the caller's tokens. |
| POST | `/tenant/[tenantId]/api/auth/impersonate` | tenant `ADMIN`+ | **Tenant flow.** `StartTenantImpersonationDTO` (`targetUserId`, `reason`, optional `stepUp`). |
| DELETE | `/tenant/[tenantId]/api/auth/impersonate` | impersonating session | Exit impersonation; ends the session (records duration) and restores the original tokens. |
| GET | `/tenant/[tenantId]/api/auth/impersonate` | impersonating session | Banner/expiry status: `isImpersonating`, `impersonatorUserId`, `targetUserId`, `tenantId`, `targetTenantRole`, `impersonationSessionId`, **`expiresAt`**, **`remainingMs`**. |
| GET | `/tenant/[tenantId]/api/users/[userId]/impersonation-sessions` | admin | Paginated list, **scoped to the requesting tenant** (`metadata.impersonation.tenantId = [tenantId]`). `?page=&pageSize=&activeOnly=`. |

Mutating routes are rate-limited via `Limiter` (per-route), independent of the per-impersonator concurrency cap.

---

## Disclosure banner & auto-expiry (UI)

`GET …/api/auth/impersonate` returns `expiresAt` and `remainingMs` so the client can render a persistent disclosure banner ("You are impersonating … as <impersonatorUserId>") and a live countdown, and warn before the session lapses. `getImpersonationContext` is the underlying service helper.

---

## Monitoring & alerting

- **Duration tracking (#11):** START and END audit entries share an `impersonationSessionId`; END records `durationMs`. Both entries carry dual-actor info — `actorId`/`metadata.impersonatorId` = the impersonator, `onBehalfOfActorId` = the target.
- **Webhooks (#12):** every start emits `impersonation.started` and every end emits `impersonation.ended` (best-effort, fire-and-forget).
- **Anomaly hook (#12):** a per-impersonator hourly counter in Redis. When a single admin exceeds `impersonationAlertStartsPerHour` starts in an hour, an anomaly is logged (warning) and an extra `IMPERSONATION_STARTED` audit entry is written with `metadata.anomaly=true`, which feeds the existing `audit.high_risk` webhook pipeline.

---

## Usage

```typescript
import ImpersonationService from '@/modules/auth_impersonation/impersonation.service';

// Tenant OWNER/ADMIN impersonates a tenant USER:
const { userSession, rawAccessToken, rawRefreshToken } =
  await ImpersonationService.startTenantImpersonation({
    impersonatorUser, impersonatorMember, impersonatorSession,
    targetUserId, tenantId,
    reason: 'Support ticket #1234',          // required
    stepUp: { password: '…' },                // required only if the tenant opts in
    ipAddress, userAgent,
  });

// End impersonation (records duration + emits impersonation.ended):
await ImpersonationService.endImpersonationSession(userSession.userSessionId, {
  actorId: impersonatorUser.userId,
  targetUserId,
  tenantId,
  impersonationSessionId: '…',  // from session metadata
  startedAtMs: Date.now(),      // or session.createdAt
});
```

---

## Security summary

- No self-impersonation; global role dominance (system) / tenant-USER-only (tenant).
- Mandatory `reason` stored in the audit metadata (SOC 2 / ISO 27001 / GDPR purpose limitation).
- Optional step-up re-auth (password or TOTP) per tenant.
- Per-impersonator concurrency cap (Redis-counted via active session rows).
- Per-tenant TTL; per-tenant full opt-out (binds the platform flow too).
- Cross-tenant enumeration closed via generic `TARGET_NOT_FOUND`; session-list API tenant-scoped.
- Fully audited + webhook-emitted; reversible via backup cookies.

---

## Dependencies

`requires`: `user`, `user_session`, `audit_log`, `setting`, `webhook`, `redis`, `env`. Reads `tenant_member` and `auth` (TOTP step-up) at runtime.
