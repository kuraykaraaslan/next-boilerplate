# User

- **id:** `user`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/user/`
- **tags:** identity, core
- **icon:** `fas fa-user`
- **hasNextLayer:** true

Core user CRUD: create, find, update, deactivate. Foundation for every auth and tenancy flow.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`

## Services

- `user.service.ts`

## DTOs

- `user.dto.ts`

## Entities

- `user.entity.ts`

## Enums

- `user.enums.ts`

## Message keys

- `user.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/users`
- `tenant` GET/PUT/DELETE `/tenant/[tenantId]/api/users/[userId]`
- `tenant` GET `/tenant/[tenantId]/api/users/[userId]/impersonation-sessions`
- `tenant` GET `/tenant/[tenantId]/api/users/[userId]/tenants`

## TypeORM entities

- `User` (system) — `modules/user/entities/user.entity.ts`

## Next layer (modules_next/) surface

- `user/ui/SocialAccountsPanel` _(ui, client)_
- `user/ui/UserMenu` _(ui, client)_
- `user/ui/UserPreferencesForm` _(ui, client)_
- `user/ui/UserProfileCard` _(ui, client)_
- `user/ui/UserProfileForm` _(ui, client)_
- `user/ui/UserRoleBadge` _(ui, client)_
- `user/ui/UserStatusBadge` _(ui, client)_

## README

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
| `ADMIN` | Super-admin (root tenant ADMIN), cannot manage super admins |
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
GET    /tenant/00000000-0000-4000-8000-000000000000/api/users
GET    /tenant/00000000-0000-4000-8000-000000000000/api/users/[id]
POST   /tenant/00000000-0000-4000-8000-000000000000/api/users
PUT    /tenant/00000000-0000-4000-8000-000000000000/api/users/[id]
DELETE /tenant/00000000-0000-4000-8000-000000000000/api/users/[id]
```

Requires `root-tenant admin` scope.

---

## Caching

Users are cached in Redis (TTL = `SESSION_CACHE_TTL`, default 30 min):

| Key | Returns | Used by |
|---|---|---|
| `user:id:{userId}` | `SafeUser` | `getById` |
| `user:email:{email}` | `User` (with hashed password) | `getByEmail` — login hot path |

`update`, `delete`, and `invalidate()` clear both keys. When email changes during `update`, **both** the old-email and new-email keys are invalidated.

### Cross-module invalidation

Password changes happen outside this module. Any service that mutates `user.password` (e.g. `auth.password.service.ts`) **must** call `UserService.invalidate({ userId, email })` afterward — otherwise the cached `getByEmail` row will still authenticate against the old password until TTL expires.

Already wired: `auth.password.service.resetPassword`. New writers must follow the same pattern.

### Stampede + negative cache

- **TTL jitter (±10%)** on every cache write.
- **In-process single-flight** dedupes concurrent loaders for the same user.
- **Negative cache** on `getByEmail`: unknown emails are cached as `__not_found__` for up to 60s — blunts email-enumeration / login-stuffing. `create` clears the negative key so a brand-new user can log in immediately.
