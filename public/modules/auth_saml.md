# SAML SSO

- **id:** `auth_saml`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/auth_saml/`
- **tags:** identity, auth, sso, enterprise
- **icon:** `fas fa-building-shield`
- **hasNextLayer:** true

SAML 2.0 SSO with per-tenant IdP configuration (SamlConfig entity).

## Dependencies

- **requires:** `db`, `user`, `user_session`, `tenant`, `env`

## Services

- `auth_saml.service.ts`

## DTOs

- `auth_saml.dto.ts`

## Entities

- `saml_config.entity.ts`

## Enums

- `auth_saml.enums.ts`

## Message keys

- `auth_saml.messages.ts`

## TypeORM entities

- `SamlConfig` (system) — `modules/auth_saml/entities/saml_config.entity.ts`

## Next layer (modules_next/) surface

- `auth_saml/ui/SamlAttributeForm` _(ui, client)_
- `auth_saml/ui/SamlConfigForm` _(ui, client)_
- `auth_saml/ui/SamlMetadataCard` _(ui, client)_

## README

# auth_saml

SAML 2.0 SSO per-tenant module.

## Flow

**SP-Initiated (recommended):**
1. User navigates to `/tenant/{tenantId}/api/auth/saml/initiate`
2. App generates signed SAMLRequest, redirects to IdP SSO URL
3. IdP authenticates user, POSTs SAMLResponse to ACS URL
4. ACS endpoint (`/tenant/{tenantId}/api/auth/saml/callback`) verifies signature, creates session

**IdP-Initiated (optional):**
- IdP POSTs SAMLResponse directly to ACS without prior request
- Requires `allowIdpInitiated: true` in the tenant config

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tenant/{id}/api/auth/saml/metadata` | SP Metadata XML (public) |
| GET | `/tenant/{id}/api/auth/saml/initiate` | Start SP-initiated login |
| POST | `/tenant/{id}/api/auth/saml/callback` | ACS — IdP posts SAMLResponse here |
| GET | `/tenant/{id}/api/saml/config` | Get config + metadata (ADMIN) |
| PUT | `/tenant/{id}/api/saml/config` | Save config (ADMIN) |
| DELETE | `/tenant/{id}/api/saml/config` | Delete config (ADMIN) |
| GET | `/tenant/00000000-0000-4000-8000-000000000000/api/saml/tenants` | List all tenants with SAML (super-admin) |

## Admin Pages

- **Tenant:** `/tenant/{id}/admin/settings/saml` — 3 tabs: Identity Provider · Attribute Mapping · SP Metadata
- **System:** `/tenant/00000000-0000-4000-8000-000000000000/admin/saml` — 2 tabs: Tenant Overview · Setup Guide

## Database

Entity `SamlConfig` lives in the **tenant DB** (`saml_configs` table).  
Registered in `libs/typeorm/tenant.ts`.

## Library

Uses `@node-saml/node-saml` for SAMLRequest generation, SAMLResponse validation, and metadata generation.

## Caching

The full `SamlConfig` row (including `spPrivateKey`) is cached in Redis under `auth_saml:config:{tenantId}` (TTL = `TENANT_CACHE_TTL`, default 5 min). `upsertConfig` and `deleteConfig` invalidate the key. All read paths — `getConfig`, `generateAuthUrl`, `validateCallback`, `generateMetadata` — funnel through `loadConfig` so they share the same cache entry.

SAML configs are accessed on every SSO request but change rarely, so this is a high-hit-rate cache. The cached value contains the SP private key; the trust boundary is the same as for SAML metadata in the DB.

The system-scope SAML config (`auth_saml:system_config`) follows the same pattern. TTL is jittered ±10%; both `loadConfig` and `loadSystemConfig` are wrapped in in-process single-flight so a burst of concurrent SSO callbacks for the same tenant runs only one DB query.
