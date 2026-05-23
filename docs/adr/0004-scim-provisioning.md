# ADR 0004 — SCIM 2.0 provisioning + SAML JIT

**Status:** Accepted (2026-05)

## Context

A multi-tenant SaaS sold to enterprises must accept user provisioning from the customer's identity provider (Okta, Azure AD, OneLogin, Google Workspace, Ping). Two industry-standard mechanisms exist:

- **SCIM 2.0** (RFC 7643/7644) — IdP pushes user create/update/delete to our API via REST. The IdP holds the user master record; our `User` + `TenantMember` rows stay synchronized.
- **SAML Just-In-Time (JIT) provisioning** — on first successful SAML login for an unknown email, the SP (us) auto-creates the user + membership from SAML assertion attributes.

Both are table stakes for enterprise contracts. Without them an admin has to manually onboard every employee — unacceptable at 1000-seat scale.

## Decision

**SCIM 2.0** is implemented as a tenant-scoped REST surface at

```
/tenant/{tenantId}/api/scim/v2/{ServiceProviderConfig,Schemas,ResourceTypes,Users,Groups}
```

following the path convention the rest of the boilerplate uses. Authentication is a Bearer API key with the `scim:write` (or `scim:read`) scope — the existing `ApiKey` entity already carries `scopes: string[]`, so SCIM tokens are just API keys with a specific scope. Tenant admins generate them from the **Integrations → SCIM Provisioning** tab in Settings; the IdP receives the endpoint URL + token pair.

Resource mapping:

| SCIM concept | Our entity |
|---|---|
| `User.id` | `TenantMember.tenantMemberId` |
| `User.externalId` | `TenantMember.externalId` (new column, IdP's GUID) |
| `User.userName` | `User.email` |
| `User.name.{given,family,formatted}` | (mirrored into `UserProfile` if present) |
| `User.active` | `TenantMember.memberStatus` (`ACTIVE` ↔ `INACTIVE`) |
| `User.meta` | derived from `TenantMember.created/updatedAt` |
| `Group` | stub — most IdPs work users-only; full Group support deferred |

DELETE on a SCIM user **deactivates** the `TenantMember` (`INACTIVE`); the global `User` row is never touched, because that user may belong to other tenants.

**SAML JIT** is opt-in per tenant via two new `SamlConfig` columns:
- `allowJitProvisioning: boolean` (default `false`)
- `defaultMemberRole: string | null` (default `'USER'`)
- `roleAttribute: string | null` — name of the SAML attribute carrying the role claim; mapped via `mapSamlRoleToMemberRole()`.

When `validateCallback()` returns a profile whose email has no matching `User` (or has the `User` but no `TenantMember`), JIT creates the missing rows instead of throwing `NOT_MEMBER`. Audit log gets `saml.jit_provisioned` for every auto-created membership.

## Consequences

**Positive**
- Enterprise sales unblocked. Okta, Azure AD, Google Workspace can all drive provisioning without custom integration work.
- The SCIM endpoint is naturally tenant-scoped (URL carries `tenantId`), so cross-tenant accidents are structurally impossible — the wrong token hits the wrong path.
- JIT closes the "new SSO user can't get in until admin invites them" loop.
- Audit log captures every IdP-driven mutation, with `externalId` recorded for forensic correlation.

**Negative**
- SCIM PATCH (`add`/`replace`/`remove` ops with path expressions) is a real spec to implement; we ship a pragmatic subset (`active`, `name.*`, `userName`) and 400 on unsupported paths. Full SCIM filter language likewise — only `eq` filter on `userName` and `externalId`.
- JIT default-deny is intentional: enabling it on a tenant whose SAML config is weak (no attribute validation) lets an IdP forge identities. Toggle is per-tenant and documented as a security-sensitive switch.

## Alternatives considered

- **OAuth-based provisioning (SCIM bearer alternative).** Rejected: SCIM spec mandates Bearer tokens; OAuth grant flow adds friction without benefit.
- **Build a custom provisioning endpoint.** Rejected: every IdP supports SCIM; reinventing it loses every Marketplace listing.
- **JIT without SCIM.** Rejected: JIT covers login but not offboarding; deprovisioning via SCIM is what HR systems actually need.
- **Mirror groups as `TenantGroup` entity.** Deferred: the boilerplate's role model (`OWNER`/`ADMIN`/`USER`) is flat; group support adds DB schema and group-membership tracking without immediate customer pull. Reopen this ADR when a customer asks for nested groups.
