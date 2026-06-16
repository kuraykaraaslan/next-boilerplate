# Tenant Member

- **id:** `tenant_member`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_member/`
- **tags:** tenant
- **icon:** `fas fa-users`
- **hasNextLayer:** false

Tenant-scoped membership join table with roles (owner/admin/member) and per-member permissions.

## Dependencies

- **requires:** `db`, `tenant`, `user`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/members`
- `tenant` GET/PUT/DELETE `/tenant/[tenantId]/api/members/[memberId]`

## TypeORM entities

- `TenantMember` (tenant) — `modules/tenant_member/server/entities/tenant_member.entity.ts`

## README

# Tenant Member Module

Tenant membership management with role-based access control. Maintains the per-tenant join table linking a user to a tenant with a role and status, enforces a role hierarchy, prevents demoting/removing the last owner, supports search by email, and soft-deletes members. Membership changes dispatch `member.*` webhooks.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `TenantMember` | `tenant_members` | Membership record linking a `userId` to a `tenantId` with `memberRole`, `memberStatus`, optional SCIM `externalId`, and `sessionVersion`. Unique on `(tenantId, userId)`; soft-deleted via `deletedAt`. |

Lives in the **tenant DB** (resolved via `tenantDataSourceFor(tenantId)`). User records it joins to live in the **system DB**.

---

## Roles

| Role | Permissions |
|---|---|
| `OWNER` | Full control, can manage admins |
| `ADMIN` | Manage members, settings, billing |
| `USER` | Standard access |

Role changes are restricted by hierarchy (`ROLE_HIERARCHY = ['OWNER','ADMIN','USER']`) — you cannot promote someone to a role equal to or above your own. The route layer also forbids non-owners from modifying or removing owners.

## Member Status

| Status | Meaning |
|---|---|
| `ACTIVE` | Normal access |
| `INACTIVE` | Disabled by admin |
| `SUSPENDED` | Policy violation |
| `PENDING` | Invited but not yet accepted |

Enums are defined in `tenant_member.enums.ts` (`TenantMemberRoleEnum`, `TenantMemberStatusEnum`).

---

## Files

| File | Purpose |
|---|---|
| `tenant_member.service.ts` | Core service: list/get, create, update, delete (soft), permission checks |
| `tenant_member.types.ts` | `TenantMemberSchema` / `SafeTenantMemberSchema` (Zod) and inferred types |
| `tenant_member.dto.ts` | Zod DTOs for create/update/get/list inputs |
| `tenant_member.enums.ts` | `TenantMemberRoleEnum`, `TenantMemberStatusEnum` |
| `tenant_member.messages.ts` | Error/success message strings |
| `tenant_member.settings.fields.ts` | UI field metadata for the Members settings page |
| `tenant_member.seed.ts` | Demo seed data |
| `entities/tenant_member.entity.ts` | TypeORM entity |

---

## Service (`TenantMemberService`)

All methods are `static`. Tenant-scoped reads/writes resolve the per-tenant DataSource via `tenantDataSourceFor(tenantId)`; user lookups use the system `getDataSource()`.

| Method | Responsibility |
|---|---|
| `getByTenantId({ tenantId, page, pageSize, search, memberRole, memberStatus })` | Paginated, filtered list of a tenant's members. `search` matches user email (ILIKE) against the system user table, then filters member rows by the matching `userId`s. Hydrates each member with its `user`. Returns `{ members, total }`. |
| `getById(tenantMemberId)` | Fetch a single member by id from the system DataSource; throws `MEMBER_NOT_FOUND` if missing. |
| `getByTenantAndUser({ tenantMemberId, tenantId, userId })` | Resolve a member by id (validated against tenant/user) or by `(tenantId, userId)`; returns `null` if not found. |
| `create(data)` | Enforces the unique `(tenantId, userId)` membership (throws `MEMBER_ALREADY_EXISTS`), persists, and dispatches the `member.created` webhook to the member's tenant. |
| `update(tenantMemberId, data)` | Updates role/status (skips `null` fields). Guards against demoting the last `OWNER` (`CANNOT_DEMOTE_OWNER`), increments `sessionVersion`, busts the Redis cache `tenant:member:<userId>:<tenantId>`, and dispatches `member.updated`. |
| `delete(tenantMemberId)` | Soft-deletes (`deletedAt`). Guards against removing the last `OWNER` (`LAST_OWNER`) and dispatches `member.deleted`. |
| `getUserTenants(userId)` | Lists a user's `ACTIVE`, non-deleted memberships across all tenants. |
| `hasRole(member, requiredRole)` | Pure hierarchy check against `ROLE_HIERARCHY`. |
| `checkPermission(tenantId, userId, requiredRole)` | Looks up the caller's `ACTIVE` member row in the tenant's own DataSource and gates by `hasRole`. Returns `false` if no membership. |

---

## API Routes

Tenant-scoped under `/tenant/[tenantId]/api/members`. All routes rate-limit and authenticate via `TenantSessionNextService.authenticateTenantByRequest`.

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/tenant/[tenantId]/api/members` | USER | List members (`?page=&pageSize=&search=&memberRole=&memberStatus=`) |
| POST | `/tenant/[tenantId]/api/members` | ADMIN | Add a member (after `assertFeatureAccess` on `MAX_MEMBERS`) |
| GET | `/tenant/[tenantId]/api/members/[memberId]` | USER | Get one member (404 if not in this tenant) |
| PUT | `/tenant/[tenantId]/api/members/[memberId]` | ADMIN | Update role/status; non-owners cannot modify owners |
| DELETE | `/tenant/[tenantId]/api/members/[memberId]` | ADMIN | Soft-remove; non-owners cannot remove owners; an owner cannot remove themselves |

The POST handler enforces the member limit via `tenant_subscription` feature `MAX_MEMBERS` (`assertFeatureAccess`). PUT/DELETE clear the session cache via `TenantSessionNextService.clearTenantCache`.

Self-registration into a tenant is handled by `POST /tenant/[tenantId]/api/auth/register`, which calls `TenantMemberService.create` for the new user (see *Settings* and *Tenant Variability*).

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
await TenantMemberService.update(memberId, { memberRole: 'ADMIN', memberStatus: null });

// Soft-remove member
await TenantMemberService.delete(memberId);

// Gate an action by role
const ok = await TenantMemberService.checkPermission(tenantId, userId, 'ADMIN');
```

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/members/settings` (gear button in the Members page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `tenant_member.settings.fields.ts`.

| Key | Type | Default | Notes |
|---|---|---|---|
| `defaultMemberRole` | select (`USER` \| `ADMIN`) | `USER` | Role assigned to new members on join / invitation accept. `OWNER` is intentionally excluded. The registration route passes `settings['defaultMemberRole'] \|\| 'USER'` to `create`, but currently fetches only `allowSelfRegistration` from `SettingService.getByKeys`, so the configured value is not yet read (see *Tenant Variability* → Candidates). |

Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages per-tenant membership records (linking a user to a tenant with a role and status), with a per-tenant default-member-role setting and role-hierarchy permission checks resolved against each tenant's own member rows.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `defaultMemberRole` | string | `USER` | tenant | Role assigned to a new member when they self-register / accept an invitation into the tenant. Declared in settings.fields with a USER/ADMIN select; the registration route reads it (settings['defaultMemberRole'] \|\| 'USER') and passes it as memberRole to TenantMemberService.create. NOTE: the read is currently incompletely wired (see candidates) so it effectively defaults to USER today. | `route.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TenantMember` | `tenant_members` | memberRole, memberStatus, externalId |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `tenant_member.service.ts:checkPermission` — Resolves the caller's role from the per-tenant member row via tenantDataSourceFor(tenantId), then gates by ROLE_HIERARCHY (OWNER>ADMIN>USER) — so the same user can hold different roles/permissions in different tenants.
- `tenant_member.service.ts:getByTenantId` — Lists/paginates members scoped to one tenant via tenantDataSourceFor(tenantId); each tenant sees only its own membership rows.
- `tenant_member.service.ts:create` — Enforces a per-tenant unique (tenantId,userId) membership and dispatches the 'member.created' webhook to that tenant's subscribers (WebhookService.dispatchEvent(saved.tenantId, ...)); update/delete likewise scope owner-count guards and webhooks to member.tenantId.
- `route.ts:register POST` — Self-registration is gated per tenant by the allowSelfRegistration setting, and the joining member's role is taken from the tenant's defaultMemberRole setting (falling back to USER).

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| defaultMemberRole is declared and intended to drive the join/invitation role, but the registration route only fetches allowSelfRegistration via SettingService.getByKeys(tenantId, ['allowSelfRegistration']), so settings['defaultMemberRole'] is always undefined and the role silently falls back to 'USER' regardless of the tenant's configured value. | `route.ts (register POST, line 30 getByKeys + line 59 defaultRole)` | The per-tenant setting exists in tenant_member.settings.fields.ts and is surfaced in the UI/README, but is not actually read with its key, so a tenant admin's configured default role has no effect — a wiring gap, not an intentional global. | `defaultMemberRole` |
| ROLE_HIERARCHY (['OWNER','ADMIN','USER']) and thus the entire permission model is a hardcoded static constant in the service, identical for every tenant. | `tenant_member.service.ts (TenantMemberService.ROLE_HIERARCHY, hasRole/checkPermission)` | Likely intentionally global since role semantics are a core invariant of the auth model; only worth surfacing if custom per-tenant roles/RBAC ever become a product requirement. | — |

---

## Dependencies

- `db` — system + per-tenant DataSources (`getDataSource`, `tenantDataSourceFor`)
- `tenant`, `user` — tenants joined and users hydrated into member rows
- `redis` — busts the `tenant:member:<userId>:<tenantId>` cache on update
- `webhook` — dispatches `member.created/updated/deleted` to the tenant's subscribers
- `tenant_subscription` — `MAX_MEMBERS` feature gate enforced on the add-member route
