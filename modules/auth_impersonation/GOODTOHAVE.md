# Good to Have — Auth Impersonation

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Security

### Per-tenant configurable impersonation session TTL
**Why:** The impersonation session lifetime is a hardcoded 1-hour constant (`IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000`) in the session service. Ordinary sessions already vary their idle timeout and absolute max per tenant via `AuthPolicyService.getSessionPolicy`; impersonation sessions are inconsistently exempt.
**Complexity:** Low
**Multi-tenant relevance:** A high-security tenant (e.g. a financial-services tenant or a healthcare tenant) would need support impersonation windows of 15 minutes. A development/staging tenant might want longer. A fixed global TTL satisfies neither.
**Multi-country relevance:** Regulatory frameworks for privileged-access management (e.g. EU NIS2 Art. 21, UK Cyber Essentials Plus, German BSI C5) require that privileged sessions be bounded to the minimum necessary duration — a per-tenant knob is the only way to enforce this without global platform changes.

### System-flow impersonation not exposed via HTTP route (admin-only route missing)
**Why:** `startSystemImpersonation` is a service method only — there is no route that lets a platform admin initiate a system-level impersonation session via the API. The tenant flow has a route; the system flow does not. A platform support engineer must currently write code or use a database workaround.
**Complexity:** Medium
**Multi-tenant relevance:** System admins managing dozens of tenants need a consistent, audited HTTP surface; lacking one means support operations bypass the module's audit trail entirely.
**Multi-country relevance:** Privileged-access management requirements (NIS2, ISO 27001 A.9.4) demand that all privileged operations go through audited, access-controlled channels — a missing route means the audit trail has gaps.

### Re-authentication (step-up) required before starting impersonation
**Why:** Any session currently valid as `ADMIN` or `OWNER` can initiate impersonation with no additional credential confirmation. For impersonation — a high-risk privileged action — a step-up challenge (password re-entry or TOTP) should be required to prevent hijacked admin sessions from silently starting impersonation.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins have varying MFA postures; a tenant with `adminRequireMfa=true` still does not get a re-auth challenge before impersonation begins.
**Multi-country relevance:** EU NIS2 and PSD2 strong-customer-authentication requirements apply to privileged administrative operations. A step-up challenge before impersonation is the standard control mapped to these requirements.

### Impersonation rate limiting per impersonator
**Why:** The impersonation start routes are rate-limited via `Limiter`, but there is no per-impersonator cap on how many concurrent or sequential impersonation sessions can be created. A compromised admin account could spin up dozens of parallel impersonation sessions to exfiltrate data from multiple users simultaneously.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's admin role should be limited to a sensible number of concurrent impersonation sessions (e.g. 1 at a time) to prevent abuse.
**Multi-country relevance:** GDPR Article 32 requires technical measures to ensure ongoing confidentiality; unbounded impersonation sessions represent a disproportionate access risk.

---

## Compliance

### Impersonation consent / disclosure banner propagation
**Why:** When a user is being impersonated, the impersonating admin sees the target's UI but there is no mechanism to surface a persistent disclosure banner to the impersonating admin confirming the impersonation context. Support staff must rely solely on metadata in the session to know they are acting on behalf of another user, which introduces operational risk.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins using impersonation for support workflows need a clear, persistent indicator to avoid accidentally making changes they attribute to themselves.
**Multi-country relevance:** Some national data-protection authorities (e.g. Germany's BfDI) require that administrator access to user data be clearly logged and disclosed at the time of access. A visible indicator in the admin UI supports this requirement.

### Mandatory reason/justification field for impersonation start
**Why:** `startSystemImpersonation` and `startTenantImpersonation` accept no free-text reason. Audit log entries capture `flow`, `tenantId`, and `targetTenantRole` but not the business justification. Compliance audits (SOC 2 Type II, ISO 27001) require that privileged access be tied to a tracked reason (ticket ID, customer request reference).
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's SOC 2 or ISO 27001 audit requires a reason for every impersonation session in the audit log. Without a reason field, the platform cannot pass tenant-facing compliance audits.
**Multi-country relevance:** GDPR Art. 5(1)(b) (purpose limitation) requires that personal data be accessed only for specified purposes — an audit record without a stated purpose cannot demonstrate purpose-limitation compliance.

### Impersonation session auto-expiry notification
**Why:** When an impersonation session expires (after the 1-hour TTL), the admin's UI simply stops working. There is no notification to the admin that the session has lapsed, nor any way to extend it without re-initiating the full impersonation flow.
**Complexity:** Low
**Multi-tenant relevance:** Support workflows that span more than one hour have no graceful path — the admin is silently disconnected, and any unsaved work in the target's context is lost.
**Multi-country relevance:** No direct country impact, but operational reliability of support tooling is relevant to SLA commitments made to enterprise tenants in regulated industries.

---

## Multi-tenancy

### Tenant-admin impersonation restricted to their own tenant members only
**Why:** `startTenantImpersonation` correctly gates on the target being a member of the request tenant, but there is no enforcement at the route layer preventing a tenant admin from supplying a `targetUserId` belonging to a different tenant and probing for `TARGET_NOT_MEMBER_OF_TENANT` to confirm user existence across tenants.
**Complexity:** Low
**Multi-tenant relevance:** Cross-tenant user enumeration via impersonation endpoint is a multi-tenancy isolation failure. A generic "not found" response (rather than "not a member of this tenant") would close the gap.
**Multi-country relevance:** GDPR Art. 32 requires technical isolation between controllers/tenants; cross-tenant enumeration via a privileged API violates this requirement.

### Impersonation session list API scoped to the requesting tenant
**Why:** `GET /tenant/[tenantId]/api/users/[userId]/impersonation-sessions` returns all impersonation sessions for a user across all tenants, not just those relevant to the requesting tenant. A tenant admin could see impersonation sessions initiated by admins from other tenants of the same user.
**Complexity:** Low
**Multi-tenant relevance:** Impersonation-session visibility should be strictly scoped to the tenant whose admin is making the request, preventing cross-tenant information leakage.
**Multi-country relevance:** GDPR data minimisation (Art. 5(1)(c)) requires that admins only see the data they have a legitimate need to see — cross-tenant session records do not meet this standard.

### Tenant-level impersonation opt-out
**Why:** There is no setting that lets a tenant completely disable impersonation for its users. A tenant with high data-sensitivity (e.g. a legal-services or healthcare tenant) may require that even platform admins cannot impersonate their users, and all support must be provided through logged read-only tooling instead.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise procurement requirements for high-security SaaS products often include a clause prohibiting vendor-side admin access to user data. An impersonation opt-out is the standard control.
**Multi-country relevance:** GDPR Art. 28 (processor contracts) and equivalent obligations under LGPD and KVKK require that data processors demonstrate technical controls limiting their own access to controller data. An opt-out satisfies this requirement.

---

## Monitoring

### Impersonation duration tracking in the audit log
**Why:** `IMPERSONATION_STARTED` and `IMPERSONATION_ENDED` are both logged, but the audit log does not link them by a shared session ID nor record the computed duration in the `ENDED` event. SOC 2 Type II access-review reports require duration data.
**Complexity:** Low
**Multi-tenant relevance:** Tenant-level compliance reports (e.g. quarterly SOC 2 reports provided to enterprise tenants) require per-session duration for the access-review evidence package.
**Multi-country relevance:** ISO 27001 Annex A.9.4 (privileged access management) controls require evidence that privileged sessions were bounded — duration in the log is the simplest evidence artefact.

### Real-time alerting on unusual impersonation patterns
**Why:** There is no mechanism to alert when an admin starts more than N impersonation sessions in a time window, or when an impersonation targets a high-privilege user. The audit log captures individual events but nothing aggregates them into anomaly signals.
**Complexity:** High
**Multi-tenant relevance:** Per-tenant anomaly thresholds (e.g. alert when any single admin starts more than 3 impersonation sessions per hour) would require tenant-scoped metric emission that does not exist.
**Multi-country relevance:** NIS2 Art. 21 requires "monitoring" as a security measure for essential and important entities; anomaly detection on privileged-access patterns is the standard implementation.

---

## Developer Experience

### Test coverage for `startSystemImpersonation` via an HTTP route
**Why:** The system-impersonation service method has unit tests, but there is no integration test for the HTTP layer because the route does not yet exist. Adding the route and its tests together would complete the test surface.
**Complexity:** Medium
**Multi-tenant relevance:** A missing route means there is no tested path for platform-level support workflows, leaving platform ops without a reliable tool.
**Multi-country relevance:** No direct country impact, but audit evidence for SOC 2 and ISO 27001 requires demonstrable test coverage of privileged operations.
