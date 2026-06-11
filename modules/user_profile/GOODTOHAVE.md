# Good to Have — User Profile Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Privacy / GDPR

### Profile Visibility Controls
**Why:** All profile fields are stored with no concept of public vs. private visibility; a user cannot mark their biography or phone as private, which is required for GDPR's data minimization principle when profiles are exposed through public-facing APIs.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenant products have different exposure models — a developer portfolio tenant makes profiles fully public, while an internal HR tool should keep them private-by-default.
**Multi-country relevance:** Jurisdictions differ on what personal data can be published without explicit consent; the EU requires opt-in for publicly accessible personal data, whereas other markets have weaker defaults.

### Profile Data Anonymization on Account Deletion
**Why:** `UserProfileService.delete` permanently removes the row, but there is no anonymization path — if other modules (e.g., audit logs, comments) reference the `userId`, the profile deletion leaves dangling references rather than replacing PII with placeholder values.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant-level erasure requests affect the shared profile store; coordinated anonymization must happen before the user row is erased.
**Multi-country relevance:** GDPR Article 17 and LGPD both require erasure of personal data; anonymization (replacing name/biography with `[deleted]`) is often preferable to hard deletion when the `userId` is referenced elsewhere.

---

## Multi-tenancy

### Per-Tenant Profile Field Configuration
**Why:** Profile fields (name, biography, profilePicture, headerImage, socialLinks) are fixed; tenants may need to expose a different subset (e.g., a healthcare tenant should not show social media links, an enterprise tenant may require a job title and department).
**Complexity:** High
**Multi-tenant relevance:** Core gap — a single profile schema cannot serve a developer portfolio product and an enterprise HRMS simultaneously; the field set must be configurable per tenant.
**Multi-country relevance:** Certain countries restrict the collection of personal data beyond what is strictly necessary; configurable fields allow tenants to disable collection of data they are not legally allowed to collect in their market.

### Per-Tenant Custom Profile Fields (JSONB Extension)
**Why:** Beyond field visibility, tenants often need entirely new fields (e.g., `department`, `employeeId`, `vatNumber`) that are not part of the base schema; there is no extension point today.
**Complexity:** High
**Multi-tenant relevance:** Directly enables product differentiation between tenants without modifying the core schema for every new business vertical.
**Multi-country relevance:** Different markets require different structured data (e.g., CPF in Brazil, national ID in Korea, GST number in India); a JSONB extension column with per-tenant schema validation is the standard solution.

---

## Profile Enrichment

### Avatar Upload via S3 (Not Just URL)
**Why:** `profilePicture` and `headerImage` accept arbitrary external URLs; there is no managed upload flow through the platform's existing AWS S3 integration, meaning images can be hot-linked from third-party hosts that may go offline or serve malicious content.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants may have their own S3 buckets or CDN configurations; the upload path should be routable per tenant.
**Multi-country relevance:** Data residency requirements (GDPR, China PIPL) may mandate that user images be stored in a specific geographic region; an unmanaged external URL gives no control over where the data lives.

### Avatar Moderation (NSFW Detection)
**Why:** There is no content moderation on profile pictures; in multi-tenant SaaS with end-user-uploaded avatars, inappropriate images can appear across all tenants sharing the system DB.
**Complexity:** High
**Multi-tenant relevance:** Tenants serving children or regulated industries (education, healthcare) have legal obligations to prevent NSFW content; they cannot control what other tenants' users upload to a shared profile store.
**Multi-country relevance:** Content regulations differ by country (Germany, UK, Australia have strict online-safety laws requiring active content moderation for platforms above certain scale).

### Verified Badge / Identity Verification Status
**Why:** There is no `isVerified` or identity-verification-status field on the profile; platforms like LinkedIn or X/Twitter use this to signal that a user's real-world identity has been confirmed.
**Complexity:** Medium
**Multi-tenant relevance:** Some tenants (legal, medical) require verified profiles before granting access to sensitive features; this field enables that gate.
**Multi-country relevance:** KYC (Know Your Customer) requirements in financial and regulated industries are jurisdiction-specific; a standardized verification-status field allows tenants to plug in country-appropriate ID verification providers.

### Display Name Moderation / Reserved Name Blocking
**Why:** Any user can set `name` to a reserved brand name (e.g., `Admin`, `Support`, tenant brand name) or offensive content; there is no blocklist validation on profile name creation.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant should be able to define its own reserved name list (e.g., blocking the tenant's own brand name from being used as a display name by users).
**Multi-country relevance:** Offensive or reserved terms differ by language and culture; localized blocklists are required for each market a tenant serves.

---

## Localization

### Localized Name Fields (First / Last / Display Name Split)
**Why:** The single `name` string cannot correctly represent naming conventions in cultures where family name precedes given name (East Asian, Hungarian) or where people have a single legal name.
**Complexity:** Medium
**Multi-tenant relevance:** HR and professional network tenants that integrate with directory services (Active Directory, LDAP) need structured name fields that map to directory attributes.
**Multi-country relevance:** Name ordering and structure vary significantly by country; storing a single string makes correct formatting for Japanese (`姓 名`), Korean, and Western audiences impossible from the same field.

### Pronouns Field
**Why:** There is no field for gender pronouns; several markets and product verticals (community platforms, HR tools) now require or strongly recommend this for inclusive user experiences.
**Complexity:** Low
**Multi-tenant relevance:** Tenant products targeting progressive workplaces or social communities need this field; it should be optional and per-tenant-configurable.
**Multi-country relevance:** Cultural acceptance and legal requirements for gender-related fields vary widely; the field must be free-form text (not an enum) to accommodate all regional norms.

---

## Developer Experience

### Social Link URL Validation at Persistence Time
**Why:** `SocialLinkItem.url` is validated as `z.string().url().nullable()` in Zod, but the service's `Object.assign` in `update` and `upsert` does not re-validate individual link items before writing, allowing invalid URLs to be persisted via partial updates.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact, but correctness is global.
**Multi-country relevance:** No direct multi-country impact.

### Profile Completeness Score
**Why:** There is no computed "completeness percentage" (e.g., 60% — missing biography and avatar); this metric drives onboarding nudges and is a standard feature in professional network and SaaS products.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant can define which fields contribute to completeness based on their product's required fields.
**Multi-country relevance:** Completeness requirements differ by product vertical and therefore indirectly by the tenant's target market.
