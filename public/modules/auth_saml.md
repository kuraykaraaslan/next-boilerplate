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

# Auth Saml Module

Per-tenant SAML 2.0 SSO. Each tenant configures its own IdP, attribute mapping, and JIT-provisioning rules in a tenant-scoped `SamlConfig` row, and gets a distinct SP identity namespaced by `tenantId`. Built on `@node-saml/node-saml` for SAMLRequest generation, SAMLResponse validation, and SP-metadata generation.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `SamlConfig` | `saml_configs` | One SAML configuration per tenant (UNIQUE `tenantId`): IdP settings, SP key/cert, attribute mapping, JIT rules, and options. |

Lives in the **tenant DB** (registered in `libs/typeorm/tenant.ts`). There is no system DB entity — the root tenant's row is the platform-wide config.

`SafeSamlConfig` (`auth_saml.types.ts`) is the client-facing projection: it omits `spPrivateKey` so the SP private key is never returned by the API.

---

## Flow

**SP-Initiated (recommended):**
1. User navigates to `/tenant/{tenantId}/api/auth/saml/initiate`
2. App generates the SAMLRequest and redirects to the IdP SSO URL
3. IdP authenticates the user, POSTs a SAMLResponse to the ACS URL
4. ACS endpoint (`/tenant/{tenantId}/api/auth/saml/callback`) verifies the signature, resolves/provisions the user, and mints a session

**IdP-Initiated (optional):**
- IdP POSTs a SAMLResponse directly to the ACS without a prior request
- Requires `allowIdpInitiated: true` in the tenant config

---

## Service (`SamlService`)

All methods are `static` and tenant-scoped by `tenantId`.

| Method | Responsibility |
|---|---|
| `getConfig` | Load the tenant's config as a `SafeSamlConfig` (no private key), or `null`. |
| `upsertConfig` | Create-or-patch the tenant's `SamlConfig` (partial update via `UpsertSamlConfigInput`), then invalidate the cache. |
| `deleteConfig` | Remove the tenant's `SamlConfig` row and invalidate the cache. |
| `generateAuthUrl` | Build the IdP authorize URL for SP-initiated login (carries optional `relayState`). Throws `NOT_CONFIGURED` / `NOT_ENABLED`. |
| `isTenantEnabled` | Cheap boolean check of `isEnabled` (used by the Connected-Accounts panel and link flow). |
| `validateCallback` | Validate a posted SAMLResponse, read `email`/`name` from the tenant-configured attribute names, and return a `SamlProfile`. Gated by `isEnabled`; IdP-initiated additionally gated by `allowIdpInitiated`. |
| `generateMetadata` | Produce SP metadata (`entityId`, `acsUrl`, `metadataUrl`, `xml`) — full XML from `@node-saml/node-saml` when a config row exists, else a minimal stub. |
| `linkToUser` | Attach a freshly-validated SAML identity to an existing user, but **only** when the assertion email matches `expectedEmail` (case-insensitive); otherwise throws `EMAIL_MISMATCH`. Persisted via `UserSocialAccountService.link(userId, 'saml', nameId)`. |
| `mapSamlRoleToMemberRole` | Derive a `TenantMemberRole` from the assertion: scan `roleAttribute` values for `owner`/`admin` substrings, else fall back to `defaultMemberRole`, else `USER`. |
| `resolveOrProvisionUser` | Resolve the user + tenant membership for an assertion. JIT-creates the user and/or membership when `allowJitProvisioning` is on (auto-accepting any pending `TenantInvitation` for the email); throws `NOT_MEMBER` when off. |
| `spEntityId` / `acsUrl` / `metadataUrl` | SP identity URLs, all namespaced by `tenantId`. |

`buildSaml` (private) constructs the `@node-saml/node-saml` client from the tenant's row (entryPoint, idpCert, privateKey, identifierFormat). `signatureAlgorithm` (`sha256`), `wantAssertionsSigned` (`true`), and `acceptedClockSkewMs` (`5000`) are currently hardcoded — see *Tenant Variability*.

---

## API Routes

| Method | Path | Scope |
|---|---|---|
| GET | `/tenant/{id}/api/auth/saml/metadata` | Public — SP metadata XML |
| GET | `/tenant/{id}/api/auth/saml/initiate` | Public — start SP-initiated login |
| POST | `/tenant/{id}/api/auth/saml/callback` | Public — ACS; IdP posts the SAMLResponse here |
| GET | `/tenant/{id}/api/auth/saml/status` | Public — `{ enabled }` for the Connected-Accounts panel |
| GET | `/tenant/{id}/api/auth/me/social-accounts/connect/saml` | Authed user — start a SAML flow to **link** the IdP identity to the current user (link-state JWT via RelayState; rate-limited) |
| GET | `/tenant/{id}/api/saml/config` | Tenant `ADMIN` — get config + SP metadata |
| PUT | `/tenant/{id}/api/saml/config` | Tenant `ADMIN` — upsert config (`UpsertSamlConfigDTO`) |
| DELETE | `/tenant/{id}/api/saml/config` | Tenant `ADMIN` — delete config |

The root tenant (`00000000-0000-4000-8000-000000000000`) uses the same routes; its row is the platform-wide config.

---

## Admin Pages

- **Dashboard:** `/tenant/{id}/admin/saml` — status badge (Active / Disabled / Not configured), SSO activity feed (from the audit log, `action=saml`), and headline stats (JIT-provisioned users, successful logins, last login).
- **Settings:** `/tenant/{id}/admin/saml/settings` — IdP config form (Identity Provider · Attribute Mapping) + SP metadata / ACS endpoints. Reached via the ⚙ action on the dashboard.

The root tenant uses the same two pages — its `SamlConfig` row is the platform-wide config.

---

## Configuration (`SamlConfig` columns)

All SAML configuration is stored on the entity (not in the `setting` module). `UpsertSamlConfigDTO` validates the editable subset; `nameIdFormat` values come from `SAML_NAME_ID_FORMATS` (`auth_saml.enums.ts`).

| Column | Type | Default | Purpose |
|---|---|---|---|
| `isEnabled` | boolean | `false` | Master on/off for the tenant. |
| `idpEntityId` | text | `''` | IdP EntityID. |
| `idpSsoUrl` | text | `''` | IdP SSO endpoint (authorize URL). |
| `idpCertificate` | text | `''` | IdP signing cert (PEM/base64) for signature verification. |
| `spPrivateKey` | text? | `null` | SP private key — never exposed to the client. |
| `spCertificate` | text? | `null` | SP cert (used for metadata signing/decryption). |
| `emailAttribute` | varchar | `email` | Assertion attribute holding the user's email. |
| `nameAttribute` | varchar | `name` | Assertion attribute holding the user's display name. |
| `roleAttribute` | varchar? | `null` | Assertion attribute scanned for `owner`/`admin` to map a member role. |
| `allowJitProvisioning` | boolean | `false` | When on, auto-create unknown users / missing memberships. |
| `defaultMemberRole` | varchar? | `null` | Role for JIT members with no usable role attribute (falls back to `USER`). |
| `allowIdpInitiated` | boolean | `false` | Allow IdP-initiated assertions. |
| `signRequests` | boolean | `true` | Intended request-signing toggle (currently unwired — see *Tenant Variability*). |
| `nameIdFormat` | varchar? | `null` | SAML NameID format (defaults to the email format). |

---

## Audit events

The ACS callback and JIT flow emit audit-log rows (consumed by the dashboard activity feed):

| Action | When |
|--------|------|
| `saml.login_success` | Session minted after a valid assertion (`metadata`: email, nameId, jitProvisioned) |
| `saml.login_failed` | Assertion rejected, tenant inactive, or member inactive (`metadata.reason`) |
| `saml.jit_provisioned` | A new user was created from an assertion |
| `saml.jit_role_mapped` | A tenant membership was created with a mapped role |

---

## Caching

The full `SamlConfig` row (including `spPrivateKey`) is cached in Redis under `auth_saml:config:{tenantId}` (TTL = `TENANT_CACHE_TTL`, default 5 min). `upsertConfig` and `deleteConfig` invalidate the key. All read paths — `getConfig`, `generateAuthUrl`, `validateCallback`, `generateMetadata`, `resolveOrProvisionUser`, `isTenantEnabled` — funnel through `loadConfig` so they share the same cache entry.

SAML configs are read on every SSO request but change rarely, so this is a high-hit-rate cache. The cached value contains the SP private key; the trust boundary is the same as for the SAML config in the DB. TTL is jittered (`jitter`), and `loadConfig` is wrapped in in-process single-flight (`singleFlight`) so a burst of concurrent SSO callbacks for the same tenant runs only one DB query.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

auth_saml provides per-tenant SAML 2.0 SSO (IdP config, attribute mapping, JIT provisioning) with all tenant configuration stored in a tenant-scoped SamlConfig entity (one row per tenant) rather than in the setting module, making it heavily tenant-variable.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `SamlConfig` | `saml_configs` | isEnabled, idpEntityId, idpSsoUrl, idpCertificate, spPrivateKey, spCertificate, emailAttribute, nameAttribute, roleAttribute, allowJitProvisioning, defaultMemberRole, allowIdpInitiated, signRequests, nameIdFormat |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `auth_saml.service.ts:buildSaml` — The entire @node-saml/node-saml SAML client is built from the tenant's SamlConfig row: per-tenant entryPoint (idpSsoUrl), idpCert (idpCertificate), privateKey (spPrivateKey), and identifierFormat (nameIdFormat). callbackUrl/issuer are derived from the request tenantId.
- `auth_saml.service.ts:generateAuthUrl` — Login is gated by the tenant's isEnabled flag (throws NOT_CONFIGURED / NOT_ENABLED); the authorize URL points at the tenant's own IdP entryPoint.
- `auth_saml.service.ts:validateCallback` — Assertion validation gated per tenant by isEnabled; IdP-initiated flows additionally gated by allowIdpInitiated; email/name are read from the tenant-configured emailAttribute / nameAttribute attribute names.
- `auth_saml.service.ts:mapSamlRoleToMemberRole` — Tenant member role is derived from the tenant's roleAttribute (scanned for owner/admin substrings) and falls back to the tenant's defaultMemberRole, defaulting to USER.
- `auth_saml.service.ts:resolveOrProvisionUser` — JIT user/membership creation is gated by the tenant's allowJitProvisioning flag (throws NOT_MEMBER when off); on creation the mapped/default role from this tenant's config is applied.
- `auth_saml.service.ts:generateMetadata` — SP metadata XML is generated per tenant from the tenant's spCertificate plus tenantId-derived entityId/ACS URLs (or a minimal metadata stub when no config row exists).
- `auth_saml.service.ts:spEntityId/acsUrl/metadataUrl` — SP EntityID, ACS, and metadata URLs are namespaced by tenantId (/tenant/{tenantId}/api/auth/saml/...), so each tenant has a distinct SP identity.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Stored per-tenant boolean signRequests is never applied — buildSaml hardcodes the request-signing posture and never reads config.signRequests, so the AuthnRequestsSigned/authnRequestsSigned behavior cannot actually vary per tenant despite being an editable, seeded column. | `auth_saml.service.ts:buildSaml (config.signRequests unused; SAML constructor omits authnRequestsSigned)` | signRequests exists on the entity, DTO, seed, and SafeSamlConfig schema and is presented as a tenant-configurable option, but the SAML client is always built the same way and buildMinimalMetadata hardcodes AuthnRequestsSigned="false". The per-tenant intent is real but unwired. | — |
| signatureAlgorithm is hardcoded to 'sha256' for every tenant. | `auth_saml.service.ts:buildSaml (signatureAlgorithm: 'sha256')` | Some IdPs require sha1 or sha512; this is a plausible per-tenant SSO knob today fixed globally. Low priority but a real hardcode tied to per-tenant IdP interop. | `samlSignatureAlgorithm` |
| acceptedClockSkewMs is hardcoded to 5000ms for every tenant. | `auth_saml.service.ts:buildSaml (acceptedClockSkewMs: 5000)` | Clock-skew tolerance for assertion validation can differ by IdP/tenant; currently a single global value with no override path. | `samlClockSkewMs` |
| wantAssertionsSigned is hardcoded true for every tenant. | `auth_saml.service.ts:buildSaml (wantAssertionsSigned: true)` | Whether the SP requires signed assertions is a per-IdP security posture; reasonable to keep globally strict, but it is a candidate that some tenants/IdPs may need relaxed. Likely intentionally global for security — noting for completeness. | `samlWantAssertionsSigned` |

---

## Dependencies

Requires: `db`, `user`, `user_session`, `tenant`, `env` (`module.json`). At runtime the service also composes `user_social_account` (identity linking), `tenant_member` (membership/role), `tenant_invitation` (auto-accept on JIT), `audit_log` (SSO events), and `redis` (config cache). Uses `@node-saml/node-saml` for SAMLRequest generation, SAMLResponse validation, and metadata generation.
