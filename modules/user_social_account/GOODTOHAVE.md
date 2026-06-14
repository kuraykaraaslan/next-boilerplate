# Good to Have — User Social Account Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Security

### ✅ Token Encryption at Rest
**Why:** `accessToken` and `refreshToken` from OAuth providers are stored as plain text in the `user_social_accounts` table; if the database is exfiltrated, all stored OAuth tokens are immediately usable to impersonate users on third-party platforms.
**Complexity:** Medium
**Multi-tenant relevance:** A breach in the shared system DB exposes tokens for all tenants' users simultaneously; encryption with a platform-managed or tenant-scoped key limits the blast radius.
**Multi-country relevance:** GDPR Article 32 and national equivalents (LGPD, PIPL) require "appropriate technical measures" for protecting personal data; OAuth tokens that grant third-party access to user accounts are high-sensitivity credentials.

### ✅ Token Expiry Tracking and Proactive Refresh
**Why:** The entity stores `accessToken` and `refreshToken` but has no `tokenExpiresAt` column; the platform cannot proactively refresh tokens before they expire and has no way to surface to the user that a linked account needs re-authorization.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants that use linked social accounts for ongoing data access (calendar, email, contacts) need reliable token freshness; silent token expiry breaks tenant features without a clear error path.
**Multi-country relevance:** Some OAuth providers (Google, Microsoft) enforce short access token lifetimes and require server-side refresh; providers dominant in specific markets (e.g., WeChat in China, Autodesk in manufacturing markets) have their own refresh semantics that differ from the standard OAuth spec.

### ✅ OAuth Token Scope Storage
**Why:** There is no `scopes` column; the platform cannot verify whether a stored token has the permissions required for a downstream operation, or detect when a user re-authorizes with reduced scopes.
**Complexity:** Low
**Multi-tenant relevance:** Different tenants may request different scopes from the same provider (e.g., tenant A requests `read:email` only, tenant B requests `read:email,write:calendar`); without stored scopes the link record is ambiguous.
**Multi-country relevance:** Some national privacy authorities (French CNIL, German BfDI) scrutinize OAuth scope breadth; minimal-scope enforcement becomes auditable only when scopes are stored.

### ✅ Unlink Safety Check (Last Login Method)
**Why:** A user can unlink their last or only authentication method (e.g., a user who signed up via GitHub with no password and no other social account); there is no guard against creating a login-method-less account.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact, but a user locked out of their account generates support load for every tenant they belong to.
**Multi-country relevance:** No direct multi-country impact.

---

## Multi-tenancy

### ✅ Per-Tenant Enabled Provider Allowlist
**Why:** Any provider in `SocialAccountProviderEnum` can be linked regardless of the tenant's configured SSO; a tenant that has not set up GitHub OAuth should not allow users to link GitHub accounts from the account panel.
**Complexity:** Medium
**Multi-tenant relevance:** Core gap — tenant operators configure which SSO providers are active for their tenant in the auth settings; `user_social_account` should respect that configuration and reject link attempts for unconfigured providers.
**Multi-country relevance:** Some providers are not available or not trusted in specific countries (e.g., Google OAuth is unreliable in mainland China, Twitter/X is blocked in several markets); per-tenant provider allowlists enable market-specific provider sets.

### ✅ Tenant-Scoped Social Account Listing
**Why:** `getByUserId` returns all a user's linked accounts from all providers, with no filtering by which providers the querying tenant has enabled; the account panel may show connectors that are irrelevant or unconfigured for the current tenant.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's account-management UI should only surface providers relevant to that tenant's enabled SSO configuration.
**Multi-country relevance:** Provider relevance varies by market; Chinese tenants may show WeChat instead of Google, requiring per-tenant filtering.

---

## Privacy / GDPR

### ✅ Social Account Audit Log (Link / Unlink Events)
**Why:** Link and unlink operations are not logged with actor identity, timestamp, or IP; if an attacker links a malicious OAuth account to hijack a user's identity, there is no forensic record.
**Complexity:** Low
**Multi-tenant relevance:** Tenant security admins need visibility into social-account link/unlink events in their tenant's activity feed.
**Multi-country relevance:** GDPR Article 5 (accountability) and ISO 27001 require audit trails for security-relevant operations on personal data, including identity federation changes.

### ✅ User Notification on New Social Account Link
**Why:** When a new OAuth provider is linked to a user's account (whether by the user or via a callback), no email or push notification is sent; an account takeover via OAuth linking would go undetected until the user notices.
**Complexity:** Low
**Multi-tenant relevance:** The notification channel and template should be configurable per tenant; some tenants may use in-app notifications while others use email.
**Multi-country relevance:** Several national consumer-protection frameworks recommend notifying users of security-relevant account changes; GDPR breach-notification timelines (72 hours) are easier to meet when users self-report via notification.

### ✅ Social Account Data Erasure on User Deletion
**Why:** `UserService.delete` does not cascade to `user_social_accounts`; deleted users leave orphaned rows with OAuth tokens, which may still be usable by anyone with DB access.
**Complexity:** Low
**Multi-tenant relevance:** Tenant-level user removal must also revoke and delete social account links; otherwise orphaned tokens remain valid and accessible.
**Multi-country relevance:** GDPR Article 17 erasure requires deletion of all personal data associated with a user, including third-party access tokens and the linked identity records themselves.

---

## Localization / Multi-country

### ✅ Regional Provider Support
**Why:** The provider enum covers Western-centric OAuth providers; major regional providers are missing — WeChat (China, 1.3B users), Kakao (South Korea), LINE (Japan, Thailand, Taiwan), VK (Russia/CIS), Yandex (Russia), Naver (South Korea).
**Complexity:** Medium
**Multi-tenant relevance:** Tenants targeting Asian or CIS markets cannot offer their local users a familiar login method, forcing email/password-only signup in markets where social login is the dominant pattern.
**Multi-country relevance:** Social login adoption rates and dominant providers differ dramatically by region; a multi-country boilerplate without regional providers is effectively locked out of several high-growth markets.

---

## Developer Experience

### ✅ Webhook Emissions for Link / Unlink Events
**Why:** `link` and `unlink` are silent operations; there are no `user.social_account.linked` / `user.social_account.unlinked` webhook events, meaning downstream systems (e.g., a CRM, a fraud-detection service) cannot react to identity federation changes.
**Complexity:** Low
**Multi-tenant relevance:** Platform-level webhooks (`WebhookService.dispatchPlatformEvent`) already exist for user lifecycle; social account events should follow the same pattern.
**Multi-country relevance:** No direct multi-country impact, but is required for SOC 2 audit trail completeness.

### ✅ Batch Link Status Check (For OAuth Token Health)
**Why:** There is no bulk method to check which of a user's linked accounts have expired tokens; callers must fetch all accounts and iterate, making it expensive to show a "re-authorize required" badge in the UI.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact; a single optimized query improves performance for all tenants.
**Multi-country relevance:** No direct multi-country impact.
