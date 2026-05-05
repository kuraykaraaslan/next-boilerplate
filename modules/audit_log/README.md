# audit_log module

Immutable event logging for system and tenant-level actions. Records actor, action, resource, metadata, IP, and user agent. Supports querying with pagination.

---

## Files

| File | Purpose |
|---|---|
| `audit_log.service.ts` | Core logic: write and query audit logs |
| `audit_log.types.ts` | `AuditLog`, `CreateAuditLogInput`, `GetAuditLogsInput` |
| `audit_log.dto.ts` | Zod DTOs for API input validation |
| `audit_log.enums.ts` | `ActorType`, `AuditAction` enums |
| `audit_log.messages.ts` | Error/success message strings |
| `entities/` | TypeORM entities (system & tenant logs) |
| `ui/audit_log.filters.tsx` | Filter UI component for admin pages |

---

## Writing a Log

```typescript
import AuditLogService from '@/modules/audit_log/audit_log.service';

await AuditLogService.log({
  actorId: userId,
  actorType: 'USER',
  action: 'INVITE_MEMBER',
  resource: 'tenant_invitation',
  resourceId: invitation.id,
  tenantId,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  metadata: { invitedEmail: dto.email },
});
```

---

## Querying Logs

```typescript
const { logs, total } = await AuditLogService.getByTenant({
  tenantId,
  page: 1,
  pageSize: 20,
  actorId: userId,       // optional
  action: 'INVITE_MEMBER', // optional
});
```

---

## API Routes

```
GET /tenant/[tenantId]/api/audit-logs
GET /system/api/audit-logs
```

Requires `tenant:admin` or `system:admin` scope.
