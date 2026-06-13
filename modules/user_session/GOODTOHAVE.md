# Good to Have — User Session Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Security

### Tenant-Aware `refreshTokens` Absolute Lifetime
**Why:** `refreshTokens` calls `AuthPolicyService.getSessionPolicy()` without a `tenantId`, so token refresh always applies the platform default `sessionAbsoluteMaxHours` instead of the session owner's tenant policy — a known bug already flagged in `POSTURE.md`.
**Complexity:** Low
**Multi-tenant relevance:** A tenant that tightens `sessionAbsoluteMaxHours` to 4 hours (e.g., a banking tenant) sees its ceiling silently bypassed on every token refresh; the tenant-level security setting becomes ineffective.
**Multi-country relevance:** PSD2 (EU) mandates re-authentication every 90 days for open banking and every 5 minutes without active use; if the tenant has set a tight absolute max it must be honored on refresh.

### Refresh Token Rotation Audit Log
**Why:** Token refresh events are not logged anywhere; a compromised refresh token that triggers the reuse-detection purge leaves no forensic record of which IP and device performed the reuse attempt.
**Complexity:** Low
**Multi-tenant relevance:** SOC 2 Type II and ISO 27001 require immutable logs of authentication events; tenant security teams need refresh-token-reuse events to feed their SIEM.
**Multi-country relevance:** GDPR Article 33 requires breach notification within 72 hours; without audit logs, detecting and scoping a token-theft incident is impossible.

### Per-Tenant JWT Signing Keys
**Why:** All tenants share the global `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` environment variables; a single compromised signing key invalidates every session across all tenants simultaneously.
**Complexity:** High
**Multi-tenant relevance:** Tenant isolation at the signing-key level means a secret rotation for one tenant does not require a platform-wide token invalidation; critical for enterprise tenant SLAs.
**Multi-country relevance:** Data-sovereignty requirements in some jurisdictions may require that cryptographic keys reside in a specific geographic region or key management service (AWS KMS region, EU Cloud Act compliance).

### Session Binding to Accept-Language / Locale Header
**Why:** The device fingerprint is a SHA-256 hash of `ip|userAgent|acceptLanguage`, so locale is included in the fingerprint but is never stored independently; there is no way to invalidate sessions when a user changes their locale or to surface the session's locale to the admin panel.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact, but useful for session analytics.
**Multi-country relevance:** Storing the session locale allows the platform to detect when a user moves between countries and prompt re-authentication or preferences update.

### Step-Up Authentication for Sensitive Operations
**Why:** The session model has `otpVerifyNeeded` for MFA gating at login, but there is no mechanism for requiring re-authentication (step-up) for specific sensitive operations (e.g., payment confirmation, profile email change) within an already-authenticated session.
**Complexity:** High
**Multi-tenant relevance:** Financial and compliance tenants need step-up auth for high-value operations; the step-up policy (which operations trigger it, which methods are accepted) must be configurable per tenant.
**Multi-country relevance:** PSD2 SCA in the EU requires step-up for every payment transaction; this cannot be satisfied with a session-level OTP gate alone.

### ✅ Concurrent Session Count Limit Per Tenant
**Why:** `singleSessionOnly` is a boolean (all-or-nothing); there is no mid-range policy allowing, say, a maximum of 3 concurrent sessions — a common enterprise IAM feature.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants often license per-seat and want to enforce that each user occupies only one seat at a time; a numeric cap is more flexible than a binary toggle.
**Multi-country relevance:** No direct regulatory dependency, but common in enterprise SaaS sold in markets with strict license-compliance cultures (DACH, Nordic countries).

---

## Multi-tenancy

### Session Table `tenantId` Column (or Session-Level Tenant Tagging)
**Why:** Sessions have no `tenantId` column; it is impossible to list, revoke, or report on all sessions initiated through a specific tenant, or to enforce tenant-specific session policies at query time without joining through `tenant_member`.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins need to revoke all sessions initiated within their tenant (e.g., after a security incident); without a `tenantId` tag this is not feasible without a full table scan.
**Multi-country relevance:** Data-residency requirements may mandate that session records for users in a specific country be isolated; a `tenantId` tag is a prerequisite for applying such isolation.

### Impersonation Session Time-Limit Configurability
**Why:** Impersonation sessions are hardcoded to 1 hour (`IMPERSONATION_SESSION_TTL_MS`); some compliance environments require shorter windows (15 minutes) while support workflows may need longer ones.
**Complexity:** Low
**Multi-tenant relevance:** The allowed impersonation duration should be a per-tenant policy setting; a financial tenant may require all impersonation sessions to expire in 15 minutes with a mandatory audit entry.
**Multi-country relevance:** Financial regulatory frameworks (e.g., MiFID II, FCA) require documented and time-limited privileged access; a hardcoded 1-hour window cannot be tightened for regulatory compliance without a code change.

### Impersonation Consent / Audit Trail
**Why:** Impersonation sessions carry metadata (`impersonatorUserId`, `impersonatorSessionId`) but there is no audit log entry, no user notification, and no admin approval workflow for impersonation actions.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants and regulated-industry tenants require four-eyes approval and full audit trails for any privileged access to user accounts.
**Multi-country relevance:** GDPR Article 5 (accountability) requires that any processing of personal data by platform operators on behalf of a tenant be documented; impersonation without an audit log violates this principle.

---

## Privacy / GDPR

### Session Geolocation Storage
**Why:** The `ipAddress` is stored but the geo-location derived at login (country, city) is never persisted on the session row; the admin active-sessions panel can only show a raw IP, not a human-readable location.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins reviewing suspicious sessions need readable location information, not raw IPs.
**Multi-country relevance:** Persisting derived geo data alongside the raw IP raises GDPR considerations; the country code is generally safe as it is not directly identifying, but storing city may require a legitimate interest assessment in some jurisdictions.

### ✅ Session Data Erasure on Account Deletion
**Why:** `deleteAllSessions(userId)` is available and called by some auth flows, but there is no guarantee it is called atomically with user deletion in `UserService.delete`; orphaned session rows for deleted users remain in the DB.
**Complexity:** Low
**Multi-tenant relevance:** Tenant-initiated user removal (e.g., revoking a user's membership) should also terminate all that user's sessions to prevent access with a cached token.
**Multi-country relevance:** GDPR Article 17 erasure requires deletion of all data associated with the user, including active sessions; a separate session-purge step that may not be triggered is a compliance gap.

---

## Developer Experience

### Session Pagination for `getUserSessions`
**Why:** `getUserSessions` returns all `ACTIVE` sessions for a user in a single query with no pagination; a user who has accumulated many sessions (e.g., after frequent logins) will receive an unbounded result set.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with a large user base may have users with many sessions; unbounded queries affect DB performance for all tenants sharing the system DB.
**Multi-country relevance:** No direct multi-country impact.

### Session Re-Issue Without Login (Token Extension)
**Why:** There is no way to extend a session's `sessionExpiry` without a full token rotation; use cases like "keep me logged in" across a browser tab reopen require a lightweight extension call distinct from a full refresh cycle.
**Complexity:** Medium
**Multi-tenant relevance:** The extension window would be governed by the per-tenant `sessionAbsoluteMaxHours` policy.
**Multi-country relevance:** No direct multi-country impact, but idle-timeout regulations in some financial markets (PSD2: 5 minutes without user interaction) restrict how aggressively this can be offered.
