# Architecture Decision Records

| # | Title | Status |
|---|---|---|
| [0001](0001-root-tenant.md) | Root tenant is a real tenant row | Accepted |
| [0002](0002-tenant-owned-providers.md) | Tenants own their provider credentials | Accepted |
| [0003](0003-migration-framework.md) | SQL-first migrations with RLS as defense-in-depth | Accepted |
| [0004](0004-scim-provisioning.md) | SCIM 2.0 provisioning + SAML JIT | Accepted |
| [0005](0005-tenant-custom-domain-ssl.md) | Tenant custom-domain SSL via reverse-proxy on-demand TLS | Accepted |

## Conventions

Each ADR captures a single decision: the context that forced it, the decision itself, and the consequences (positive and negative) we accepted. Reverse the decision by writing a new ADR that supersedes the old one — don't edit accepted ADRs in place.

File naming: `NNNN-kebab-case-title.md`, four-digit zero-padded, never reused.
