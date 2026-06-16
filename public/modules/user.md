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

- `user.admin.service.ts`
- `user.crud.service.ts`
- `user.read.service.ts`
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

- `User` (system) — `modules/user/server/entities/user.entity.ts`

## Next layer (modules_next/) surface

- `user/ui/me.page` _(ui, client)_
- `user/ui/social-accounts-panel.component` _(ui, client)_
- `user/ui/user-detail-columns` _(ui)_
- `user/ui/user-detail.types` _(ui)_
- `user/ui/user-edit-modal.component` _(ui, client)_
- `user/ui/user-list-columns.component` _(ui, client)_
- `user/ui/user-menu.component` _(ui, client)_
- `user/ui/user-preferences-form.component` _(ui, client)_
- `user/ui/user-profile-card.component` _(ui, client)_
- `user/ui/user-profile-form.component` _(ui, client)_
- `user/ui/user-role-badge.component` _(ui, client)_
- `user/ui/user-status-badge.component` _(ui, client)_
- `user/ui/users-user-id.page` _(ui, client)_
- `user/ui/users.page` _(ui, client)_

## README

# User Module

Core system user management: CRUD operations, password hashing with bcrypt, role/status, and Redis caching on the login hot path. Users are platform-wide (no `tenantId`) and managed only by root-tenant admins. Foundation for every auth and tenancy flow.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `User` | `users` | Platform-wide user account (email, hashed password, phone, role, status, email-verification + soft-delete timestamps) |

System-scoped — the `User` entity has **no `tenantId` column**, so it lives in the **system DB** and is never partitioned per tenant. Soft deletes use TypeORM's `@DeleteDateColumn` (`deletedAt`). `email` is unique and indexed; `phone` is indexed.

---

## Files

| File | Purpose |
|---|---|
| `user.service.ts` | Core: `create`, `getAll`, `getById`, `getByEmail`, `update`, `delete`, `invalidate` |
| `user.types.ts` | `User`, `SafeUser`, `UpdateUser` types + Zod schemas (`UserSchema`, `SafeUserSchema`, `UpdateUserSchema`) |
| `user.dto.ts` | Request/query Zod DTOs (create, update, list, get, delete) |
| `user.enums.ts` | `UserRoleEnum`, `UserStatusEnum` (+ `UserRole`, `UserStatus` types) |
| `user.messages.ts` | Error/success message string enum |
| `user.seed.ts` | Demo seed — 3 system-scoped users covering every role + status |
| `entities/user.entity.ts` | TypeORM entity (`users` table) |
| `module.json` | Module manifest (deps: `db`, `env`, `logger`, `common`) |

---

## Roles

| Role | Meaning |
|---|---|
| `USER` | Standard user (default) |
| `ADMIN` | Elevated user. A root-tenant `ADMIN` is effectively a super-admin |

`userRole` defaults to `USER` on create.

## Status

| Status | Meaning |
|---|---|
| `ACTIVE` | Normal access (default) |
| `INACTIVE` | Disabled |
| `SUSPENDED` | Suspended — transitioning into this status fires a `user.suspended` webhook |

`userStatus` defaults to `ACTIVE` on create.

---

## SafeUser vs User

`User` includes the hashed `password` and the soft-delete date (`deletedAt`) — never return this from API responses. `SafeUser` omits both and optionally carries an attached `userProfile`; it is safe to serialize. `getByEmail` returns the full `User` (hashed password included) because it backs the login/auth hot path; every other read returns `SafeUser`.

---

## Usage

```typescript
import UserService from '@/modules/user/user.service';

// Create — password hashed automatically (bcrypt, 10 rounds)
const user = await UserService.create({
  email: 'alice@example.com',
  password: 'secret123',
  userRole: 'USER',          // optional, defaults to 'USER'
});

// Read
const safe = await UserService.getById(userId);           // SafeUser (throws if missing)
const full = await UserService.getByEmail(email);         // User | null (login hot path)
const { users, total } = await UserService.getAll({ page: 0, pageSize: 10, search });

// Update (email/phone/role/status)
await UserService.update({ userId, data: { phone: '+905551234567' } });

// Hard delete (also clears caches + fires user.deleted)
await UserService.delete(userId);
```

---

## API Routes

All routes are mounted under the root tenant and require **root-tenant admin** scope (`authenticateAdminRequest`); requests are rate-limited via `Limiter`.

```
GET    /tenant/00000000-0000-4000-8000-000000000000/api/users
POST   /tenant/00000000-0000-4000-8000-000000000000/api/users
GET    /tenant/00000000-0000-4000-8000-000000000000/api/users/[userId]
PUT    /tenant/00000000-0000-4000-8000-000000000000/api/users/[userId]
DELETE /tenant/00000000-0000-4000-8000-000000000000/api/users/[userId]
GET    /tenant/00000000-0000-4000-8000-000000000000/api/users/[userId]/tenants
GET    /tenant/00000000-0000-4000-8000-000000000000/api/users/[userId]/impersonation-sessions
```

| Route | Description |
|---|---|
| `GET /users` | Paginated list (`page`, `pageSize`, `search` by email) |
| `POST /users` | Create user (`CreateUserRequestSchema`) |
| `GET /users/[userId]` | Fetch a single `SafeUser` |
| `PUT /users/[userId]` | Update email/phone/role/status (`UpdateUserRequestSchema`) |
| `DELETE /users/[userId]` | Delete user |
| `GET /users/[userId]/tenants` | List the user's tenant memberships (`TenantMemberService.getUserTenants`) |
| `GET /users/[userId]/impersonation-sessions` | List the user's impersonation sessions (from `user_session`); `page`, `pageSize`, `activeOnly` |

---

## Webhook events

`user.service.ts` emits platform-wide webhooks via `WebhookService.dispatchPlatformEvent` (fire-and-forget) after each mutation:

| Method | Event(s) |
|---|---|
| `create` | `user.created` |
| `update` | `user.updated`, plus `user.suspended` when status transitions into `SUSPENDED` |
| `delete` | `user.deleted` |

These route to root-tenant webhooks. See `modules/webhook/README.md`.

---

## Caching

Users are cached in Redis (TTL = `SESSION_CACHE_TTL`, default 5 min):

| Key | Returns | Used by |
|---|---|---|
| `user:id:{userId}` | `SafeUser` | `getById` |
| `user:email:{email}` | `User` (with hashed password) | `getByEmail` — login hot path |

Emails are lower-cased before keying. `update`, `delete`, and `invalidate()` clear both keys. When email changes during `update`, **both** the old-email and new-email keys are invalidated.

### Cross-module invalidation

Password changes happen outside this module. Any service that mutates `user.password` (e.g. `auth.password.service.ts`) **must** call `UserService.invalidate({ userId, email })` afterward — otherwise the cached `getByEmail` row will still authenticate against the old password until TTL expires.

Already wired: `auth.password.service.resetPassword`. New writers must follow the same pattern.

### Stampede + negative cache

- **TTL jitter** (`jitter()`) on every cache write.
- **In-process single-flight** (`singleFlight`) dedupes concurrent loaders for the same key.
- **Negative cache** on `getByEmail`: unknown emails are cached as `__not_found__` for up to `min(60s, TTL)` — blunts email-enumeration / login-stuffing. `create` clears the negative key so a brand-new user can log in immediately.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Core system user management (CRUD, authentication, role/status) with no tenant variability; all users are platform-wide and accessible only to root-tenant admins.

---

## Dependencies

Requires `db`, `env`, `logger`, `common`. Also uses `redis` (caching/single-flight), `bcrypt` (password hashing), and `webhook` (`WebhookService.dispatchPlatformEvent`). The `[userId]/tenants` route delegates to `tenant_member`, and `[userId]/impersonation-sessions` reads from `user_session`.
