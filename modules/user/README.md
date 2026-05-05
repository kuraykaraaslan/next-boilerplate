# user module

System user management: CRUD operations, password hashing with bcrypt, role-based access, and soft deletion.

---

## Files

| File | Purpose |
|---|---|
| `user.service.ts` | Core: create, get, update, delete, list |
| `user.types.ts` | `User`, `SafeUser` types |
| `user.dto.ts` | Zod DTOs |
| `user.enums.ts` | `UserRole`, `UserStatus` enums |
| `user.messages.ts` | Error/success message strings |
| `entities/user.entity.ts` | TypeORM entity |
| `ui/user.menu.tsx` | User dropdown menu |
| `ui/user.profile-card.tsx` | Profile display card |
| `ui/user.profile-form.tsx` | Profile edit form |
| `ui/user.preferences-form.tsx` | Preferences edit form |
| `ui/user.role-badge.tsx` | Role label badge |
| `ui/user.status-badge.tsx` | Status label badge |
| `ui/user.social-accounts-panel.tsx` | Linked social accounts list |

---

## Roles

| Role | Access level |
|---|---|
| `SUPER_ADMIN` | Full system access |
| `ADMIN` | System admin, cannot manage super admins |
| `USER` | Standard user |
| `GUEST` | Read-only limited access |

## Status

| Status | Meaning |
|---|---|
| `ACTIVE` | Normal access |
| `INACTIVE` | Disabled |

---

## SafeUser vs User

`User` includes the hashed password and soft-delete date — never return this from API responses. `SafeUser` omits both and is safe to serialize.

---

## Usage

```typescript
import UserService from '@/modules/user/user.service';

// Create
const user = await UserService.create({
  email: 'alice@example.com',
  password: 'secret123',  // hashed automatically
  role: 'USER',
});

// Get (returns SafeUser)
const user = await UserService.getById(userId);
const user = await UserService.getByEmail(email);

// Update
await UserService.update(userId, { phone: '+905551234567' });

// Soft delete
await UserService.delete(userId);
```

---

## API Routes

```
GET    /system/api/users
GET    /system/api/users/[id]
POST   /system/api/users
PUT    /system/api/users/[id]
DELETE /system/api/users/[id]
```

Requires `system:admin` scope.
