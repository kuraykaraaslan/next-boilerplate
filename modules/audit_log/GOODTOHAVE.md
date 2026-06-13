# Good to Have — Audit Log Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Retention & Lifecycle

### ✅ Per-Tenant Configurable Retention Policy
**Why:** The service keeps all audit rows forever (`log()` always inserts, `getAll()` never prunes); there is no background job or per-tenant setting that applies an `auditLogRetentionDays` window, so storage grows unbounded.
**Complexity:** Medium
**Multi-tenant relevance:** A startup tenant may want 30-day retention to control DB size, while a regulated enterprise tenant may legally require 7 years — the policy must be configurable per tenant.
**Multi-country relevance:** GDPR Article 5(1)(e) mandates data be kept no longer than necessary; equivalent laws in Brazil (LGPD), Canada (PIPEDA), and Japan (APPI) impose similar storage-limitation obligations that vary by data category and country.

### ✅ Automated Retention Purge Job
**Why:** Even when a retention setting exists, enforcement requires a scheduled background sweep that deletes or archives rows older than the tenant's retention window — this sweep does not exist today.
**Complexity:** Medium
**Multi-tenant relevance:** Automated purge protects each tenant's DB from unbounded growth without manual DBA intervention, and is a prerequisite for demonstrating GDPR compliance to enterprise customers.
**Multi-country relevance:** Multiple jurisdictions (Germany BDSG, Australia Privacy Act, South Korea PIPA) impose maximum retention periods for audit data containing personal information; automated deletion is the only scalable enforcement mechanism.

### ✅ Archive-Before-Delete (Cold Storage Export)
**Why:** Purging rows directly loses historical data that may be required for legal holds or retrospective investigations; a pre-purge export to cold storage (S3 / GCS) should precede deletion.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants with legal-hold obligations cannot accept permanent deletion; exportable archives let tenants satisfy both storage-limitation and data-preservation requirements simultaneously.
**Multi-country relevance:** UK Companies Act, US SOX, and EU financial regulations mandate minimum record-keeping periods (often 5–7 years) that outlast operational database retention windows; cold archive bridges the gap.

---

## GDPR & Privacy Compliance

### ✅ Right-to-Erasure (GDPR Art. 17) — Pseudonymization of `actorId`
**Why:** Audit rows store `actorId` (a direct user UUID) with no pseudonymization path; when a user exercises the right to erasure, the platform cannot delete or anonymize their identity in audit rows without compromising the audit trail's integrity.
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant subject to GDPR (i.e. any tenant with EU users) must be able to respond to user erasure requests within 30 days; `actorId` anonymization is the minimum viable compliance path.
**Multi-country relevance:** GDPR (EU/EEA/UK), LGPD (Brazil), PIPL (China), PDPA (Thailand), and similar laws across 130+ countries grant individuals erasure or anonymization rights over their personal data — the same mechanism covers all of them.

### ✅ Right-to-Access Export (GDPR Art. 15) — Per-User Log Export
**Why:** There is no endpoint to export all audit rows where `actorId` matches a specific user, which is a prerequisite for responding to Subject Access Requests (SARs).
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins must be able to produce per-user audit history on demand; doing it manually via the paginated `getAll` endpoint is impractical for large audit trails.
**Multi-country relevance:** GDPR Art. 15, UK GDPR, CCPA, LGPD, and equivalent laws all grant data-subject access rights that require exportable personal data summaries — this is not EU-only.

### ✅ Consent-Aware Metadata Scrubbing
**Why:** The `metadata` JSONB column can contain arbitrary fields from any module; modules may inadvertently store personal data (email addresses, names, free-text reasons) that must be scrubbed on erasure or after retention expiry.
**Complexity:** High
**Multi-tenant relevance:** Different tenants have different data-sensitivity profiles; a healthcare tenant's metadata may contain patient references requiring strict scrubbing, while a B2B SaaS tenant's metadata may only need user-ID anonymization.
**Multi-country relevance:** HIPAA (US), GDPR (EU), and PIPL (China) impose category-specific personal data handling rules that affect which metadata fields can be retained, for how long, and in what form.

---

## Tamper-Proofing & Integrity

### ✅ Append-Only Row Signature / Hash Chain
**Why:** The `AuditLog` entity has no integrity check; a database admin (or a compromised service) can delete or modify rows without any detection mechanism — the trail is only "append-only by convention."
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants undergoing security audits must demonstrate that audit logs cannot be retroactively altered; a cryptographic hash chain makes tampering detectable.
**Multi-country relevance:** NIS2 (EU), DORA (EU financial sector), FedRAMP (US government), and financial-sector regulations across multiple markets require tamper-evident audit trails as a technical control.

### Separate Audit Log Store (Write-Once)
**Why:** Audit rows live in the same per-tenant PostgreSQL database that application code writes to; a compromised application credential can delete rows. A separate append-only store (e.g. a write-only database user, an immutable S3 bucket, or a dedicated log aggregator) would provide true tamper resistance.
**Complexity:** High
**Multi-tenant relevance:** Separating audit storage from operational storage limits the blast radius of a compromised tenant data source — the audit trail survives even if the operational DB is compromised.
**Multi-country relevance:** GDPR recital 49, ISO 27001 Annex A.12.4, and sector-specific controls (PCI-DSS Req. 10) require logs to be protected from modification by the parties being audited.

### Row-Level `deletedAt` Soft-Delete Guard
**Why:** Rows can be physically deleted with a direct SQL statement (e.g. by a misconfigured migration); a soft-delete guard or `UpdateDateColumn` would detect unexpected deletions in integrity checks.
**Complexity:** Low
**Multi-tenant relevance:** Accidental hard-deletes during migrations or bulk-cleanup scripts would silently corrupt the audit trail for any affected tenant.
**Multi-country relevance:** Audit trail completeness is a mandatory control in most compliance frameworks; even accidental data loss must be detectable and reportable.

---

## Querying & Reporting

### ✅ Date-Range Filter on `getAll`
**Why:** `GetAuditLogsDTO` has no `fromDate`/`toDate` fields; querying audit logs for a specific incident window requires reading all rows and filtering client-side, which is impractical at scale.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins investigating security incidents need to scope queries to a time window; unbounded queries over millions of rows will time out on large tenants.
**Multi-country relevance:** Regulatory audit submissions (e.g. GDPR DPA investigations, SEC inquiries) require producing logs for a specific date range — a missing filter makes compliance response operationally expensive.

### ✅ Bulk Export (CSV / NDJSON)
**Why:** The only data access path is the paginated `getAll` API capped at 100 rows per page; exporting a full audit trail for a compliance submission requires N sequential API calls with no built-in export mechanism.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants with years of audit history need a single-call export that streams all rows without saturating the API rate limiter.
**Multi-country relevance:** Regulatory bodies in the EU, UK, Australia, and Singapore request log exports in structured formats (CSV, JSON) during audits; a native export endpoint is a practical compliance necessity.

### ✅ Cross-Tenant Aggregated View (Root Admin)
**Why:** Root-tenant admins can only query one tenant's logs at a time via `tenantId`; there is no cross-tenant aggregated view for platform-wide incident investigation (e.g. "show all `auth.login_failed` events across all tenants in the last hour").
**Complexity:** Medium
**Multi-tenant relevance:** Platform security teams need cross-tenant observability to detect coordinated attacks (e.g. credential-stuffing hitting multiple tenants simultaneously).
**Multi-country relevance:** Multi-country platform operators running a regional cluster need cross-tenant visibility within their region to comply with local incident-reporting SLAs.

### ✅ Severity / Risk Score per Action
**Why:** All audit events are treated equally; a `settings.updated` event and an `impersonation.started` event are stored and displayed identically, making triage of high-risk events manual and slow.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins benefit from a risk-ranked view (e.g. "critical events in the last 24h") rather than a chronological flat list — reduces time-to-detect for security incidents.
**Multi-country relevance:** Many compliance frameworks (SOC 2, ISO 27001, PCI-DSS) require differentiated handling of high-risk events; severity tagging is the prerequisite for alert routing and escalation.

---

## Alert & Notification

### ✅ Real-Time Alert on High-Risk Events
**Why:** Audit events are written to DB and logged via `Logger` but there is no mechanism to push a real-time alert (webhook, email, Slack) when a high-risk action is logged (e.g. `impersonation.started`, `auth.account_locked`, `permission.denied`).
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins need immediate notification of high-risk events in their tenant so they can respond within minutes, not hours when they next check the UI.
**Multi-country relevance:** GDPR breach notification (72-hour window), NIS2 (24/72-hour windows), and sector-specific requirements mandate near-real-time detection and notification — a webhook on critical events is the enabling primitive.

### ✅ Webhook Dispatch on Audit Events
**Why:** The `WebhookService` is available in the codebase but `AuditLogService.log` never dispatches a webhook; external SIEM / SOAR integrations (Splunk, Datadog, PagerDuty) cannot receive real-time audit events.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants universally require feeding audit events into their existing SIEM tooling; a webhook payload per event type enables this without requiring a DB-level CDC pipeline.
**Multi-country relevance:** Financial-sector regulators in the EU (DORA), US (SOX), and Singapore (MAS TRM) require real-time integration between application audit logs and centralized monitoring systems.

---

## Actor Model

### ✅ API-Key Actor Type
**Why:** `AuditActorTypeEnum` only supports `USER` and `SYSTEM`; API-key-authenticated requests (M2M, SCIM) have no distinct actor type, so their audit entries are indistinguishable from system operations.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins need to differentiate between human user actions, automated system actions, and third-party API-key actions in their audit trail for incident attribution.
**Multi-country relevance:** GDPR and equivalent privacy laws require tracking not just what happened but who/what caused it; distinguishing API key actors from user actors is necessary for data-processing accountability records.

### ✅ Impersonation Context Propagation
**Why:** When a platform admin impersonates a tenant user, subsequent actions should carry both the true actor (the admin) and the impersonated actor in the audit row; currently there is no dual-actor field, so impersonation actions appear as if performed directly by the impersonated user.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants auditing their own logs cannot tell whether an action was performed by their user or by a platform admin impersonating them — a critical trust and transparency gap.
**Multi-country relevance:** GDPR accountability (Art. 5(2)) and auditor requirements in regulated markets require unambiguous attribution of every data-affecting action, including privileged-access actions by platform operators.

---

## Performance & Scalability

### Compound Index on `(tenantId, createdAt DESC)`
**Why:** `getAll` always orders by `createdAt DESC` and filters by `tenantId`, but there is only a separate index on `tenantId` and no compound index; queries on large audit tables will perform a full index scan on `tenantId` followed by a sort.
**Complexity:** Low
**Multi-tenant relevance:** Large, active tenants accumulate millions of audit rows quickly; without the right compound index, their admin UI will time out on routine log queries.
**Multi-country relevance:** Not directly country-specific, but latency from slow index scans degrades the experience for geographically distant users already subject to network latency.

### Asynchronous / Queue-Based Log Writing
**Why:** `AuditLogService.log` performs a synchronous DB write (despite the `catch` safety net); under high load this adds latency to every audited request and creates DB write pressure.
**Complexity:** High
**Multi-tenant relevance:** High-traffic tenants generating thousands of auditable events per second will see measurable latency added to every authenticated API call due to the synchronous write.
**Multi-country relevance:** Regional DB replicas with high write latency (e.g. AU-East, SA regions) exacerbate this problem; decoupled queue-based writing lets the primary request path remain fast regardless of audit-DB proximity.
