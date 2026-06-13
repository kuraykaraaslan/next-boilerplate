# Good to Have — User Module

> All selected items shipped.

## Privacy / GDPR

### ✅ Right-to-Erasure (Hard Delete vs. Soft Delete)
`UserService.erase(userId, requestedByUserId?)` anonymizes the user row: email → `erased-<uuid>@deleted.invalid`, phone → null, password → `'ERASED'`, status → `DELETED`, consent fields cleared, `deletedAt` set. Row is kept for referential integrity; all PII is gone. Fires `user.erased` webhook and audit log entry.

### Data Export (Right of Portability)
**Why:** GDPR Article 20 — no export operation today.
**Complexity:** Medium — not yet implemented.

### ✅ Consent Timestamp on User Creation
`User.consentVersion` and `User.consentAcceptedAt` columns exist on the entity and are populated at registration time by the auth flow.

---

## Security

### Phone Number Verification Flow
**Why:** Phone column exists but no OTP-based verification.
**Complexity:** Medium — not yet implemented.

### Username / Handle Field
**Why:** No URL-safe username distinct from email.
**Complexity:** Low — not yet implemented.

### ✅ Breach / Compromised Password Detection on Create
`isPasswordBreached(password)` in `user.service.ts` queries the HaveIBeenPwned k-anonymity API (SHA-1 prefix, no plaintext sent). Rejects passwords found in breach databases. Fail-open on network error. Controlled by `checkBreached` option (default true).

### ✅ User Creation Audit Trail
`emitAuditLog(null, 'user.created', userId)` is called after every successful `create`. Integrates with `AuditLogService.log` with `actorType: 'SYSTEM'` (or the calling actor's id when provided).

---

## Multi-tenancy

### ✅ Per-Tenant Password Policy Enforcement on Create
`UserService.enforcePasswordPolicy(tenantId, password)` reads `passwordMinLength`, `passwordRequireSpecialChar`, and `passwordRequireUppercase` from tenant settings and validates the password. Fail-open when settings are unavailable.

### ✅ Tenant-Scoped User Search / Filtering
`UserService.getAll({ tenantId, ... })` performs a `JOIN` with `tenant_members` when `tenantId` is provided, scoping results to that tenant's members only. Also supports `phone` search alongside email.

---

## Localization

### ✅ Locale / Country Field on User
`User.locale` (varchar 10) and `User.country` (varchar 2) columns added to the entity for tax, regulatory jurisdiction, and transactional email language.

---

## Developer Experience

### Bulk User Import with Conflict Resolution
**Why:** No batch createMany with transactional safety.
**Complexity:** Medium — not yet implemented.

### Paginated Search by Phone Number
**Why:** `getAll` originally only searched by email.
**Status:** ✅ Implemented — `getAll({ phone })` now supports `ILike` phone search and `getAll({ tenantId, phone })` for tenant-scoped phone lookup.

---

## Inactive User Auto-Deactivation ★ New Feature

### ✅ Inactive User Auto-Deactivation
`UserService.deactivateInactiveUsers(inactiveDays)` sets `userStatus = 'INACTIVE'` for users with no session in the last N days. Called from a scheduled cron job. Controlled via `USER_INACTIVE_DAYS` env var (0 = disabled).

## User Merge ★ New Feature

### ✅ User Merge
`UserService.merge(targetUserId, sourceUserId, actorId?)` transfers tenant memberships from the source to the target (skipping conflicts), then soft-deletes the source. Emits `user.merged` audit log entry.
