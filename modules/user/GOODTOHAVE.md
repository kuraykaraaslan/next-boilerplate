# Good to Have — User Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Privacy / GDPR

### Right-to-Erasure (Hard Delete vs. Soft Delete)
**Why:** GDPR Article 17 requires that a user's personal data (email, phone) be anonymized or permanently removed on request, not merely soft-deleted with `deletedAt`.
**Complexity:** Medium
**Multi-tenant relevance:** A user may belong to multiple tenants; erasure must be coordinated across all memberships before the user record is anonymized.
**Multi-country relevance:** GDPR (EU), LGPD (Brazil), PDPA (Thailand), and CCPA (California) all have erasure provisions; the platform must satisfy the strictest applicable regulation for each user's jurisdiction.

### Data Export (Right of Portability)
**Why:** GDPR Article 20 entitles users to receive their personal data in a machine-readable format; there is no `export` operation today.
**Complexity:** Medium
**Multi-tenant relevance:** Export must aggregate data owned by the user across all tenant memberships (sessions, preferences, profile, social accounts) into one downloadable package.
**Multi-country relevance:** Several data-protection laws (GDPR, CCPA, LGPD) mandate portability; the export format and delivery mechanism may need to differ per jurisdiction.

### Consent Timestamp on User Creation
**Why:** Many regulations require recording when and under what policy version a user gave consent to terms of service and privacy policy.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant may operate under different terms; per-tenant consent records must be stored separately from the platform-wide user row.
**Multi-country relevance:** GDPR (Article 7), LGPD, and PIPL (China) all require provable, timestamped consent; the lawful basis differs by jurisdiction.

---

## Security

### Phone Number Verification Flow
**Why:** The `phone` column exists but there is no OTP-based phone verification or `phoneVerifiedAt` timestamp, leaving unverified phone numbers usable for SMS OTP.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants may require phone verification before enabling SMS MFA; the verification policy should be configurable per tenant.
**Multi-country relevance:** Phone verification requirements and the choice of SMS provider (Twilio, Vonage, local carrier) vary by country due to telecom regulations and cost.

### Username / Handle Field
**Why:** Many SaaS products require a unique, URL-safe username distinct from the email; the entity only stores email as identity.
**Complexity:** Low
**Multi-tenant relevance:** Tenants (e.g., a community platform) may want per-tenant namespaces or globally unique usernames depending on the product type.
**Multi-country relevance:** Username normalization must handle Unicode (CJK characters, Arabic, etc.) for multi-country user bases.

### Breach / Compromised Password Detection on Create
**Why:** Checking new passwords against the Have I Been Pwned database (k-anonymity API) catches the most commonly leaked passwords without storing them.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with stricter security postures (e.g., finance, healthcare) may want this check enforced even if the platform default is off.
**Multi-country relevance:** No regulatory dependency, but useful globally; the external API call should be optional for air-gapped deployments in certain countries.

### User Creation Audit Trail
**Why:** There is no record of *who* created a user (which admin, via which IP), only the `createdAt` timestamp, making forensic investigation after unauthorized account creation impossible.
**Complexity:** Low
**Multi-tenant relevance:** Root-admin actions that affect all tenants require a traceable audit log for SOC 2 and ISO 27001 compliance.
**Multi-country relevance:** Financial and healthcare regulations in multiple jurisdictions mandate operator audit trails with actor identity and timestamps.

---

## Multi-tenancy

### Per-Tenant Password Policy Enforcement on Create
**Why:** `CreateUserRequestSchema` enforces a fixed minimum of 8 characters globally; tenants may configure stricter policies (length, complexity, special characters) that are not validated during user creation by root admins.
**Complexity:** Medium
**Multi-tenant relevance:** Directly addresses per-tenant password policy, which already exists in the auth module but is bypassed when a user is created via this service outside the tenant auth flow.
**Multi-country relevance:** Some national regulations specify minimum password strength (e.g., NIS2 in the EU for critical infrastructure tenants).

### Tenant-Scoped User Search / Filtering
**Why:** `getAll` searches across all platform users; there is no way to list users scoped to a specific tenant's membership, forcing callers to join with `tenant_member` themselves.
**Complexity:** Medium
**Multi-tenant relevance:** Admins managing a specific tenant need to see only that tenant's members without writing custom queries outside this module.
**Multi-country relevance:** Data residency requirements may restrict which admin can query users from which region; a tenant-scoped filter is a prerequisite for applying those restrictions.

---

## Localization

### Locale / Country Field on User
**Why:** There is no `locale` or `country` field on the user entity itself; this information is needed for sending compliant transactional emails, applying tax rules, and directing regulatory workflows.
**Complexity:** Low
**Multi-tenant relevance:** Tenants targeting specific markets may need to filter or segment their user base by country.
**Multi-country relevance:** Tax (VAT, GST), regulatory jurisdiction, and language-of-communication requirements all depend on knowing a user's country.

---

## Developer Experience

### Bulk User Import with Conflict Resolution
**Why:** There is no batch `createMany` operation; importing users from a CSV or from a legacy system requires calling `create` in a loop with no transactional safety or partial-success reporting.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant onboarding often involves importing an existing user directory; the import needs to handle duplicate emails gracefully per tenant.
**Multi-country relevance:** Data migration may originate from systems in different countries with different field encodings (phone format, name ordering), requiring normalization during import.

### Paginated Search by Phone Number
**Why:** `getAll` only searches by email (`ILike`); there is no way to look up a user by phone number, which is indexed on the entity.
**Complexity:** Low
**Multi-tenant relevance:** Support teams within a tenant often identify users by phone rather than email; missing this forces workarounds.
**Multi-country relevance:** In many markets (South-East Asia, Middle East) phone number is the primary identifier, not email.
