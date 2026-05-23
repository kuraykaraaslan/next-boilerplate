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

- `scim.service.ts`

## DTOs

- `scim.dto.ts`

## Message keys

- `scim.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/scim/v2/Groups`
- `tenant` GET/PUT/PATCH/DELETE `/tenant/[tenantId]/api/scim/v2/Groups/[scimGroupId]`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/ResourceTypes`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/Schemas`
- `tenant` GET `/tenant/[tenantId]/api/scim/v2/ServiceProviderConfig`
- `tenant` GET/POST `/tenant/[tenantId]/api/scim/v2/Users`
- `tenant` GET/PUT/PATCH/DELETE `/tenant/[tenantId]/api/scim/v2/Users/[scimUserId]`

## README

# SCIM 2.0

System for Cross-domain Identity Management — RFC [7643] (core schema) and
RFC [7644] (protocol). Lets enterprise IdPs auto-provision and deprovision
members of a tenant.

[7643]: https://datatracker.ietf.org/doc/html/rfc7643
[7644]: https://datatracker.ietf.org/doc/html/rfc7644

## Scope

- **Users**: list, get, create, replace, patch, soft-delete.
- **Groups**: stubbed (empty list, `501` on writes). Almost all IdPs run
  "users-only" SCIM profiles, and tying SCIM Groups to our tenant role
  model deserves its own design pass.
- **Discovery**: `ServiceProviderConfig`, `ResourceTypes`, `Schemas`.

## Mapping

| SCIM attribute                  | Internal field                         |
| ------------------------------- | --------------------------------------- |
| `User.id`                       | `TenantMember.tenantMemberId`           |
| `User.userName`                 | `User.email`                            |
| `User.externalId`               | `TenantMember.externalId`               |
| `User.emails[primary].value`    | `User.email`                            |
| `User.active`                   | `TenantMember.memberStatus` (`ACTIVE`/`INACTIVE`) |
| `meta.location`                 | `/tenant/{tenantId}/api/scim/v2/Users/{id}` |
| `meta.version`                  | Weak ETag derived from `updatedAt`      |

Deletion is a **soft delete** on `TenantMember` — the cross-tenant `User`
row is never removed because other tenants may still depend on it.

## Authentication

All endpoints require `Authorization: Bearer <api-key>` (RFC 7644 §2). The
key must:

1. Belong to the tenant in the URL.
2. Carry the `scim:read` scope (GETs) or `scim:write` scope (POST/PUT/PATCH/DELETE).

Create a key from the tenant admin UI or:

```bash
curl -X POST /tenant/$TENANT_ID/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Okta SCIM","scopes":["scim:read","scim:write"]}'
```

The raw key (`sk_live_…`) is returned **once**.

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

## Supported filters

Only equality on `userName` and `externalId`:

```
?filter=userName eq "alice@example.com"
?filter=externalId eq "okta-123"
```

Anything else returns `400 invalidFilter` per RFC 7644 §3.4.2.2.

## Pagination

SCIM uses **1-based** `startIndex`. Defaults: `startIndex=1`, `count=100`,
max `count=200`. We translate to TypeORM `skip = startIndex - 1`.
