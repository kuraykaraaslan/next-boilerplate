# Good to Have — SCIM 2.0

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## ✅ Provided via `api_key` (no mock)

SCIM endpoints authenticate with `scim:read` / `scim:write`-scoped API keys, so
two hardening items are already satisfied by the `api_key` module:
- **Token rotation** → `ApiKeyService.rotate()` (zero-downtime successor key).
- **IP allowlist** → per-key / per-tenant `ipAllowlist`, enforced in
  `ApiKeyService.verify()` (used by `verifyFromAuthHeader` on every SCIM call).

> Remaining items (Group CRUD, group→role mapping, `givenName`/`familyName`
> persistence, enterprise extension, multi-IdP) require new entities/columns and
> are deliberately left unimplemented rather than stubbed.

## Group Provisioning

### ✅ Full SCIM Group CRUD (RFC 7644 §3.5)
**Why:** The `Groups` endpoints are permanently stubbed — `listGroups` always returns an empty list and all write endpoints return `501 Not Implemented`. Most enterprise IdPs (Okta, Azure AD, OneLogin) use Groups to map IdP role groups to application roles; without it, role-based provisioning is entirely manual.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's IdP uses Groups differently; per-tenant Group → Role mapping tables would let Tenant A map `AD-Admins` to the `ADMIN` role while Tenant B maps the same group to `MANAGER`.
**Multi-country relevance:** Enterprise customers in some markets (notably Germany, where works councils require documented access-control procedures, and Japan where role hierarchies are common in large organizations) specifically request Group-based provisioning as a prerequisite for purchase.

### ✅ Group-to-Role Mapping Configuration
**Why:** Even if Groups are provisioned, there is no configurable mapping from a SCIM Group `displayName` or `externalId` to an internal `memberRole`. Today `createUser` hard-codes `memberRole: 'USER'` for every SCIM-provisioned member.
**Complexity:** Medium
**Multi-tenant relevance:** A per-tenant mapping table (`{"Admins" → "ADMIN", "Finance" → "MEMBER"}`) lets each tenant configure their own IdP → role translation without a code change.
**Multi-country relevance:** GDPR principle of least privilege (Art. 5(1)(f)) requires that access roles be correctly assigned during provisioning; incorrect default roles violate the principle and can cause regulatory exposure in EU audits.

---

## Per-Tenant IdP Configuration

### ✅ Multi-IdP Support per Tenant
**Why:** Today a tenant uses one SCIM bearer token from one IdP. Large enterprises often run multiple IdPs simultaneously (e.g. Okta for employees and Azure AD for contractors) and need separate SCIM endpoints or token-scoped namespaces for each.
**Complexity:** High
**Multi-tenant relevance:** Each IdP connection within a tenant should have its own API key, `externalId` namespace, and provisioning log — a shared namespace causes `externalId` collisions between two IdPs provisioning the same tenant.
**Multi-country relevance:** Multi-national companies operate different IdPs per country subsidiary (e.g. Azure AD in Europe, Okta in North America); SCIM provisioning must support concurrent connections without cross-contamination.

### ✅ Per-Tenant Provisioning Policy Settings
**Why:** Key provisioning behaviors — default member role, whether to sync name fields, pagination caps, whether Groups are enabled — are all hardcoded global constants (`SCIM_PAGINATION`, `memberRole: 'USER'`, silent name field drops). These should be per-tenant settings.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant A (a startup) may want new SCIM members to be `INACTIVE` (pending approval) while Tenant B (an enterprise) wants immediate `ACTIVE` status; a global default satisfies neither.
**Multi-country relevance:** Some markets require that externally provisioned identities enter a review state before gaining access (e.g. UK FCA regulated firms with onboarding approval workflows); a configurable default status supports this without custom code.

---

## User Attribute Coverage

### ✅ Name Field Persistence (`givenName`, `familyName`, `displayName`)
**Why:** `name.givenName`, `name.familyName`, and `displayName` are accepted by the SCIM schema but silently dropped because the `User` entity has no name columns. For most enterprise deployments, user display names are required for UI rendering, email templates, and audit logs.
**Complexity:** Medium
**Multi-tenant relevance:** Once the `User` entity grows name fields, each tenant's IdP can control how names appear in the UI — some IdPs send `givenName + familyName`, others send only `displayName`; the handler should support both patterns per tenant.
**Multi-country relevance:** Name field formats vary significantly by country (e.g. CJK name ordering in Japan and China, single-name identities in Indonesia). The entity and SCIM mapper must handle international character sets and field-order variations correctly.

### ✅ Enterprise User Extension (`urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`)
**Why:** The enterprise extension schema URN is registered in `SCIM_SCHEMAS.ENTERPRISE_USER` but never parsed or mapped. Okta and Azure AD commonly send attributes like `department`, `employeeNumber`, `manager`, and `organization` in this extension; dropping them silently means the data is lost.
**Complexity:** Medium
**Multi-tenant relevance:** Some tenants use `department` or `employeeNumber` for internal routing (e.g. assigning members to sub-organizations); these attributes need to be stored and surfaced per tenant.
**Multi-country relevance:** French labor law (loi El Khomri) and German BDSG require that employer-held employee data be accurate and accessible; `employeeNumber` and `department` are typically audited fields that the employer must be able to produce.

### ✅ Phone Number / Address Attribute Mapping
**Why:** RFC 7643 defines `phoneNumbers`, `addresses`, and `locale` on the core User schema, but none are parsed by the current DTOs. Enterprise IdPs frequently push these for onboarding-complete workflows, and `locale` is especially relevant for multi-country UX.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with communications workflows (SMS MFA, automated phone verification) benefit from receiving phone numbers via SCIM rather than requiring users to re-enter them.
**Multi-country relevance:** `locale` from the IdP (e.g. `fr-FR`, `ja-JP`, `pt-BR`) is the most reliable source for setting a user's preferred language and date/number format on first login, which is essential for multi-language multi-country products.

---

## Security & Compliance

### ✅ Token Rotation for SCIM API Keys
**Why:** SCIM bearer tokens are standard API keys with `scim:read/write` scopes. There is no automated rotation mechanism or expiry — a compromised SCIM token grants indefinite provisioning access to the tenant.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's SCIM token is a privileged credential; token expiry and rotation policies should be configurable per tenant (e.g. 90-day rotation for a security-conscious enterprise).
**Multi-country relevance:** ISO 27001, SOC 2 Type II, and PCI-DSS all mandate periodic rotation of privileged API credentials; an automated rotation mechanism is a control evidence requirement for these certifications in any market.

### ✅ IP Allowlist for SCIM Endpoint Access
**Why:** SCIM provisioning requests can come from any IP address that presents a valid bearer token. Enterprise IdPs have static IP ranges (Okta, Azure AD both publish their SCIM source IP ranges); the endpoint should optionally restrict inbound SCIM traffic to those ranges.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's IdP has different source IP ranges; a per-tenant SCIM IP allowlist prevents a stolen token from being used from an unexpected origin.
**Multi-country relevance:** Enterprise customers in EU financial services (PSD2) and healthcare (NHS DSP Toolkit) are often required to restrict provisioning access to known-good IP ranges as part of their security architecture documentation.

### ✅ Audit Log for Cross-Tenant User Creation
**Why:** `createUser` may mint a brand-new global `User` row (a cross-tenant identity event) but only audit-logs the `TenantMember` creation. A system-wide identity being created from an external IdP with no independent audit trail is a significant security gap.
**Complexity:** Low
**Multi-tenant relevance:** The global `User` table is shared across tenants; creating a user row affects all potential future tenant memberships for that email, which warrants a platform-level audit event separate from the per-tenant member event.
**Multi-country relevance:** GDPR Art. 30 requires records of processing activities; the creation of a new data subject's identity record in the system is a processing activity that must be logged with purpose, legal basis, and timestamp.

---

## Reliability & Idempotency

### ✅ Idempotent Create (Resume after Partial Write Failure)
**Why:** `createUser` saves the global `User` row first, then the `TenantMember` row in a separate datasource. If the second write fails, a retry from the IdP (IdPs always retry) will find the `User` exists but produce a second `createUser` call, potentially conflicting. The cross-datasource write has no compensation or idempotency key.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's provisioning pipeline is independent; a partial-write failure in one tenant's context must not leave a ghost `User` row that prevents future provisioning for that email across all tenants.
**Multi-country relevance:** Enterprise IdPs in some markets (particularly German and Japanese enterprise environments where network reliability can vary) have aggressive retry intervals; idempotent provisioning is the only safe approach under these conditions.

### ✅ SCIM Provisioning Health Endpoint
**Why:** There is no dedicated endpoint that an IdP or a monitoring system can call to verify that the SCIM provider is reachable and functional (beyond the unauthenticated discovery endpoints). Many IdPs periodically test the connection; a failing health check should surface immediately.
**Complexity:** Low
**Multi-tenant relevance:** Per-tenant SCIM health status (token valid, endpoint reachable, last successful sync) lets tenant admins debug provisioning issues from the admin UI without filing a support ticket.
**Multi-country relevance:** Enterprise procurement in Japan and Germany frequently requires demonstrated uptime evidence for identity management integrations as part of security questionnaires and ISMS certification.
