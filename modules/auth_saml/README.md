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

- **Dashboard:** `/tenant/{id}/admin/saml` — status badge (Active / Disabled / Not configured), SSO activity feed (from the audit log, `action=saml`), and headline stats (JIT-provisioned users, successful logins, last login).
- **Settings:** `/tenant/{id}/admin/saml/settings` — IdP config form (Identity Provider · Attribute Mapping) + SP metadata / ACS endpoints. Reached via the ⚙ action on the dashboard.

The root tenant (`00000000-0000-4000-8000-000000000000`) uses the same two pages — its `SamlConfig` row is the platform-wide config.

## Audit events

The ACS callback and JIT flow emit audit-log rows (consumed by the dashboard activity feed):

| Action | When |
|--------|------|
| `saml.login_success` | Session minted after a valid assertion (`metadata`: email, nameId, jitProvisioned) |
| `saml.login_failed` | Assertion rejected, tenant inactive, or member inactive (`metadata.reason`) |
| `saml.jit_provisioned` | A new user was created from an assertion |
| `saml.jit_role_mapped` | A tenant membership was created with a mapped role |

## Database

Entity `SamlConfig` lives in the **tenant DB** (`saml_configs` table).  
Registered in `libs/typeorm/tenant.ts`.

## Library

Uses `@node-saml/node-saml` for SAMLRequest generation, SAMLResponse validation, and metadata generation.

## Caching

The full `SamlConfig` row (including `spPrivateKey`) is cached in Redis under `auth_saml:config:{tenantId}` (TTL = `TENANT_CACHE_TTL`, default 5 min). `upsertConfig` and `deleteConfig` invalidate the key. All read paths — `getConfig`, `generateAuthUrl`, `validateCallback`, `generateMetadata` — funnel through `loadConfig` so they share the same cache entry.

SAML configs are accessed on every SSO request but change rarely, so this is a high-hit-rate cache. The cached value contains the SP private key; the trust boundary is the same as for SAML metadata in the DB.

The system-scope SAML config (`auth_saml:system_config`) follows the same pattern. TTL is jittered ±10%; both `loadConfig` and `loadSystemConfig` are wrapped in in-process single-flight so a burst of concurrent SSO callbacks for the same tenant runs only one DB query.
