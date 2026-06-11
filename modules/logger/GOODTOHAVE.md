# Good to Have — Logger

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Compliance & Data Residency

### Per-Country Log Retention Policy Enforcement
**Why:** GDPR (EU), LGPD (Brazil), PDPA (Thailand), and similar laws specify maximum log retention windows that differ by country. Today the logger writes to a daily file or console with no automated deletion policy — logs accumulate indefinitely.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants operating under specific data-protection agreements may have contractually shorter (or longer) retention obligations that differ from the platform default.
**Multi-country relevance:** Core multi-country requirement — EU tenants may legally be required to purge logs within 90 days, while other markets permit 12 months. Without a configurable retention policy the platform cannot comply across jurisdictions simultaneously.

### Log Data-Residency Routing
**Why:** Logs from EU tenants must, under GDPR, stay in the EU. Today the single file transport writes to one location regardless of the originating tenant's country. A centralized log sink outside the tenant's region may constitute an unauthorized cross-border transfer of personal data.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's `tenantId` and region could drive the log sink target, so EU-tenant logs go to an EU-hosted sink and US-tenant logs go to a US sink.
**Multi-country relevance:** Directly addresses GDPR Chapter V (international transfers), Brazil LGPD Art. 33, and analogous provisions — non-compliance risks significant fines and contractual breach.

---

## PII / Sensitive Data Handling

### Pattern-Based PII Redaction (Beyond Key-Name Denylist)
**Why:** The existing `redact()` function blocks known key names (`password`, `token`, etc.), but it does not detect PII by value pattern — an email address, a phone number, or a credit card number logged under an unexpected key name (e.g. `query`, `input`, `value`) will pass through unredacted.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants may serialize user data under domain-specific field names; pattern-based detection catches leaks that a static denylist misses.
**Multi-country relevance:** GDPR and CCPA require that PII not be stored in operational logs without explicit purpose. Pattern detection for emails, phone numbers, SSNs, and card numbers is a baseline expectation for EU/US compliance audits.

### Tenant-Configurable Redact Key Expansion
**Why:** The `REDACTED_KEYS` set is a compile-time constant. A tenant handling medical records may need `patientId`, `diagnosisCode`, or `prescriptionId` redacted; a fintech tenant may need `accountNumber` and `ibanCode`. There is no mechanism for per-tenant denylist extension.
**Complexity:** Low
**Multi-tenant relevance:** Directly addresses the need for tenants in regulated industries (healthcare, finance, legal) to customise redaction without a platform code change.
**Multi-country relevance:** HIPAA (US), PSD2 (EU), and NHS DSP Toolkit (UK) all mandate specific field-level masking for their respective sensitive data categories.

---

## Structured Output & Transport

### JSON-Structured Log Format Option
**Why:** The current `printf` formatter produces a human-readable plain-text line (`[timestamp] [level] [tenant=X]: message`). Log aggregation platforms (Datadog, Splunk, Loki, CloudWatch Logs Insights) work best with JSON-structured lines that support field-based filtering and alerting without regex parsing.
**Complexity:** Low
**Multi-tenant relevance:** JSON logs allow a `tenantId` field that aggregators can index as a dimension, enabling per-tenant log search and alerting without text parsing.
**Multi-country relevance:** Several country-specific compliance frameworks (ISO 27001, SOC 2 Type II) require machine-parseable audit logs; a plain-text format fails these checks.

### Remote / Cloud Transport Support
**Why:** The current transport choice is binary: Console (dev/vercel) or local daily file (all other environments). There is no path to ship logs to Datadog, Loggly, AWS CloudWatch, Azure Monitor, or GCP Cloud Logging — essential for production multi-region deployments.
**Complexity:** Medium
**Multi-tenant relevance:** Remote transports that accept a `tenantId` dimension allow per-tenant log isolation, dashboards, and alerts inside a shared log aggregation platform.
**Multi-country relevance:** Multi-region deployments need region-local log sinks (e.g. EU logs to EU-hosted Datadog organization, US logs to US-hosted) to satisfy data-residency requirements.

### Log Sampling Under High Load
**Why:** In high-throughput production environments, logging every `debug` and `info` line at full volume can exceed egress budgets and storage quotas. There is no configurable sampling rate, so operators cannot reduce log volume during traffic spikes without changing code.
**Complexity:** Low
**Multi-tenant relevance:** High-volume tenants may produce disproportionate log noise; a per-tenant sampling rate would prevent one tenant's traffic from filling the shared log sink.
**Multi-country relevance:** Some regions have strict data-minimization mandates (GDPR Art. 5(1)(c) — "data minimisation"); sampling non-essential log entries reduces the volume of personal data processed in logs.

---

## Observability Integration

### Correlation ID (Trace ID) Propagation via LogContext
**Why:** `LogContext` carries `requestId` but has no dedicated `traceId` or `spanId` field. Distributed tracing systems (OpenTelemetry, Jaeger) correlate logs to traces via standard `traceId`/`spanId` fields — without them, logs cannot be joined to trace spans in Grafana Tempo or similar.
**Complexity:** Low
**Multi-tenant relevance:** Trace correlation makes it possible to reconstruct the full request path for a specific tenant's failing request across microservices.
**Multi-country relevance:** EU-market enterprise customers often require end-to-end request tracing for SLA auditing and DSAR (Data Subject Access Request) investigations.

### Per-Tenant Log Level Elevation
**Why:** The three process-wide Winston singletons share one log level. A debugging session for a specific tenant requires changing the global level, which floods logs with every tenant's debug output. The `tenantId` is already in `LogContext` and could gate elevated verbosity.
**Complexity:** Medium
**Multi-tenant relevance:** Core feature for enterprise support: temporarily elevate `debug` logging for one tenant without changing the global level or restarting the process.
**Multi-country relevance:** Some countries' incident-response requirements (e.g. NIS2 Directive in EU) mandate that operators can produce detailed logs on demand for a specific entity without bulk log capture.

---

## Audit Trail

### Immutable Audit Log Sink (Separate from Operational Logs)
**Why:** Operational logs (info/warn/error) and security-relevant audit events (login, data access, privilege change) are currently written to the same daily file. Audit logs must be tamper-evident and retained longer than operational logs; conflating them makes both compliance and forensics harder.
**Complexity:** High
**Multi-tenant relevance:** Tenant admins and compliance officers need to access their tenant's audit trail independently without seeing other tenants' events in a shared log file.
**Multi-country relevance:** ISO 27001, SOC 2, PCI-DSS, and GDPR Art. 30 (Records of Processing Activities) all require a separate, protected audit record. Many EU data-protection authorities audit exactly this separation during certification assessments.
