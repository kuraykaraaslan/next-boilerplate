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
