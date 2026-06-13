# Good to Have — Auth

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Security

### ✅ Enforce `allowRegistration` and `emailVerificationRequired` per tenant
**Why:** Both setting keys are declared and seeded per tenant but never read — any tenant that wants invite-only signup or verified-email-before-access enforcement has no path to it today.
**Complexity:** Low
**Multi-tenant relevance:** Core self-registration and verification postures differ between tenants (e.g. a B2B tenant wants invite-only, a consumer tenant wants open signup). The knobs are there but wired to nothing.
**Multi-country relevance:** Some jurisdictions require verified contact information before allowing access; the `emailVerificationRequired` flag is the right primitive to enforce this per-country deployment.

### ✅ Enforce `ssoAllowedProviders` per tenant
**Why:** The setting key exists and is seeded, but `AuthPolicyService.getAccessPolicy` never consults it — `disableSocialLogin` is all-or-nothing with no fine-grained control per provider.
**Complexity:** Low
**Multi-tenant relevance:** A B2B tenant may want to restrict login to Microsoft/Google only; a consumer tenant may want the full provider list. Without enforcement the setting is cosmetic.
**Multi-country relevance:** Some providers (e.g. WeChat) are only relevant in specific markets; regional tenants could use this flag to hide irrelevant provider buttons.

### ✅ Make OTP / Reset / Email-verify TTLs and rate limits per-tenant settings
**Why:** OTP length, expiry, rate-limit window, password-reset token TTL/length, and email-verification TTL are all read from global env vars, making it impossible for high-security tenants to shorten windows or for consumer tenants to extend them.
**Complexity:** Medium
**Multi-tenant relevance:** Financial-services or healthcare tenants need a 2-minute OTP window; consumer tenants tolerate 10 minutes. A single global env constant cannot satisfy both.
**Multi-country relevance:** Certain national security frameworks (e.g. Turkey's KVKK guidance, EU NIS2 implementing acts) define maximum OTP lifetimes; per-tenant configuration lets country-specific deployments comply without changing global defaults.

### ✅ Per-tenant TOTP issuer label
**Why:** The authenticator-app issuer is hardcoded to `'Relatia'` (env `TOTP_ISSUER`). Every tenant's TOTP tokens show the same brand in the authenticator app regardless of the tenant's identity.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant shows its own brand name inside authenticator apps (Google Authenticator, Authy, etc.) — critical for white-label deployments where end-users should never see the platform name.
**Multi-country relevance:** No direct country impact, but white-label multi-country deployments (e.g. one platform, different brand per country) need this to function correctly.

### Per-tenant auth email delivery using tenant branding and mail provider
**Why:** All transactional auth emails (OTP, email verification, forgot/reset) are sent with `tenantId: ROOT_TENANT_ID`, bypassing each tenant's own mail provider config and branding. Tenants with a custom `From:` address or SMTP config can never surface it on auth flows.
**Complexity:** Medium
**Multi-tenant relevance:** SaaS tenants expect auth emails to arrive from their own domain. Routing all auth mail through the root tenant makes white-label auth impossible and violates DMARC/DKIM alignment for the tenant domain.
**Multi-country relevance:** Country-specific legal requirements (e.g. GDPR, Turkish KVKK) often require that transactional mail be sent from the data-controller's own domain; a tenant operating in that country would fail compliance if all auth email uses the platform's root domain.

### ✅ Configurable bcrypt cost factor per tenant tier
**Why:** Cost 10 is a reasonable default but enterprise tenants with dedicated infrastructure may want cost 12, while high-volume free-tier tenants want cost 10 to manage latency. Currently the cost is hardcoded in the service.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise SLAs demand higher security primitives; the ability to tier bcrypt cost is a concrete differentiator.
**Multi-country relevance:** No direct country impact, but compliance-driven deployments (PCI-DSS, ISO 27001) may specify minimum cost factors.

---

## Compliance

### ✅ Consent-at-registration capture
**Why:** There is no mechanism to capture, version, or re-prompt for Terms of Service / Privacy Policy consent at registration time. This is legally required in GDPR, LGPD (Brazil), and Turkey's KVKK for user-facing SaaS.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may have its own ToS version; a tenant needs to know which version a user consented to and be able to re-prompt on version change.
**Multi-country relevance:** EU (GDPR Art. 7), Brazil (LGPD), Turkey (KVKK) all require a verifiable consent record at registration with the version of the document consented to. Without this, each country deployment is non-compliant.

### ✅ Right-to-erasure / data-deletion flow for dormant sweep
**Why:** `disableDormantAccounts` marks accounts inactive but never deletes PII. GDPR Art. 17 and similar laws require actual erasure upon request or after a configurable retention window.
**Complexity:** High
**Multi-tenant relevance:** Each tenant may have a different data-retention policy; the dormant sweep should offer a `deleteAfterDays` option that, when set, anonymises or hard-deletes user records rather than just disabling them.
**Multi-country relevance:** EU (GDPR), California (CCPA/CPRA), Brazil (LGPD), Turkey (KVKK) all require erasure on request. Without a deletion path in the auth module, no country-specific deployment can pass a DPA audit.

### ✅ Configurable password minimum age (`passwordMinAgeDays`)
**Why:** Many security frameworks (PCI-DSS, NIST SP 800-63B, German BSI) require that a new password cannot be changed again for at least 1 day to prevent users from cycling through history and reverting to a forbidden password. No such guard exists today.
**Complexity:** Low
**Multi-tenant relevance:** Regulated tenants (financial, healthcare) need this; consumer tenants do not — it should be per-tenant.
**Multi-country relevance:** PCI-DSS (global), German BSI IT-Grundschutz, and various national banking regulators mandate a minimum password age.

---

## Localization / i18n

### Per-locale auth email templates
**Why:** Auth emails (OTP, verification, reset) are sent in a single language. Users in France, Turkey, or Brazil expect email in their locale; the `dictionaries/` directory is in place for the UI but not wired into transactional mail.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants serving multiple languages need per-user locale preferences respected in transactional auth mail.
**Multi-country relevance:** Legal requirements in France (LOI Toubon), Turkey (KVKK guidance), and consumer-protection laws in Brazil and the EU require that automated communications be in the recipient's language when the user's locale is known.

### ✅ Locale-aware error messages in API responses
**Why:** `auth.messages.ts` keys are returned as English strings regardless of the `Accept-Language` header or user locale preference. Clients in non-English locales see English error messages.
**Complexity:** Medium
**Multi-tenant relevance:** White-label tenants targeting non-English markets need localised error messages to pass UX review.
**Multi-country relevance:** Directly affects every non-English country deployment.

---

## Multi-tenancy

### Dead setting key cleanup: `allowRegistration`, `emailVerificationRequired`, `maxLoginAttempts`, `ssoAllowedProviders`
**Why:** Four setting keys are declared, seeded, and visible to tenant admins but have no effect on runtime behaviour. This is a correctness bug — admins configuring these settings get no feedback that they are inert, leading to misconfigured tenants that believe they are enforcing policies they are not.
**Complexity:** Low
**Multi-tenant relevance:** Every tenant that tries to use these controls is silently unprotected. Fixing this is a prerequisite for any multi-tenant production deployment.
**Multi-country relevance:** Invite-only registration and email verification are often required by national compliance programmes; dead keys block those requirements.

### ✅ Tenant-level MFA method allow-list
**Why:** `adminRequireMfa` and `externalRequireMfa` force MFA but do not restrict which MFA methods (TOTP, EMAIL OTP, SMS OTP) are acceptable. A tenant on a FIDO2/hardware-key journey should be able to ban SMS OTP at the tenant level.
**Complexity:** Medium
**Multi-tenant relevance:** Financial tenants and government-sector tenants typically prohibit SMS OTP (SIM-swap risk) while consumer tenants may not support TOTP at all.
**Multi-country relevance:** German BSI C5, UK NCSC, and US NIST 800-63B deprecate SMS OTP for high-assurance contexts; EU PSD2 strong customer authentication requires hardware-backed second factors for financial operations. Per-tenant method restrictions map directly to these country-level requirements.

### Session policy applied consistently on `getSession`
**Why:** `user_session.crud.service.ts:getSession` calls `getSessionPolicy()` without a `tenantId`, so session idle-timeout is checked against the system default rather than the tenant's configured value. This is a documented gap in the README (`Candidates` section).
**Complexity:** Low
**Multi-tenant relevance:** A tenant configured with a 5-minute idle timeout would silently see the system default (30 minutes) applied on session reads, undermining its security posture.
**Multi-country relevance:** Short idle timeouts are mandatory in healthcare (HIPAA) and financial-services contexts; this bug means those tenants cannot reliably enforce their configured policy.

---

## Developer Experience

### Integration tests for the dormant-account sweep with per-tenant policy
**Why:** The BullMQ `auth-dormant-sweep` job is tested only via the service method; there are no tests covering the serverless `POST /api/cron/dormant-sweep` path, the `CRON_SECRET` gate, or the dry-run (`dormantAccountAutoDisable=false`) mode.
**Complexity:** Low
**Multi-tenant relevance:** The sweep iterates tenants; a bug in per-tenant policy resolution silently affects all tenants in a single run.
**Multi-country relevance:** Data-retention obligations differ by country; test coverage of the dry-run mode is the only way to validate that a country-specific retention policy is correctly modelled before enabling auto-disable.

### OpenAPI / JSON Schema export for all auth DTOs
**Why:** `auth.dto.ts` uses Zod but there is no automatic OpenAPI schema generation. Tenant integrators building against the auth API have no machine-readable contract.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenant integrators (middleware vendors, identity brokers) expect an OpenAPI spec for the auth endpoints.
**Multi-country relevance:** Public-sector procurement in the EU and UK requires machine-readable API contracts for interoperability assessments.

---

## Monitoring

### ✅ Structured login-failure metrics per tenant
**Why:** Login failures are audit-logged but not emitted as structured metrics (e.g. Prometheus counters, Datadog events). Ops teams cannot alert on anomalous failure rates per tenant without scraping the audit log.
**Complexity:** Medium
**Multi-tenant relevance:** Brute-force attacks are tenant-specific; a global failure counter is useless for pinpointing which tenant is under attack.
**Multi-country relevance:** GDPR and NIS2 require breach notification within 72 hours of detecting a personal-data breach; automated alerting on failure spikes is a prerequisite for timely notification.

### ✅ Account lockout webhook / event emission
**Why:** When an account is locked (`lockoutMaxAttempts` exceeded), nothing outside the auth module is notified. Tenant admins and security teams have no real-time alert path.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant-scoped webhook delivery (e.g. posting to the tenant's incident-response Slack) requires the event to be emitted per-tenant.
**Multi-country relevance:** Some national cyber-security regulations require organisations to be notified of automated account blocks in near-real-time (e.g. French ANSSI guidelines, UK NCSC guidance).
