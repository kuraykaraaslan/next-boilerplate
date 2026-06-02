# tenant_invitation module

Tenant membership invitations via email token. Auto-accepts pending invitations when a new user registers with a matching email. Tracks status and expiration.

---

## Files

| File | Purpose |
|---|---|
| `tenant_invitation.service.ts` | Core: create, accept, decline, revoke, list |
| `tenant_invitation.types.ts` | `TenantInvitation`, `CreateTenantInvitationInput` |
| `tenant_invitation.dto.ts` | Zod DTOs |
| `tenant_invitation.enums.ts` | `InvitationStatus` enum |
| `tenant_invitation.messages.ts` | Error/success message strings |
| `entities/tenant_invitation.entity.ts` | TypeORM entity |

---

## Invitation Status

| Status | Meaning |
|---|---|
| `PENDING` | Sent, awaiting response |
| `ACCEPTED` | Invitee accepted and is now a member |
| `DECLINED` | Invitee declined |
| `REVOKED` | Admin cancelled the invitation |
| `EXPIRED` | Past expiration date (default: 7 days) |

---

## Usage

```typescript
import TenantInvitationService from '@/modules/tenant_invitation/tenant_invitation.service';

// Send an invitation
const invitation = await TenantInvitationService.create(tenantId, {
  email: 'alice@example.com',
  role: 'USER',
});
// Sends an email automatically via notification_mail

// Accept via token (from email link)
await TenantInvitationService.accept(token, userId);

// Revoke
await TenantInvitationService.revoke(tenantId, invitationId);

// List pending invitations
const { invitations, total } = await TenantInvitationService.list(tenantId, {
  page: 1, pageSize: 20, status: 'PENDING',
});
```

---

## Auto-Accept on Registration

When a new user registers, `AuthService` calls `TenantInvitationService.acceptPendingForEmail(email, userId)` to auto-accept any open invitations matching that email.

---

## API Routes

```
GET    /tenant/[tenantId]/api/invitations
POST   /tenant/[tenantId]/api/invitations
DELETE /tenant/[tenantId]/api/invitations/[id]
POST   /api/invitations/accept
```

Invitation limit enforced via `tenant_subscription` feature `max_invitations`.

---

## Caching

Invitations are cached in Redis (TTL = `TENANT_CACHE_TTL`, default 5 min):

| Key | Used by |
|---|---|
| `tenant_invitation:id:{invitationId}` | `getById` |
| `tenant_invitation:token:{sha256(rawToken)}` | `getByToken` |

`send` (when revoking stale PENDING invites for the same email), `accept`, `decline`, `revoke`, and `autoAcceptForEmail` all invalidate both keys for the affected invitation. Stale cache of an already-revoked or expired token would defeat the security guarantees, so any status transition clears the cache. `send` additionally clears any negative cache entry for the freshly-minted token.

### Stampede + negative cache

- **TTL jitter (±10%)** on every cache write.
- **In-process single-flight** dedupes concurrent loaders.
- **Negative cache** on `getByToken`: unknown tokens are cached as `__not_found__` for up to 60s — protects against token-guessing attacks on the public invite link endpoint.

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/invitations/settings` (gear button in the Invitations page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `tenant_invitation.settings.fields.ts`. `env:*` TTLs (`INVITATION_TTL_SECONDS`, `TENANT_CACHE_TTL`) are deployment config and are **not** exposed here.

| Key | Type | Notes |
|---|---|---|
| `invitationNegativeCacheTtlSeconds` | number | Negative-cache TTL for missing invitations (min 60s). |

Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.
