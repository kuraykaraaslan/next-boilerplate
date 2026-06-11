# Good to Have — Observability

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Per-Tenant Dashboards & Isolation

### Tenant-Scoped Prometheus Label Cardinality Guard
**Why:** `recordHttpRequest` and `recordTenantUsage` accept `tenantId` as a free-form label. If the number of active tenants grows to hundreds or thousands, the Prometheus label cardinality (one series per `tenantId × route × status`) will blow up memory on the scrape server. There is no cap, aggregation, or top-N guard today.
**Complexity:** Medium
**Multi-tenant relevance:** Critical at scale — each new tenant adds Prometheus series. Without a guard, onboarding a large customer cohort can crash the metrics backend.
**Multi-country relevance:** Multi-region deployments may run separate Prometheus instances per region; cardinality-safe labels allow federation without exponential series growth.

### Per-Tenant Grafana Dashboard Provisioning
**Why:** `recordTenantUsage` and `recordHttpRequest` emit `tenantId` as a label, but there is no provisioning layer that creates per-tenant Grafana dashboards or variables. Operators must manually build a dashboard per tenant, which is unscalable.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants often require a self-service dashboard showing their own API call volume, error rates, and usage metrics — key for SLA reporting and upsell conversations.
**Multi-country relevance:** Enterprise customers in regulated markets (e.g. EU financial services) require auditable, tenant-specific performance data; a shared global dashboard does not satisfy this requirement.

### SLA / Uptime Tracking per Tenant
**Why:** There is no SLA tracking layer — no concept of a target uptime percentage (e.g. 99.9%), no measurement of error budget burn, and no alerting when a tenant's SLA is at risk. The metrics exist (success rates, latency histograms), but nothing aggregates them into an SLA view.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants typically have contractual SLAs; the platform needs to measure and report actual uptime per tenant to detect SLA breaches before the customer does.
**Multi-country relevance:** EU's NIS2 Directive and sector-specific regulations (e.g. DORA for financial entities) require demonstrable, per-customer availability measurement and incident reporting within defined time windows.

---

## Error Reporting

### PII Redaction before Sentry Event Dispatch
**Why:** `recordError` forwards `opts.extra` verbatim to Sentry and the `beforeSend` hook attaches raw context from Logger's `AsyncLocalStorage`. If any context value contains an email, IP address, or name, it ships to Sentry — a third-party processor — without redaction. This is documented as a caller responsibility but not enforced.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants may handle different categories of personal data; a shared Sentry project would receive all tenants' PII in a single unscoped stream.
**Multi-country relevance:** GDPR Art. 28 requires a Data Processing Agreement with every sub-processor; shipping unredacted PII to Sentry without an adequate DPA or redaction is a compliance violation in the EU.

### Per-Tenant Sentry Project / DSN Routing
**Why:** All tenants' errors go to a single Sentry DSN. Enterprise tenants often require their errors to be isolated in a dedicated Sentry project (especially when they have their own Sentry organization or when data-residency applies).
**Complexity:** High
**Multi-tenant relevance:** Isolating errors per tenant prevents one tenant's noise from obscuring another's, and allows per-tenant alert routing and ownership assignment.
**Multi-country relevance:** Sentry is a US-based company. An EU tenant whose personal data appears in error events may require a Sentry EU region or a self-hosted instance; per-tenant DSN routing enables this without a platform-wide migration.

### Tenant-Level Error Budget Alerts
**Why:** The `errors_total` counter is emitted per tenant, but there is no alerting rule or configurable threshold that fires when a specific tenant's error rate exceeds a baseline. Operators discover tenant-level error spikes reactively.
**Complexity:** Medium
**Multi-tenant relevance:** Proactive per-tenant error alerting allows support teams to reach out to affected tenants before they file a ticket, dramatically improving perceived reliability.
**Multi-country relevance:** NIS2 and DORA require timely detection and notification of significant incidents; automated per-tenant error-budget alerting is a prerequisite for meeting incident notification SLAs (e.g. 72-hour GDPR breach notification window).

---

## Distributed Tracing

### OpenTelemetry Trace Context Propagation
**Why:** `OTEL_ENABLED` is reserved in the env config but `initOtel()` is never called — the OTel SDK is not actually initialised. As a result there are no distributed traces, no span correlation between the Next.js edge and the BullMQ worker, and no link between Sentry errors and OTLP traces.
**Complexity:** High
**Multi-tenant relevance:** Tracing enables root-cause analysis for slow requests attributed to a specific tenant's data volume or query pattern, which is impossible with metrics alone.
**Multi-country relevance:** Multi-region architectures that route requests to the nearest region need cross-region trace propagation to debug latency; unfinished OTel wiring makes this impossible.

### Trace Sampling Strategy per Tenant
**Why:** `SENTRY_TRACES_SAMPLE_RATE` is a single global float applied at SDK init. There is no path to increase sampling for a specific tenant (e.g. 100% for a newly onboarded enterprise customer being debugged) or to reduce sampling for a high-volume free-tier tenant.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants warrant different sampling densities — enterprise customers being onboarded need 100% traces; high-volume background tenants should be sampled at 1% to control cost.
**Multi-country relevance:** Some regions' data minimization requirements (GDPR Art. 5) mean that trace data containing user identifiers should be sampled conservatively; per-tenant control enables compliance without platform-wide sampling reduction.

---

## Metrics & Business Intelligence

### Per-Tenant `tenant_usage_total` Gauge Reset / Billing Period Window
**Why:** `recordTenantUsage` increments a Prometheus counter monotonically — it never resets. Billing-period-aligned usage (e.g. monthly API calls) cannot be derived from a cumulative counter without knowing when each billing period started per tenant.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's billing period may start on a different day; a rolling window or period-scoped gauge is needed to report "API calls this billing cycle" per tenant.
**Multi-country relevance:** Some countries (e.g. Japan, Australia) have monthly billing reconciliation requirements imposed by payment regulations; accurate per-period usage is a legal prerequisite for automated invoicing.

### Health-Check Endpoint with Per-Tenant Status
**Why:** There is no health-check route wired to the observability module. Uptime monitors, load balancers, and Kubernetes probes rely on health endpoints; today there is no way to signal degraded observability (e.g. Sentry down, metrics sink unavailable) or per-tenant availability status.
**Complexity:** Low
**Multi-tenant relevance:** A health endpoint that surfaces per-tenant error rates enables status-page providers to display per-tenant service health rather than a single global green/red.
**Multi-country relevance:** EU accessibility requirements (EN 301 549) and financial-services regulations often require a publicly accessible status page with real-time availability data, which depends on a machine-readable health endpoint.

### Custom Business Metrics API
**Why:** `TenantUsageSample.metric` supports an open string type but only the `ObservabilityService.recordTenantUsage` path exists. There is no mechanism for tenants (or their integrations) to register and push custom business metrics (e.g. "jobs processed", "AI tokens consumed by model") beyond the predefined set.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants operate different business models and need to track different KPIs; a custom metric registration API allows each tenant to instrument their specific domain events.
**Multi-country relevance:** Industry-specific regulations in different countries (e.g. EU AI Act for AI-powered features, UK FCA for financial products) require domain-specific usage tracking that generic infrastructure metrics cannot satisfy.
