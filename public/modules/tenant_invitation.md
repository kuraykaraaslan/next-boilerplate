# Tenant Invitation

- **id:** `tenant_invitation`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_invitation/`
- **tags:** tenant, onboarding
- **icon:** `fas fa-envelope-open`
- **hasNextLayer:** true

Email invitation flow: create / accept / decline / revoke. Bound to tenant_member on acceptance.

## Dependencies

- **requires:** `db`, `tenant`, `tenant_member`, `notification_mail`, `user`, `env`

## Services

- `tenant_invitation.lifecycle.service.ts`
- `tenant_invitation.read.service.ts`
- `tenant_invitation.service.ts`

## DTOs

- `tenant_invitation.dto.ts`

## Entities

- `tenant_invitation.entity.ts`

## Enums

- `tenant_invitation.enums.ts`

## Message keys

- `tenant_invitation.messages.ts`

## TypeORM entities

- `TenantInvitation` (tenant) — `modules/tenant_invitation/server/entities/tenant_invitation.entity.ts`

## Next layer (modules_next/) surface

- `tenant_invitation/ui/invitation-columns.component` _(ui, client)_
- `tenant_invitation/ui/invitation-create-modal.component` _(ui, client)_
- `tenant_invitation/ui/invitations-settings.page` _(ui, client)_
- `tenant_invitation/ui/invitations.page` _(ui, client)_

## README

# Tenant Invitation Module

Tenant membership invitations via hashed email token. Admins send/revoke invitations; invitees preview, accept, or decline them. Pending invitations are auto-accepted when a new user registers (or signs in via SAML) with a matching email. Acceptance binds the user to `tenant_member` with the invited role, and every lifecycle transition fires a tenant webhook.

---

## Entities

| Entity | Table | DB | Description |
|---|---|---|---|
| `TenantInvitation` | `tenant_invitations` | tenant DB | One invitation per email token. Columns: `email`, `invitedByUserId`, `memberRole` (default `USER`), `token` (sha256 of the raw token, unique), `status` (default `PENDING`), `expiresAt`. Indexed on `tenantId`, `email`, `token`. |

Write and list paths resolve the per-tenant DataSource via `tenantDataSourceFor(tenantId)`, so rows are isolated by tenant. The two cache-backed point reads (`getById`, `getByToken`) query the system DataSource (`getDataSource()`).

---

## Invitation Status (`TenantInvitationStatusEnum`)

| Status | Meaning |
|---|---|
| `PENDING` | Sent, awaiting response |
| `ACCEPTED` | Invitee accepted and is now a member |
| `DECLINED` | Invitee declined |
| `REVOKED` | Admin cancelled the invitation (or it was superseded by a newer invite to the same email) |
| `EXPIRED` | Past `expiresAt` (default TTL: 7 days) |

`assertUsable` rejects any non-`PENDING`/expired invitation before accept/decline/preview.

---

## Service (`tenant_invitation.service.ts`)

| Method | Responsibility |
|---|---|
| `send(tenantId, invitedByUserId, { email, memberRole })` | Normalizes the email, rejects if the user is already a member, revokes any stale `PENDING` invites to the same email, mints a raw token + sha256 hash, persists a `PENDING` row with `expiresAt`, clears any negative cache for the new token, and dispatches `invitation.sent`. Returns the safe invitation **and** the one-time `rawToken` (the route emails it). |
| `preview(tenantId, rawToken)` | Public, unauthenticated lookup by token within the tenant. Asserts the invitation is usable and returns it plus `{ tenantId, name }` of the tenant. |
| `accept(tenantId, userId, userEmail, rawToken)` | Validates token, requires `userEmail` to match the invited email, creates an `ACTIVE` `tenant_member` with `memberRole`, marks `ACCEPTED`, clears cache, dispatches `invitation.accepted`. |
| `decline(tenantId, userEmail, rawToken)` | Validates token + email match, marks `DECLINED`, clears cache, dispatches `invitation.declined`. |
| `revoke(invitationId, tenantId)` | Admin cancel; only `PENDING` invitations are revocable, marks `REVOKED`, clears cache, dispatches `invitation.revoked`. |
| `autoAcceptForEmail(userId, email)` | Best-effort: finds all non-expired `PENDING` invites for the email (system DB), creates membership where missing, marks each `ACCEPTED`, clears cache. Errors per-invitation are swallowed. |
| `getByTenantId({ tenantId, page, pageSize, status })` | Paginated, optionally status-filtered list of safe invitations for a tenant + total count. |
| `getById(invitationId)` / `getByToken(rawToken)` | Cached point reads (see *Caching*). |
| `hashToken` / `generateRawToken` | sha256 hashing and 32-byte random token helpers. |

`SafeTenantInvitation` omits the `token` column, so the token hash is never returned through the service or API.

---

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenant/[tenantId]/api/invitations` | tenant ADMIN+ | List invitations (`?page=&pageSize=&status=`). |
| POST | `/tenant/[tenantId]/api/invitations` | tenant ADMIN+ | Send an invitation; asserts the `MAX_MEMBERS` feature, then emails the raw token via `MailService.sendTenantInvitationEmail`. |
| GET | `/tenant/[tenantId]/api/invitations/[invitationId]` | tenant ADMIN+ | Get a single invitation (404 if it belongs to another tenant). |
| DELETE | `/tenant/[tenantId]/api/invitations/[invitationId]` | tenant ADMIN+ | Revoke an invitation. |
| GET | `/tenant/[tenantId]/api/invitations/accept?token=` | public | Preview invitation + tenant info (no auth). |
| POST | `/tenant/[tenantId]/api/invitations/accept` | logged-in user | Accept via `{ token }`. |
| POST | `/tenant/[tenantId]/api/invitations/decline` | logged-in user | Decline via `{ token }`. |

All routes pass through the shared `Limiter.checkRateLimit`. The invitation cap is enforced via the `tenant_subscription` feature `FEATURE_KEYS.MAX_MEMBERS` (current active-member count is asserted before sending).

---

## Usage

```typescript
import TenantInvitationService from '@/modules/tenant_invitation/tenant_invitation.service';

// Send an invitation (returns the one-time rawToken to email)
const { invitation, rawToken } = await TenantInvitationService.send(tenantId, adminUserId, {
  email: 'alice@example.com',
  memberRole: 'USER',
});

// Accept via token (from email link) — userEmail must match the invited email
await TenantInvitationService.accept(tenantId, userId, userEmail, rawToken);

// Revoke (only PENDING invitations)
await TenantInvitationService.revoke(invitationId, tenantId);

// List
const { invitations, total } = await TenantInvitationService.getByTenantId({
  tenantId, page: 1, pageSize: 20, status: 'PENDING',
});
```

---

## Auto-Accept on Registration

On registration, `AuthService` calls `TenantInvitationService.autoAcceptForEmail(userId, email)` to auto-accept every open, non-expired invitation matching that email. The SAML login flow (`auth_saml.service.ts`) makes the same best-effort call after provisioning the user.

---

## Caching

Invitations are cached in Redis (TTL = `INVITATION_CACHE_TTL`, from `env.TENANT_CACHE_TTL`, default 5 min):

| Key | Used by |
|---|---|
| `tenant_invitation:id:{invitationId}` | `getById` |
| `tenant_invitation:token:{sha256(rawToken)}` | `getByToken` |

`send` (when revoking stale PENDING invites for the same email), `accept`, `decline`, `revoke`, and `autoAcceptForEmail` all invalidate both keys for the affected invitation. Stale cache of an already-revoked or expired token would defeat the security guarantees, so any status transition clears the cache. `send` additionally clears any negative cache entry for the freshly-minted token.

### Stampede + negative cache

- **TTL jitter** (`jitter(...)`) on every cache write.
- **In-process single-flight** (`singleFlight`) dedupes concurrent loaders.
- **Negative cache** on `getByToken`: unknown tokens are cached as `__not_found__` for `NEGATIVE_CACHE_TTL` (= `min(60, INVITATION_CACHE_TTL)` seconds) — protects against token-guessing attacks on the public invite endpoint.

---

## Security

- Tokens are random 32-byte hex (`generateRawToken`); only the sha256 hash is stored (`token` column) and looked up. The raw token is returned exactly once from `send` and never persisted or echoed back (`SafeTenantInvitation` omits `token`).
- `accept`/`decline` require the authenticated user's email to match the invited email (`INVITATION_EMAIL_MISMATCH`), so a forwarded link cannot be claimed by a different account.
- `send` rejects re-inviting an existing member and supersedes any prior `PENDING` invite to the same email (revoking it), preventing duplicate live tokens.
- All point reads use the negative cache to blunt token-guessing on the public preview/accept endpoint.

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/invitations/settings` (gear button in the Invitations page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `tenant_invitation.settings.fields.ts`. The `env:*` TTLs (`INVITATION_TTL_SECONDS`, `TENANT_CACHE_TTL`) are deployment config and are **not** exposed here.

| Key | Type | Notes |
|---|---|---|
| `invitationNegativeCacheTtlSeconds` | number | Advertised negative-cache TTL (min 60s). **Declared in the settings UI but not wired** — the service uses the hardcoded `NEGATIVE_CACHE_TTL` constant and never reads this key (see *Tenant Variability*). |

Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages per-tenant email-token membership invitations (send/accept/decline/revoke/list plus auto-accept on registration); invitation rows are tenant-scoped and webhooks fire per tenant, but all TTLs/limits are currently global env or hardcoded rather than per-tenant settings.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TenantInvitation` | `tenant_invitations` | email, invitedByUserId, memberRole, token, status, expiresAt |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `tenant_invitation.service.ts:send/accept/decline/revoke` — All write/list paths resolve the per-tenant DB via tenantDataSourceFor(tenantId), so each tenant has its own isolated set of invitation rows; queries are scoped by tenantId.
- `tenant_invitation.service.ts:send/accept/decline/revoke` — Each lifecycle transition calls WebhookService.dispatchEvent(tenantId, 'invitation.*', ...), so webhook delivery (endpoints/secrets) is driven by the target tenant's webhook config.
- `tenant_invitation.service.ts:accept/autoAcceptForEmail` — On accept, TenantMemberService.create runs against the invitation's tenant with invitation.memberRole, granting membership in that specific tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| invitationNegativeCacheTtlSeconds is declared as a tenant-editable settings field (and documented in README/settings page) but the service never reads it; the negative-cache TTL is hardcoded as NEGATIVE_CACHE_TTL = Math.min(60, INVITATION_CACHE_TTL). | `tenant_invitation.service.ts (NEGATIVE_CACHE_TTL const) / tenant_invitation.settings.fields.ts (TENANT_INVITATION_SETTINGS_FIELDS)` | The UI advertises a per-tenant control that is not wired to any SettingService.getValue read, so the setting has no effect; either wire it through per tenant or it is dead metadata. Low real-world tenant value (anti-token-guessing knob), but it is an explicit declared-not-wired gap. | `invitationNegativeCacheTtlSeconds` |
| Invitation expiry window is a single global env value (7 days default) applied to every tenant. | `tenant_invitation.service.ts (INVITATION_TTL_SECONDS const, used in send())` | Tenants commonly want different invite link lifetimes (e.g. stricter security tenants want 24h); today it is deployment-wide env, not per tenant. | `invitationTtlSeconds` |
| Positive cache TTL for invitations is global env (TENANT_CACHE_TTL, 5 min default) shared across all tenants. | `tenant_invitation.service.ts (INVITATION_CACHE_TTL const, used in getById/getByToken)` | Intentionally global shared-infra caching tuning; listing for completeness but it is reasonable to keep deployment-wide rather than per-tenant. | — |

---

## Dependencies

`db`, `tenant`, `tenant_member` (membership on accept), `notification_mail` (invite email), `user` (existing-user lookup), `env`, plus `redis` (caching) and `webhook` (lifecycle event dispatch). Invitation caps are enforced through `tenant_subscription` at the route layer.
