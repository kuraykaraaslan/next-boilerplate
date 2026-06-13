# Good to Have — User Security Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## ✅ Security hardening shipped (no mock)

- **OTP secret encryption at rest** — `otpSecret` is AES-256-GCM encrypted via
  `common/field-encryption` on every write and decrypted only on the way out
  (`hydrate`). The Redis cache holds ciphertext, not plaintext. Migration-safe:
  legacy plaintext is read through and re-encrypted on next write.
- **Backup code hashing at rest** — `generateBackupCodes()` returns plaintext
  once and stores SHA-256 hashes; `verifyAndConsumeBackupCode()` compares in
  constant time and single-uses the code.
- **Adaptive lockout** — `recordLoginAttempt` now applies exponential backoff
  past the threshold (capped at 24h).
- **Login anomaly detection + webhook** — new IP/device on success returns
  `{ anomaly }` and fires `security.login_anomaly`.
- **Security event webhooks** — `security.login_anomaly`, `security.mfa_enabled`,
  `security.mfa_disabled` registered in the catalog; `emitMfaChanged()` helper.
- **Per-tenant MFA enforcement policy** — `getMfaPolicy` / `isMfaRequiredFor`
  read `mfaRequired` + `mfaRequiredRoles`; `hasMfaConfigured` checks the user.
- **Trusted devices (remember-this-device)** — `trustDevice()` returns an opaque
  token (only its SHA-256 hash is stored, with expiry); `isDeviceTrusted()`
  verifies in constant time; `revokeTrustedDevices()` for logout-everywhere.

## Security

### Hardware Security Key (FIDO2 UV Required) Enforcement
**Why:** The passkey implementation uses `userVerification: 'preferred'` and `requireUserVerification: false`, meaning a passkey can authenticate without a PIN or biometric challenge; high-security tenants (banking, enterprise) need UV = required.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with different risk profiles need different UV requirements; a fintech tenant should enforce UV while a consumer app may keep it preferred. This should be a per-tenant auth policy key.
**Multi-country relevance:** Financial regulators in the EU (PSD2 Strong Customer Authentication) and UK require that authentication combine at least two factors including possession (passkey) and inherence (biometric UV); `preferred` alone does not satisfy SCA.

### ✅ OTP Secret Encryption at Rest
**Why:** `otpSecret` is stored as plain text in the `user_securities` table; if the database is exfiltrated, all TOTP secrets are immediately usable to bypass MFA for every user.
**Complexity:** Medium
**Multi-tenant relevance:** A compromise in one tenant's DB access path exposes the TOTP secrets of all platform users, not just that tenant's users, due to the shared system DB.
**Multi-country relevance:** GDPR Article 32 and various national data-protection laws require appropriate technical measures (encryption) to protect sensitive authentication credentials.

### ✅ Adaptive Lockout Based on IP / Geo-Risk
**Why:** The current lockout is purely counter-based (same threshold for a local admin and an attacker from a foreign IP); there is no IP reputation or geographic risk weighting that would lock faster for suspicious sources.
**Complexity:** High
**Multi-tenant relevance:** Tenants serving sensitive markets can configure a lower threshold for logins from unexpected countries while keeping the standard threshold for known-good locations.
**Multi-country relevance:** Geo-adaptive lockout directly reduces credential-stuffing risk from botnets concentrated in specific regions without punishing legitimate local users.

### ✅ Login Anomaly Notifications
**Why:** There is no mechanism to send the user a notification (email or push) when a login occurs from a new device or country; `lastLoginIp` and `lastLoginDevice` are stored but never compared against prior values.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant notification templates and the action taken on suspicious login (notify only vs. require re-auth) should be configurable per tenant.
**Multi-country relevance:** Several national consumer-protection guidelines (UK FCA, EU EBA) recommend or require banks and fintechs to notify users of logins from new devices.

### ✅ Security Event Webhook Emissions
**Why:** `user_security.service.ts` mutates critical security state (lockout, passkey registration, `mustChangePassword`) but emits no webhooks; downstream systems (SIEM, fraud detection) cannot react to these events in real time.
**Complexity:** Low
**Multi-tenant relevance:** Platform-level SIEM and per-tenant fraud-detection integrations need `user.locked`, `user.passkey.registered`, `user.mfa.disabled` events to be dispatched via the existing webhook infrastructure.
**Multi-country relevance:** PCI-DSS, ISO 27001, and several national cybersecurity frameworks require real-time security event logging to an external system.

### Passkey Attestation Verification
**Why:** `verifyRegistration` uses `attestationType: 'none'`, meaning the authenticator's identity (AAGUID) is not verified against the FIDO MDS; enterprise tenants may need to restrict to specific authenticator models (e.g., YubiKey 5 only).
**Complexity:** High
**Multi-tenant relevance:** Government, financial, and healthcare tenants may mandate specific FIDO-certified authenticator models; this cannot be enforced without FIDO MDS attestation validation.
**Multi-country relevance:** EU eIDAS 2.0 and US NIST AAL3 require hardware-bound authenticators with verified attestation; non-EU/US tenants may not need this, making it a per-tenant configuration.

### ✅ Backup Code Encryption at Rest
**Why:** `otpBackupCodes` are stored as plain text strings in a JSONB array; like the TOTP secret, a DB exfiltration exposes all backup codes, allowing an attacker to bypass MFA without ever triggering the rate limiter.
**Complexity:** Low
**Multi-tenant relevance:** Affects all platform users regardless of tenant; stored backup codes must be hashed (bcrypt/argon2) rather than stored in cleartext, just like passwords.
**Multi-country relevance:** Same as OTP secret: GDPR Article 32 and comparable laws require encryption of authentication credentials.

---

## Multi-tenancy

### Per-Tenant WebAuthn Relying-Party Configuration
**Why:** `RP_ID`, `ORIGIN`, and `RP_NAME` are global env vars; tenants with custom domains cannot bind passkeys to their own domain, meaning a passkey registered at `app.tenant-a.com` is unusable when the user logs in at `app.tenant-b.com`.
**Complexity:** High
**Multi-tenant relevance:** This is a fundamental WebAuthn limitation that requires per-tenant RP ID configuration — already flagged as a candidate in `POSTURE.md`; without it, passkeys are only practical on single-domain deployments.
**Multi-country relevance:** Tenants operating under country-specific top-level domains (`.de`, `.jp`, `.com.br`) need separate RP IDs; passkey bindings to a global domain break for country-specific deployments.

### ✅ Per-Tenant MFA Enforcement Policy
**Why:** MFA is user-optional today; tenants in regulated industries (finance, healthcare, government) must be able to mandate that all their users enroll at least one MFA method before accessing the tenant.
**Complexity:** Medium
**Multi-tenant relevance:** This is a per-tenant access policy: tenant A requires TOTP or passkey, tenant B allows password-only. The enforcement gate belongs in this module's security record check, driven by a tenant auth policy key.
**Multi-country relevance:** PSD2 (EU) mandates SCA for payment flows; HIPAA (US) recommends MFA for PHI access; NIS2 (EU) requires MFA for critical infrastructure. Each is a per-jurisdiction, per-tenant requirement.

### ✅ Trusted Device / Remember-This-Device
**Why:** There is no mechanism to mark a specific device as trusted for a period, allowing the system to skip step-up MFA for known devices; users on repeat-login flows face friction every session.
**Complexity:** Medium
**Multi-tenant relevance:** The trusted-device window (e.g., 30 days) and whether the feature is enabled at all should be configurable per tenant.
**Multi-country relevance:** PSD2 exemptions allow a 90-day re-authentication window for trusted devices in the EU; other jurisdictions may have different windows or prohibit the feature entirely.

---

## Privacy / GDPR

### Security Audit Log
**Why:** Security-critical events (passkey registration/deletion, TOTP enable/disable, lockout trigger, `mustChangePassword` set) are not logged with actor identity, timestamp, and IP; a user who is locked out or had their MFA disabled without their knowledge has no audit trail.
**Complexity:** Medium
**Multi-tenant relevance:** SOC 2 and ISO 27001 require immutable audit logs of privileged security operations; tenant admins who reset user MFA must appear in the log.
**Multi-country relevance:** GDPR Article 5(f) (integrity and confidentiality) and several national cybersecurity regulations (Germany BSI IT-Grundschutz, France ANSSI) require audit logging of authentication events.

### Lockout Duration Transparency
**Why:** When a user is locked, the API does not return *when* the lockout expires (`lockedUntil`); users have no way to know when to retry, leading to repeat failed attempts and support requests.
**Complexity:** Low
**Multi-tenant relevance:** The lockout duration varies per tenant (already per-tenant via auth policy); the expiry time should be surfaced to let the user or their tenant admin take appropriate action.
**Multi-country relevance:** Consumer-protection guidelines in several EU member states require users be informed of the reason and expected duration of account restrictions.

---

## Developer Experience

### Passkey Label Management (Rename)
**Why:** Users can add and delete passkeys but cannot rename them (e.g., change `Passkey 6/10/2025` to `Work MacBook`); there is no `updatePasskeyLabel` method in `UserSecurityPasskeyCrudService`.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact; usability improvement across all tenants.
**Multi-country relevance:** No direct multi-country impact.

### `isLocked` Response with Remaining Duration
**Why:** `isLocked` returns a `boolean`; callers that need to display "try again in 8 minutes" must re-fetch the raw `lockedUntil` timestamp separately, requiring two DB reads.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact.
**Multi-country relevance:** Localized lockout messages (displaying remaining time in the user's locale) require the seconds-remaining value, which this change would provide in one call.
