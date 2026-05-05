# tenant_member module

Tenant membership management with role-based access control. Enforces role hierarchy, prevents demoting the last owner, supports search by email, and soft deletion.

---

## Files

| File | Purpose |
|---|---|
| `tenant_member.service.ts` | Core: add, update role, remove, list, get |
| `tenant_member.types.ts` | `TenantMember`, `CreateTenantMemberInput` |
| `tenant_member.dto.ts` | Zod DTOs |
| `tenant_member.enums.ts` | `MemberRole`, `MemberStatus` enums |
| `tenant_member.messages.ts` | Error/success message strings |
| `entities/tenant_member.entity.ts` | TypeORM entity |

---

## Roles

| Role | Permissions |
|---|---|
| `OWNER` | Full control, can manage admins |
| `ADMIN` | Manage members, settings, billing |
| `USER` | Standard access |

Role changes are restricted by hierarchy — you cannot promote someone to a role equal to or above your own.

## Member Status

| Status | Meaning |
|---|---|
| `ACTIVE` | Normal access |
| `INACTIVE` | Disabled by admin |
| `SUSPENDED` | Policy violation |
| `PENDING` | Invited but not yet accepted |

---

## Usage

```typescript
import TenantMemberService from '@/modules/tenant_member/tenant_member.service';

// List members
const { members, total } = await TenantMemberService.getByTenantId({
  tenantId,
  page: 1,
  pageSize: 20,
  search: 'alice',
  memberRole: 'ADMIN',
  memberStatus: 'ACTIVE',
});

// Change role
await TenantMemberService.updateRole(tenantId, memberId, 'ADMIN', requestingUserId);

// Remove member
await TenantMemberService.remove(tenantId, memberId, requestingUserId);
```

---

## API Routes

```
GET    /tenant/[tenantId]/api/members
PUT    /tenant/[tenantId]/api/members/[id]
DELETE /tenant/[tenantId]/api/members/[id]
```

Member limit enforced via `tenant_subscription` feature `max_members`.
