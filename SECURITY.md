# Security Policy

This project follows strict security standards to ensure the confidentiality, integrity, and availability of our systems and user data.

---

## ✅ Implemented Security Practices

### 1. Input Validation
- All incoming request payloads are validated using **Zod schema validation**.
- DTOs are enforced at every API boundary before reaching the service layer.
- Prevents SQL Injection, malformed payloads, and type coercion attacks.

### 2. Authentication
- Uses **JWT** stored in **httpOnly cookies** — never exposed to JavaScript.
- Supports **OTP**, **TOTP (authenticator app)**, **SAML SSO**, and **OAuth** (Google, GitHub, Apple, Microsoft, Facebook, LinkedIn, Twitter, Slack, TikTok, WeChat, Autodesk).
- Access and refresh tokens are separately signed secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`).
- Token revocation is supported via `user_session` invalidation.
- **Passkeys (WebAuthn)** are supported as a phishing-resistant alternative to passwords.
- **SAML JIT provisioning** (opt-in per tenant via `SamlConfig.allowJitProvisioning`) auto-creates `User` + `TenantMember` rows from SAML assertion attributes on first login; SAML attribute → `memberRole` mapping configurable via `SamlConfig.roleAttribute`. Every JIT creation is audit-logged with action `saml.jit_provisioned`.
- **SCIM 2.0 provisioning** at `/tenant/{tenantId}/api/scim/v2/...` accepts user create/update/delete from enterprise IdPs (Okta, Azure AD, OneLogin, Google Workspace). Bearer auth via tenant-issued `ApiKey` with scope `scim:write`. Each provisioning mutation is audit-logged. See [ADR 0004](docs/adr/0004-scim-provisioning.md).

### 3. Authorization (RBAC)
- Role-Based Access Control is enforced at the **route** and **service** level.
- Super-admin = a `TenantMember` of the root tenant (`ROOT_TENANT_ID`) with `memberRole='ADMIN'`. Customer-tenant roles are isolated per tenant.
- Admin impersonation (`auth_impersonation`) is gated behind root-tenant super-admin and fully audit-logged.

### 4. CSRF Protection
- All state-mutating requests are protected using a **CSRF secret** (`CSRF_SECRET`).
- Tokens are validated server-side on every non-GET request.

### 5. Rate Limiting
- Rate limiting is enforced using **Redis-backed mechanisms** (`modules/limiter`).
- Supports per-user, per-IP, and **per-tenant-plan** limiting strategies.
- Protection against brute-force, credential stuffing, and abuse.

### 6. Multi-Tenancy Isolation
- Every tenant-scope entity carries a `tenantId` column; every service-layer query filters on it (`where: { tenantId }`).
- `tenantDataSourceFor(tenantId)` enforces a per-tenant TypeORM DataSource. By default each tenant shares the same Postgres schema; operators may point individual tenants at dedicated databases via the `TenantDatabase` table.
- Tenant context is resolved in `proxy.ts` middleware and propagated explicitly through route params (`/tenant/[tenantId]/...`) — there are no ambient globals.
- Tenant-scoped API routes (`/tenant/[tenantId]/api/...`) require a valid tenant session via `TenantSessionNextService.authenticateTenantByRequest`.
- Tenant status (`SUSPENDED`/`INACTIVE`) is enforced in the auth pipeline; suspended tenants cannot transact even from the global-admin bypass path.
- Defense-in-depth caveat: enforcement is currently application-layer only. A future hardening step is Postgres row-level security (RLS) so a forgotten `where: { tenantId }` cannot leak data.

### 7. Session Management
- Sessions are tracked in the database via `user_session` and cached in Redis.
- New device alerts and suspicious activity notifications are emailed automatically.
- Sessions can be listed and revoked individually from the user's account panel.

### 8. API Key Management
- API keys (`api_key`) are hashed before storage — plaintext is only shown once at creation.
- Keys carry scoped permissions and can be revoked without affecting user sessions.

### 9. Idempotency
- Mutating API endpoints support **Redis-backed idempotency keys** (`redis_idempotency`).
- Prevents duplicate payment charges and double-submission side effects.

### 10. HTTP Security Headers
- Security headers are set via **Next.js middleware** and `next.config.ts`.
- Prevents clickjacking, MIME-sniffing, and XSS via `X-Frame-Options`, `X-Content-Type-Options`, and `Content-Security-Policy`.

### 11. CORS
- Cross-Origin Resource Sharing is restricted with explicit origin whitelisting.
- Wildcard origins (`*`) are not used in production.

### 12. Webhook Security
- Outgoing webhooks (`webhook`) are signed with a per-webhook secret.
- Delivery failures are retried with exponential backoff via BullMQ.
- System webhooks and tenant webhooks have separate signing contexts.

### 13. File Upload Security
- File uploads are streamed directly to S3-compatible storage — no local disk writes.
- MIME type and size validation are enforced before upload.
- Pre-signed URLs are used for client-side downloads, never exposing bucket credentials.

### 14. Centralized Error Handling
- All errors are processed through a global boundary using the `AppError` class.
- Operational errors return sanitized messages; unexpected errors return a generic 500.
- Stack traces are never leaked to API responses in production.

### 15. Logging & Audit Trail
- Structured logs are written via **Winston** (`modules/logger`) with console and file transports.
- User actions are recorded in `audit_log` (root-tenant-scoped for platform events, per-tenant for customer events).
- Each permission denial, impersonation event, and session change is logged.

---

## 🛡 Reporting Vulnerabilities

If you discover a security vulnerability in this project:

- Please **DO NOT** open a public GitHub issue.
- Instead, report it **privately** to: **kuraykaraaslan@gmail.com**

We take all vulnerability reports seriously and will respond within **48 hours**.

---

## 🏗 Future Improvements (Planned)
- [ ] OpenAPI/Swagger security response documentation (401, 403, 429)
- [ ] Automated secret rotation for tenant webhook signing keys
- [ ] CSP nonce support for inline scripts

---

## 🔐 Project Status

**Security Maturity Level:** `Advanced`  
**Last Audit:** _May 2026_
