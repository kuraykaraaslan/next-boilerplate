# Good to Have — Auth SAML

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Security

### Wire the `signRequests` column into the SAML client builder
**Why:** The `signRequests` boolean is a visible, seeded, editable column on `SamlConfig` and is surfaced to tenant admins, but `buildSaml` never reads it — the SAML client is built the same way regardless of its value. Tenant admins who set it to `false` (for IdPs that reject signed requests) see no effect.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's IdP has different requirements. Okta and Azure AD accept signed requests; some on-premise ADFS deployments reject them. Without the per-tenant `signRequests` toggle, configurations that require unsigned requests will silently fail or be misconfigured.
**Multi-country relevance:** Government IdPs in several countries (Germany's Elster, Belgium's eID, UK's Gov.UK Verify successor) have strict signature requirements that differ from commercial IdPs; per-tenant configurability is required to interoperate.

### Per-tenant configurable signature algorithm (`samlSignatureAlgorithm`)
**Why:** `signatureAlgorithm` is hardcoded to `'sha256'` for every tenant. Some legacy enterprise IdPs still use `sha1`, and future-looking IdPs require `sha512`. Tenant admins have no way to match their IdP's requirement.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants migrating from older IdPs (pre-2018 ADFS, legacy PingFederate) still require `sha1`. Blocking them on this prevents SAML SSO onboarding entirely.
**Multi-country relevance:** National identity providers in some markets have not yet mandated SHA-256 (e.g. certain government SAML federations in Eastern Europe still accept only SHA-1); a per-tenant algorithm selector is required for multi-country IdP interop.

### Certificate rotation workflow (dual-cert support)
**Why:** `SamlConfig` stores a single `spCertificate` / `spPrivateKey` pair. Rotating an SP certificate requires a maintenance window: the old cert must be removed and the new one added atomically, which causes SSO to fail during the transition. No staging/secondary cert slot exists.
**Complexity:** High
**Multi-tenant relevance:** Every tenant running production SSO must rotate its SP certificate periodically; a zero-downtime rotation path is table stakes for enterprise SAML deployments.
**Multi-country relevance:** PCI-DSS 3.2.1 and EU eIDAS technical requirements both mandate regular cryptographic key rotation; dual-cert support (old + new cert accepted simultaneously during rollover) is the standard implementation.

### IdP certificate expiry monitoring and alert
**Why:** `idpCertificate` is stored as a raw PEM/base64 blob with no expiry tracking. When the IdP's signing certificate expires, all SAML logins for that tenant fail with a cryptic signature-validation error. There is no proactive alert.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant has its own IdP cert with its own expiry. Without per-tenant expiry tracking, platform ops cannot proactively warn tenants before their SSO breaks.
**Multi-country relevance:** Enterprise IdP certificates in regulated sectors (banking, government) often have fixed 1-year or 2-year lifetimes mandated by national PKI policy; silent expiry is an operational disaster.

### Per-tenant configurable clock-skew tolerance (`samlClockSkewMs`)
**Why:** `acceptedClockSkewMs` is hardcoded to 5000 ms. Enterprise IdPs with NTP drift (e.g. on-premise ADFS behind strict corporate firewalls) often require 30–60 seconds of tolerance. A single global value cannot satisfy both tight SaaS IdPs and corporate on-premise IdPs.
**Complexity:** Low
**Multi-tenant relevance:** Clock skew is an IdP-specific property; each tenant's IdP may have different NTP characteristics.
**Multi-country relevance:** Government and military IdPs in some countries (e.g. US DoD CAC federation, certain AFIS-linked IdPs in France) operate in air-gapped or strictly controlled NTP environments; larger clock-skew windows are necessary.

---

## Compliance

### SAML assertion encryption support (EncryptedAssertion)
**Why:** The current implementation validates signed assertions but does not decrypt encrypted assertions (`EncryptedAssertion`). Many high-assurance IdPs (healthcare, government, financial) send encrypted assertions as a mandatory security control; tenants relying on these IdPs cannot use the SAML module.
**Complexity:** High
**Multi-tenant relevance:** Enterprise healthcare and government tenants — the highest-value enterprise segment — require encrypted assertions as a non-negotiable IdP requirement.
**Multi-country relevance:** EU eIDAS Level of Assurance "High" requires assertion encryption. Germany (BSI TR-03107), France (RGS), and UK (GPG 45) all require encryption for identity assertions at high assurance levels. Without it, the SAML module cannot be used in any EU public-sector SAML federation.

### SAML Single Logout (SLO) support
**Why:** There is no SLO endpoint. When a user logs out of the IdP, the SP is never notified — the user's platform session remains active. Conversely, platform logout does not propagate to the IdP session. This breaks the security model for enterprise SSO where centralised session control is a compliance requirement.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants using SAML expect SLO to be the mechanism by which IT helpdesks can terminate all user sessions centrally (e.g. when an employee is terminated).
**Multi-country relevance:** GDPR Art. 32 and NIS2 Art. 21 require "appropriate technical measures" to protect personal data — a dangling authenticated session after IdP logout is a concrete gap. EU eIDAS federated identity guidelines mandate SLO for compliant service providers.

### JIT provisioning transactional guarantee (user + membership atomicity)
**Why:** `resolveOrProvisionUser` creates a `User` row, then calls `TenantInvitationService.autoAcceptForEmail`, then creates a `TenantMember` row as separate, non-transactional writes. A failure after user creation but before membership creation leaves an orphaned user who can authenticate (via email/password) but has no tenant membership — they see an empty application state.
**Complexity:** Medium
**Multi-tenant relevance:** Orphaned users from JIT provisioning have caused silent onboarding failures in every multi-tenant SAML deployment encountered in practice; fixing this is a prerequisite for reliable enterprise onboarding.
**Multi-country relevance:** GDPR Art. 5(1)(f) (integrity and confidentiality) and accuracy principles (Art. 5(1)(d)) require that provisioned identity data be accurate and complete; partial JIT rows violate both.

### Attribute-based access control (ABAC) from SAML assertions
**Why:** The role mapper (`mapSamlRoleToMemberRole`) supports only a simple substring match for `owner`/`admin` in a single attribute. Enterprise IdPs (especially Active Directory federation) commonly send group membership as a multi-value `memberOf` attribute containing full DN strings (e.g. `CN=App-Admins,OU=Groups,DC=corp,DC=example,DC=com`). No configurable mapping rule exists.
**Complexity:** High
**Multi-tenant relevance:** Each enterprise tenant's IdP uses different group naming conventions. A static `owner`/`admin` substring match is insufficient for any real-world Active Directory deployment.
**Multi-country relevance:** Government SAML federations (SAML2 for eGov, GovROAMING, SWAMID in Scandinavia) use structured attribute schemas (SCHAC, eduPerson) that require configurable attribute-to-role mappings to be usable.

---

## Multi-tenancy

### Per-tenant SP key/cert auto-generation on first configuration
**Why:** `spPrivateKey` and `spCertificate` are optional nullable columns — tenant admins must generate their own X.509 key pair and paste it into the form. Self-service SAML setup requires that the platform auto-generate a unique SP key pair per tenant on first `upsertConfig`.
**Complexity:** Medium
**Multi-tenant relevance:** Requiring every tenant admin to generate and manage X.509 certificates is a massive friction point in onboarding. Each tenant must get a unique SP identity; auto-generation at upsert time is the standard UX.
**Multi-country relevance:** Key management hygiene is required by ISO 27001 A.10.1; auto-generated, tenant-unique keys satisfy this requirement automatically, whereas self-service copy-paste creates unauditable key provenance.

### Per-tenant SAML session lifetime configuration
**Why:** After a successful SAML callback, the platform mints a standard `UserSession` with the session lifetime from `AuthPolicyService.getSessionPolicy(tenantId)`. However, the SAML assertion itself carries a `SessionNotOnOrAfter` attribute that the IdP intends to be the maximum session lifetime. The current implementation ignores this attribute.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise IdPs (Azure AD, Okta) configure `SessionNotOnOrAfter` as a centrally managed policy. Ignoring it means the platform session outlives the IdP's intent, which breaks the enterprise's session governance model.
**Multi-country relevance:** EU eIDAS and national identity schemes (BankID in Scandinavia, DigiD in the Netherlands) define maximum session lifetimes as part of the LoA specification; ignoring `SessionNotOnOrAfter` can push the platform out of LoA compliance.

### SAML metadata auto-import (federation discovery)
**Why:** Tenants must manually copy IdP metadata fields (entityId, SSO URL, certificate) into the config form. Most enterprise IdPs (Azure AD, Okta, ADFS) expose a standard metadata XML URL. A "import from URL" feature that fetches the IdP metadata and pre-fills the form would dramatically reduce misconfiguration.
**Complexity:** Medium
**Multi-tenant relevance:** Self-service SAML onboarding for dozens of enterprise tenants is operationally infeasible without metadata import; manual entry is error-prone and is the #1 source of SAML misconfiguration support tickets.
**Multi-country relevance:** EU research and education federations (GÉANT eduGAIN), Scandinavian government federations (SWAMID, FEIDE), and national identity schemes publish their metadata via SAML metadata aggregates; consuming them requires a metadata-import path.

---

## Monitoring

### Per-tenant SAML login success/failure rate metrics
**Why:** The audit log captures `saml.login_success` and `saml.login_failed` events, but there are no structured metrics (Prometheus counters, time-series) broken down by tenant. The admin dashboard activity feed relies on audit-log queries, which are slow and not suitable for alerting.
**Complexity:** Medium
**Multi-tenant relevance:** SRE teams need per-tenant dashboards showing SAML health; a tenant whose IdP is misconfigured should trigger an alert, not require manual audit-log inspection.
**Multi-country relevance:** NIS2 Art. 21 requires monitoring of authentication-system health; structured metrics are the standard implementation.

### SAML assertion replay attack detection
**Why:** SAML assertions carry a unique `ID` attribute and a `NotOnOrAfter` timestamp. The current implementation validates the timestamp but does not check whether the assertion `ID` has been seen before. A replayed assertion (man-in-the-middle or network retry) would be accepted as a fresh login.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's assertion IDs must be tracked separately (scoped by `tenantId` in the replay cache) to avoid cross-tenant interference.
**Multi-country relevance:** EU eIDAS technical specifications and US NIST SP 800-63C explicitly require assertion replay prevention. Without it, any SAML deployment claiming eIDAS or NIST LoA compliance would fail the assessment.
