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
| GET | `/system/api/saml/tenants` | List all tenants with SAML (SYSTEM ADMIN) |

## Admin Pages

- **Tenant:** `/tenant/{id}/admin/settings/saml` — 3 tabs: Identity Provider · Attribute Mapping · SP Metadata
- **System:** `/system/admin/saml` — 2 tabs: Tenant Overview · Setup Guide

## Database

Entity `SamlConfig` lives in the **tenant DB** (`saml_configs` table).  
Registered in `libs/typeorm/tenant.ts`.

## Library

Uses `@node-saml/node-saml` for SAMLRequest generation, SAMLResponse validation, and metadata generation.
