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
