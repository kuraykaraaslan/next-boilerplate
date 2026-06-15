# SCIM 2.0

- **id:** `scim`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/scim/`
- **tags:** identity, enterprise, provisioning, sso
- **icon:** `fas fa-id-card`
- **hasNextLayer:** false

System for Cross-domain Identity Management (RFC 7643/7644). Lets enterprise IdPs (Okta, Azure AD, OneLogin, Google Workspace) auto-provision and deprovision tenant members.

## Dependencies

- **requires:** `db`, `user`, `tenant_member`, `api_key`, `audit_log`

## Services

- `scim.group.service.ts`
- `scim.policy.service.ts`
- `scim.service.ts`
- `scim.user.service.ts`

## DTOs

- `scim.dto.ts`

## Entities

- `scim_group.entity.ts`
- `scim_group_member.entity.ts`

## Message keys

- `scim.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/scim/v2/Groups`
- `tenant` GET/PUT/PATCH/DELETE `/tenant/[tenantId]/api/scim/v2/Groups/[scimGroupId]`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/Health`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/ResourceTypes`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/Schemas`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/ServiceProviderConfig`
- `tenant` GET/POST `/tenant/[tenantId]/api/scim/v2/Users`
- `tenant` GET/PUT/PATCH/DELETE `/tenant/[tenantId]/api/scim/v2/Users/[scimUserId]`

## TypeORM entities

- `ScimGroup` (system) — `modules/scim/entities/scim_group.entity.ts`
- `ScimGroupMember` (system) — `modules/scim/entities/scim_group_member.entity.ts`

## README

# Scim Module

SCIM 2.0 — System for Cross-domain Identity Management, RFC [7643] (core
schema) and RFC [7644] (protocol). A provisioning bridge that lets enterprise
IdPs (Okta, Azure AD / Entra ID, OneLogin, Google Workspace) auto-provision and
deprovision members of a tenant onto the shared `User` + per-tenant
`TenantMember` model. Every operation is keyed by the request `tenantId` and
routed through the per-tenant DataSource.

[7643]: https://datatracker.ietf.org/doc/html/rfc7643
[7644]: https://datatracker.ietf.org/doc/html/rfc7644

---

## Entities

SCIM owns no tables of its own. It reads/writes two entities owned by other
modules:

| Entity | Table | DB | Description |
|---|---|---|---|
| `User` | `users` | system | Cross-tenant identity. Created (with a throwaway bcrypt password) on first provision; **never** deleted by SCIM. Read from `getDataSource()`. |
| `TenantMember` | `tenant_members` | tenant | Membership row that SCIM provisions/deprovisions. Carries `externalId`, `memberStatus`, `memberRole`. Resolved via `tenantDataSourceFor(tenantId)`. |

A SCIM `User.id` maps to `TenantMember.tenantMemberId`, so the same person can
be provisioned independently across tenants.

---

## Attribute mapping

| SCIM attribute | Internal field |
| ------------------------------- | --------------------------------------- |
| `User.id` | `TenantMember.tenantMemberId` |
| `User.userName` | `User.email` |
| `User.externalId` | `TenantMember.externalId` |
| `User.emails[primary].value` | `User.email` |
| `User.active` | `TenantMember.memberStatus` (`ACTIVE` / `INACTIVE`) |
| `meta.location` | `/tenant/{tenantId}/api/scim/v2/Users/{id}` |
| `meta.version` | Weak ETag (`W/"…"`) derived from `updatedAt` (SHA-1) |

`name.givenName` / `name.familyName` / `displayName` are accepted but **dropped**
(silent no-op) — the `User` entity has no name fields yet. Deletion is a **soft
delete** on `TenantMember` (sets `memberStatus = INACTIVE` and `deletedAt`); the
cross-tenant `User` row is never removed because other tenants may still depend
on it.

---

## Service — `ScimService`

All methods are static and resolve member rows through
`tenantDataSourceFor(tenantId)`, constraining every query with `tenantId` and
`deletedAt: IsNull()`.

| Method | Responsibility |
|---|---|
| `listUsers(tenantId, query)` | Paginated list (RFC 7644 §3.4.2). Supports `eq` filters on `userName` / `externalId`; maps `userName` to a global `User` lookup then constrains by `userId`. |
| `getUser(tenantId, id)` | Fetch one member + its `User`; `404` if missing or tenant-mismatched. |
| `createUser(tenantId, input)` | Find-or-create the shared `User` by email (random bcrypt password — SCIM users sign in via SSO), then create a `TenantMember`. `409 uniqueness` if membership already exists. Defaults `memberRole = 'USER'`, status `ACTIVE` unless `active: false`. Writes a `scim.user.created` audit log. |
| `updateUser(tenantId, id, input)` | Full replace (PUT). Updates email (with cross-user collision check → `409`), `externalId`, `active`. Audit: `scim.user.updated`. |
| `patchUser(tenantId, id, ops)` | Partial update (PATCH). Handles both Azure-style pathless `{ value: { active } }` ops and Okta-style explicit paths (`active`, `userName`, `emails[primary eq true].value`, `externalId`). Name/displayName paths are accepted as no-ops; unknown paths → `400 invalidPath`. Audit: `scim.user.patched`. |
| `deleteUser(tenantId, id)` | Soft-delete the `TenantMember` (deprovision); preserves the `User`. Audit: `scim.user.deleted`. |
| `listGroups(tenantId, query)` | Stub — always returns an empty `ListResponse` (ignores `tenantId`). |

`parseFilter` and `buildMeta`/`toScimUser` are private helpers. Filtering
supports only equality on `userName` and `externalId`; anything else throws
`400 invalidFilter` per RFC 7644 §3.4.2.2.

### Supporting files

- `scim.types.ts` — Zod schemas + types (`ScimUser`, `ScimGroup`,
  `ScimListResponse`, `ScimPatchOperation`, …), the `SCIM_SCHEMAS` URN map,
  `SCIM_CONTENT_TYPE` (`application/scim+json`), `SCIM_ERROR_TYPES`, and
  `SCIM_PAGINATION` (`DEFAULT_START_INDEX 1`, `DEFAULT_COUNT 100`, `MAX_COUNT 200`).
- `scim.dto.ts` — request DTOs: `CreateScimUserDTO`, `UpdateScimUserDTO`,
  `ListScimUsersDTO`, and `PatchScimUserDTO` (re-exported `ScimPatchBodySchema`).
  Unknown fields are silently dropped.
- `scim.errors.ts` — `scimError` / `scimResponse` / `scimNoContent` response
  builders that emit RFC-7644-compliant bodies with the SCIM content type.
- `scim.messages.ts` — human-readable `detail` strings for error bodies.

---

## API Routes

All under `/tenant/{tenantId}/api/scim/v2`. **Tenant-scoped, API-key auth.**

| Method | Path | Scope | Description |
|---|---|---|---|
| GET | `/Users` | `scim:read` | List users (`filter`, `startIndex`, `count`). |
| POST | `/Users` | `scim:write` | Create user → `201` + `Location` + `ETag`. |
| GET | `/Users/{scimUserId}` | `scim:read` | Get a user (+ `ETag`). |
| PUT | `/Users/{scimUserId}` | `scim:write` | Full replace. |
| PATCH | `/Users/{scimUserId}` | `scim:write` | Partial update. |
| DELETE | `/Users/{scimUserId}` | `scim:write` | Deprovision → `204`. |
| GET | `/Groups` | `scim:read` | Empty list (stub). |
| POST | `/Groups` | `scim:write` | `501 Not Implemented`. |
| GET | `/Groups/{scimGroupId}` | `scim:read` | `404` (stub — stops Okta from looping). |
| PUT/PATCH/DELETE | `/Groups/{scimGroupId}` | `scim:write` | `501 Not Implemented`. |
| GET | `/ServiceProviderConfig` | public | Capability discovery (RFC 7643 §5). |
| GET | `/ResourceTypes` | public | `User` + `Group` resource types (RFC 7643 §6). |
| GET | `/Schemas` | public | `User` + `Group` attribute definitions (RFC 7643 §7). |

Discovery endpoints (`ServiceProviderConfig`, `ResourceTypes`, `Schemas`) are
unauthenticated because IdPs typically probe them before exchanging credentials.

---

## Authentication

All `Users` / `Groups` endpoints require `Authorization: Bearer <api-key>`
(RFC 7644 §2), verified by
`ApiKeyService.verifyFromAuthHeader(request, tenantId, scope)`. The key must:

1. Belong to the tenant in the URL (`key.tenantId === tenantId`).
2. Carry the `scim:read` scope (GETs) or `scim:write` scope (POST/PUT/PATCH/DELETE).

Any failure returns `401` with an `INVALID_BEARER_TOKEN` SCIM error body.

Create a key from the tenant admin UI (Settings → SCIM Provisioning) or:

```bash
curl -X POST /tenant/$TENANT_ID/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Okta SCIM","scopes":["scim:read","scim:write"]}'
```

The raw key (`sk_live_…`) is returned **once**.

---

## Quick start — Okta

1. *Applications → your app → Provisioning → Integration → To App*.
2. **SCIM connector base URL**: `https://app.example.com/tenant/<TENANT_ID>/api/scim/v2`
3. **Unique identifier field**: `userName`
4. **Authentication mode**: HTTP Header `Authorization: Bearer <key>`
5. Enable *Create Users*, *Update User Attributes*, *Deactivate Users*.

## Quick start — Azure AD (Entra ID)

1. *Enterprise applications → your app → Provisioning → Edit attribute mappings*.
2. **Tenant URL**: `https://app.example.com/tenant/<TENANT_ID>/api/scim/v2`
3. **Secret token**: paste the raw key.
4. *Test connection* → save.

---

## Supported filters

Only equality on `userName` and `externalId`:

```
?filter=userName eq "alice@example.com"
?filter=externalId eq "okta-123"
```

Anything else returns `400 invalidFilter` per RFC 7644 §3.4.2.2.

## Pagination

SCIM uses **1-based** `startIndex`. Defaults: `startIndex=1`, `count=100`,
max `count=200` (`SCIM_PAGINATION` in `scim.types.ts`). We translate to TypeORM
`skip = startIndex - 1`.

---

## Settings

This module exposes **no per-tenant settings keys**. The Settings → *SCIM
Provisioning* admin page (`/tenant/[tenantId]/admin/settings/scim`, `PlatformScimTab`)
is purely an onboarding surface: it shows the tenant's SCIM base URL and lets an
admin mint/revoke SCIM-scoped API keys (it lists `api-keys` whose scopes start
with `scim:`). The pagination caps in `SCIM_PAGINATION` are hardcoded constants,
not configurable settings.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A SCIM 2.0 provisioning bridge that lets enterprise IdPs auto-provision/deprovision tenant members onto the User + TenantMember model; it is structurally tenant-scoped (every operation keyed by the request tenantId and routed through tenantDataSourceFor) but exposes no per-tenant settings of its own.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TenantMember` | `tenant_members` | externalId, memberStatus, memberRole |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `scim.service.ts` — All CRUD (listUsers/getUser/createUser/updateUser/patchUser/deleteUser) resolves TenantMember rows via tenantDataSourceFor(tenantId) and constrains every query with where.tenantId, so each tenant provisions and deprovisions its own member set in its own DB; the shared User row is read from getDataSource() and never deleted because other tenants may depend on it.
- `scim.service.ts:createUser` — Membership uniqueness is enforced per tenant (existing lookup on tenantId+userId), and externalId uniqueness is per-tenant via the (tenantId, externalId) index on TenantMember, so the same IdP-provisioned person can co-exist independently across tenants.
- `Users/route.ts` — SCIM access is gated per tenant by ApiKeyService.verifyFromAuthHeader(request, tenantId, 'scim:read'|'scim:write'); the bearer API key must belong to the URL's tenantId (key.tenantId === tenantId) and carry the scim scope, so whether SCIM is usable at all depends on each tenant minting a scoped API key.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| SCIM pagination caps (DEFAULT_COUNT 100, MAX_COUNT 200) and the filter maxResults advertised in ServiceProviderConfig are hardcoded constants applied to every tenant | `scim.types.ts:SCIM_PAGINATION (consumed in scim.service.ts:listUsers and ServiceProviderConfig/route.ts)` | Large enterprise tenants may need higher page sizes while smaller tenants benefit from tighter caps; today the limit is global and not tenant-tunable | `scimMaxPageCount` |
| Groups endpoints are permanently stubbed to return an empty list for all tenants (listGroups ignores tenantId) | `scim.service.ts:listGroups` | Some tenants' IdP profiles require SCIM Groups; a per-tenant feature gate would let group provisioning be enabled selectively rather than globally disabled | `scimGroupsEnabled` |
| Inbound SCIM name fields (name.givenName / name.familyName / displayName) are silently accepted and dropped for every tenant | `scim.service.ts:patchUser (and createUser/updateUser ignoring input.name)` | Tenants that map IdP display-name attributes expect them persisted; whether to store/sync names could be a per-tenant provisioning policy rather than a hardcoded no-op | `scimSyncUserNames` |
| Default role/status for SCIM-provisioned members is hardcoded (memberRole 'USER', User.userRole 'USER', status ACTIVE unless active:false) | `scim.service.ts:createUser` | A tenant may want IdP-provisioned members to land in a specific default role or in a pending/invited state; this default is global today | `scimDefaultMemberRole` |

---

## Dependencies

`requires`: `db`, `user`, `tenant_member`, `api_key`, `audit_log`. SCIM also
writes a `scim.user.*` entry through `AuditLogService` on every create/update/
patch/delete.
