# Good to Have — Tenant Branding Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Asset Management & Security

### ✅ Logo/Favicon URL Validation and Hosted Upload
**Why:** `brandLogoLight`, `brandLogoDark`, `brandFavicon`, and `authWallpaper` accept arbitrary URL strings with no validation — a tenant can point them to an external domain that goes offline, or inject a CSP-busting URL.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant A's broken external CDN link should not cause a 404 on Tenant A's login page; operator-hosted storage ensures SLA-level availability per tenant.
**Multi-country relevance:** Self-hosting assets avoids cross-border data flows for images that may contain personal data (e.g., avatars used as logos), which matters under GDPR and PIPL.

### ✅ Custom CSS/JS Sanitization and Content-Security-Policy Gating
**Why:** `customCss` and `customJs` are stored verbatim up to 50 KB with no sanitization, XSS scanning, or CSP enforcement — a malicious tenant admin can inject scripts that exfiltrate tokens from all users of that tenant.
**Complexity:** High
**Multi-tenant relevance:** In a shared-shell multi-tenant app, injected JS from one tenant can read cookies or localStorage that might contain cross-tenant session data if the shell is not fully isolated.
**Multi-country relevance:** GDPR Art. 32 requires appropriate technical measures to ensure security — unvalidated JS injection is a reportable vulnerability under GDPR breach notification rules.

### ✅ Branding Version History / Rollback
**Why:** `update` overwrites values in-place; there is no audit trail of previous branding states, and `reset` is irreversible — a mistaken CSS deploy cannot be rolled back.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins performing white-label rebrands need a safety net; enterprise tenants expect change history for governance audits.
**Multi-country relevance:** SOC 2 and ISO 27001 require change management records — a versioned branding history satisfies this without a separate audit-log query.

## Localization & Multi-Language Support

### Per-Locale Branding Overrides
**Why:** A single `brandName` and `brandTagline` cannot serve a tenant operating in multiple countries under different local brand names (e.g., a company that uses "Acme" in English markets and "أكمي" in Arabic markets).
**Complexity:** High
**Multi-tenant relevance:** Global-tenant SaaS products need brand strings per locale; the current flat schema has no locale dimension.
**Multi-country relevance:** Right-to-left (Arabic, Hebrew) and character-set-sensitive (CJK) brand names require locale-specific overrides that are served based on the request's `Accept-Language` header.

### Email Template Branding Integration
**Why:** `brandLogoLight`, `brandPrimaryColor`, and `brandName` exist but are not automatically injected into transactional email templates — each email module must manually retrieve branding, creating inconsistency.
**Complexity:** Medium
**Multi-tenant relevance:** White-label SaaS requires every outbound email to carry the tenant's brand; today there is no contract between `tenant_branding` and the mail module.
**Multi-country relevance:** Unbranded emails (showing the platform's own name) in markets where the tenant sells under a different local brand undermine the white-label value proposition.

## Compliance & Governance

### ✅ GDPR-Required Legal Links (Privacy Policy, Terms of Service)
**Why:** There are no branding fields for per-tenant Privacy Policy URL, Terms of Service URL, or Cookie Policy URL — these are legally required on login pages and consent flows in the EU, UK, and many APAC countries.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has its own legal documents; a shared platform URL is not acceptable — the tenant's own ToS must be presented to their users.
**Multi-country relevance:** GDPR Art. 13/14 requires a Privacy Policy link at point of data collection; CCPA (California), LGPD (Brazil), and PDPA (Thailand) have analogous requirements, each pointing to a different legal document.

### Branding Export in Tenant Data Export
**Why:** `tenant_export` reads settings rows but does not specifically document or verify that all branding keys are exported; custom CSS/JS is potentially excluded from GDPR Art. 20 data-portability exports.
**Complexity:** Low
**Multi-tenant relevance:** Tenants leaving the platform need to take their branding configuration with them; this is part of the data portability obligation.
**Multi-country relevance:** GDPR Art. 20 data portability applies to any personal data stored on behalf of the tenant — their custom brand configuration counts.

## Performance & Caching

### Redis Cache for Branding Reads
**Why:** Every page render calls `SettingService.getByKeys` for 10 branding keys via a DB query; there is no branding-level Redis cache, so high-traffic tenants pay a DB round-trip on every page load.
**Complexity:** Low
**Multi-tenant relevance:** Branding is read on every request for every user of every tenant; the read-to-write ratio is extremely high — caching is the correct optimization.
**Multi-country relevance:** Geographically distributed deployments amplify latency on uncached reads; a Redis layer near each region's app servers eliminates cross-region DB hits for static branding data.

## Developer Experience

### Branding Preview / Dry-Run Endpoint
**Why:** There is no way to preview branding changes before saving them; a tenant admin must commit and then visually verify the result in the live UI.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants with brand-approval workflows need a "preview" state that can be reviewed internally before going live.
**Multi-country relevance:** No direct country relevance, but multi-region deployments where branding takes time to propagate through CDN caches benefit from a staging mechanism.
