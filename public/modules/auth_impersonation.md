# Admin Impersonation

- **id:** `auth_impersonation`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/auth_impersonation/`
- **tags:** identity, auth, admin
- **icon:** `fas fa-user-secret`
- **hasNextLayer:** false

Allow a system admin to assume a target user's session (always audited).

## Dependencies

- **requires:** `user`, `user_session`, `audit_log`, `env`

## Services

- `impersonation.service.ts`

## DTOs

- `impersonation.dto.ts`

## Message keys

- `impersonation.messages.ts`

## README

# auth_impersonation module

Enables admins and super-admins to impersonate other users for testing and support. Validates role hierarchy, creates tracked sessions, and logs all impersonation actions to the audit log.

---

## Files

| File | Purpose |
|---|---|
| `impersonation.service.ts` | Core logic: start/stop impersonation, role validation |
| `impersonation.dto.ts` | `StartImpersonationDTO` |
| `impersonation.messages.ts` | Error/success message strings |

---

## Role Hierarchy

- `SUPER_ADMIN` can impersonate `ADMIN`, `USER`, `GUEST`
- `ADMIN` can impersonate `USER`, `GUEST`
- No one can impersonate a peer or superior role

---

## Usage

```typescript
import ImpersonationService from '@/modules/auth_impersonation/impersonation.service';

// Start impersonation
const session = await ImpersonationService.start({
  adminId: currentUserId,
  targetUserId: userToImpersonate,
  reason: 'Support ticket #1234',
});
// Returns a session with impersonation metadata

// Stop impersonation (reverts to original session)
await ImpersonationService.stop(sessionId);
```

---

## Audit Trail

Every impersonation start/stop is logged to the audit log with `actorId`, `targetUserId`, and `reason`. Logs are queryable via the audit log API.

---

## API Routes

```
POST /api/auth/impersonation/start
POST /api/auth/impersonation/stop
```

Requires `system:admin` scope.
