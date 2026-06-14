# Good to Have — Tenant Export Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Compliance / GDPR

### ✅ Asynchronous Export with Email Delivery
**Why:** `exportTenantData` is a synchronous `Promise<Buffer>` that blocks the HTTP connection; for tenants with thousands of members, webhooks, and audit logs this will timeout before the JSON is fully serialized.
**Complexity:** Medium
**Multi-tenant relevance:** Export size varies dramatically by tenant age and activity; large tenants need an async job-queue approach (create export → poll/email when ready) while small tenants can still use synchronous download.
**Multi-country relevance:** GDPR Art. 20 requires providing data "without undue delay" (typically 30 days) — an async job that emails a signed S3 download link satisfies the legal obligation while handling large datasets safely.

### ✅ Export Format Options (CSV, XML, NDJSON)
**Why:** The export produces a single JSON file; enterprise customers and data protection officers in many jurisdictions expect to receive data in formats their analytics or legal tools can ingest (CSV per collection, NDJSON for streaming, XML for government systems).
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants have different downstream tooling; a JSON blob is not machine-parseable by many compliance or BI tools without transformation.
**Multi-country relevance:** Several EU member-state DPAs (France CNIL, Germany BfDI) have issued guidance expecting CSV or XML formats for Art. 20 exports; Brazil's ANPD has similar expectations under LGPD.

### ✅ Audit Log Export Cap Should Be Configurable and Documented
**Why:** The hardcoded `take: 1000` on `AuditLog` silently truncates the audit history; a tenant with 50,000 audit entries receives an incomplete export with no indication that data was truncated.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with compliance obligations (SOC 2, ISO 27001) require a complete audit trail in their data export — a truncated export fails a compliance audit.
**Multi-country relevance:** GDPR Art. 20 data portability must be complete; a truncated export that omits older audit events is legally insufficient and can expose the platform operator to regulatory fines.

### ✅ Export Completeness Manifest and Checksum
**Why:** There is no manifest or SHA-256 checksum included in the export — the tenant and their legal team cannot verify the integrity or completeness of the exported archive.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants with security teams will reject an export that cannot be verified as tamper-proof.
**Multi-country relevance:** GDPR Art. 20 implicitly requires machine-readable structured data; a verifiable checksum is standard practice expected by EU DPAs and ISO 27001 auditors.

### ✅ Personal Data Redaction Option
**Why:** The export includes member data (names, emails via user hydration) with no option to produce a pseudonymized export for internal compliance testing or audit handover to a third party.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants sharing an export with an external auditor or vendor need a redacted version that replaces PII with tokens.
**Multi-country relevance:** GDPR Art. 25 (data minimization by design) encourages pseudonymization; several national implementations (Germany, Netherlands) have issued guidance recommending pseudonymized exports for audit purposes.

### ✅ Export Rate Limiting Per Tenant
**Why:** The `OWNER` role can trigger unlimited export jobs; a single large tenant generating back-to-back exports could exhaust DB connection pools or S3 throughput for all tenants on the platform.
**Complexity:** Low
**Multi-tenant relevance:** Export is a resource-intensive operation; per-tenant throttling (e.g., one export per 24 hours) prevents one tenant from degrading the platform for others.
**Multi-country relevance:** No direct country relevance, but global platforms serving tenants across time zones need to smooth export load without per-region rate-limit coordination.

## Storage & Delivery

### ✅ Export Stored to S3 with Signed Download URL
**Why:** The current response streams the buffer directly as an HTTP attachment, making the export unavailable if the connection drops mid-transfer and providing no retry mechanism.
**Complexity:** Medium
**Multi-tenant relevance:** Large tenants with gigabytes of data need resumable downloads; streaming over a single HTTP response is not reliable for files above 50 MB.
**Multi-country relevance:** GDPR requires data portability to be provided "in a commonly used, machine-readable format" — delivering via a signed S3 URL satisfies this and allows the tenant to verify download integrity.

### ✅ Export Expiry and Automatic Deletion
**Why:** If exports were stored (on S3 or disk), there is no lifecycle policy to delete them after a configurable window — an old export containing personal data that persists in storage beyond its purpose violates GDPR's storage-limitation principle.
**Complexity:** Low
**Multi-tenant relevance:** Per-tenant export cleanup prevents indefinite accumulation of personal data snapshots.
**Multi-country relevance:** GDPR Art. 5(1)(e) storage limitation, LGPD Art. 10, and PIPL Art. 19 all require that personal data is not kept longer than necessary — exported archives are in-scope.

## Developer Experience

### ✅ Selective Collection Export
**Why:** Every export always exports every collection (20 entity types in one call) — there is no way to request only `auditLogs` or only `payments`, which would be useful for support investigations or partial compliance responses.
**Complexity:** Low
**Multi-tenant relevance:** Support engineers need targeted exports for debugging; a full export for a large tenant takes significant time and returns far more data than needed.
**Multi-country relevance:** GDPR Art. 15 right of access allows subjects to request only specific categories of data — a selective export API makes responding to Data Subject Access Requests (DSARs) efficient.

### ✅ Export Job Status / History Endpoint
**Why:** There is no record of when exports were generated, who triggered them, and whether they succeeded — tenant owners and platform admins cannot audit export activity.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants need to know when their data was last exported and by which team member — this is a basic governance control.
**Multi-country relevance:** GDPR Art. 30 Record of Processing Activities (RoPA) includes disclosure activities — logging each data export satisfies this requirement with an auditable record.
