# Good to Have — Outgoing Webhooks

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Delivery Reliability

### Per-Tenant Fair-Queue Scheduling (Worker Fairness)
**Why:** The BullMQ worker runs with a shared concurrency of 10 across all tenants. A single high-volume tenant can exhaust all 10 slots, blocking every other tenant's deliveries. There is no per-tenant concurrency cap or fair-queue mechanism.
**Complexity:** High
**Multi-tenant relevance:** Core SaaS reliability concern — one tenant's spike must not degrade delivery latency for all other tenants sharing the same worker pool.
**Multi-country relevance:** Enterprise SLAs in regulated markets (EU NIS2, UK FCA) require demonstrably fair resource allocation; a shared unmetered queue is difficult to defend in a service-level audit.

### Webhook Delivery Ordering Guarantee (Per-Endpoint FIFO)
**Why:** Deliveries for a single webhook endpoint are enqueued concurrently via `Promise.all(matching.map(enqueueDelivery))` and processed by up to 10 concurrent workers. This means two events for the same endpoint may arrive out of order at the subscriber.
**Complexity:** Medium
**Multi-tenant relevance:** Subscribers that process state-machine transitions (e.g. `subscription.created` then `subscription.cancelled`) depend on order; out-of-order delivery causes incorrect state at the subscriber side.
**Multi-country relevance:** Financial-services integrations in the EU (PSD2) and US (Dodd-Frank) that process payment events require ordered delivery to maintain a correct audit trail at the receiving system.

### Configurable Secret-Rotation Overlap Window per Tenant
**Why:** The `rotateSecret` overlap window is hardcoded to 48 hours. A security-conscious tenant may require a 1-hour window, while an enterprise with a complex deployment pipeline may need 7 days. There is no per-tenant or per-webhook override.
**Complexity:** Low
**Multi-tenant relevance:** Secret rotation policy is a per-tenant security decision; forcing a global 48-hour window is either too long (security risk) or too short (operational burden) for different tenant profiles.
**Multi-country relevance:** PCI-DSS Requirement 3.6 (key management) and ISO 27001 Annex A.10.1 both specify that cryptographic key lifecycle policies be defined per use case — a configurable overlap period is a prerequisite for compliance documentation.

### Configurable Rate-Limit Deferral Delay
**Why:** When an endpoint exceeds its rate limit, the delivery is deferred by a hardcoded 60,000 ms. Tenants who configure low rate limits (e.g. 1/min) expect a 60-second deferral that matches their limit window; those with high limits (e.g. 100/min) may prefer a shorter deferral.
**Complexity:** Low
**Multi-tenant relevance:** The per-tenant `webhookRetryDelaysMs` setting gives fine control over retry backoff, but the rate-limit deferral operates on a fixed constant — inconsistent with the per-tenant tuning philosophy.
**Multi-country relevance:** Low-bandwidth or high-latency regions may benefit from a shorter deferral to avoid compounding delivery delays, while high-congestion markets may benefit from longer ones.

---

## Security

### Mutual TLS (mTLS) for Webhook Delivery
**Why:** Webhook delivery currently uses HMAC signature headers for authentication. mTLS provides a stronger guarantee — the subscriber's server presents a certificate the platform can verify, and the platform presents its own certificate to the subscriber. HMAC verification is optional at the subscriber; mTLS is enforced at the TLS layer.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants in financial services or healthcare that receive webhooks may require mTLS as part of their own security policy; today there is no path to configure a per-endpoint client certificate.
**Multi-country relevance:** EU DORA (Digital Operational Resilience Act) for financial entities requires demonstrably secure communication channels for system integrations; mTLS is often cited as the expected mechanism for API and webhook communications in this context.

### Webhook Payload Encryption (at-rest and in-transit)
**Why:** Webhook payloads are stored in `webhook_deliveries.requestBody` in plaintext. A payload may contain PII (user email, subscription details, payment metadata). At-rest payload encryption is absent.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with strict data classification requirements (financial data, health data) need their webhook payload storage to be encrypted at rest with tenant-specific keys, not a shared platform key.
**Multi-country relevance:** GDPR, HIPAA, and PCI-DSS all require encryption at rest for personal data; storing unencrypted webhook payloads that may contain PII is a compliance gap for any EU, US healthcare, or payment-processing customer.

### SSRF Protection for IPv6-Literal CIDR Allowlist Entries
**Why:** The `matchesAllowEntry` function only supports IPv4 CIDR notation. IPv6 allowlist entries are silently treated as an exact-match string, so `matchesAllowEntry("2001:db8::1", "2001:db8::/32")` returns `false` — an operator who configures an IPv6 CIDR in the allowlist gets no effective override.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants on IPv6-only internal networks (common in large enterprises and academic institutions) cannot use the IP allowlist to authorize their internal webhook targets.
**Multi-country relevance:** IPv6 adoption is highest in certain markets (e.g. India, Germany, Japan where ISPs have deployed IPv6 broadly); webhook subscribers in these markets on IPv6-only endpoints cannot be allowlisted today.

---

## Subscriber Experience

### Webhook Subscription Management API for Tenants (Self-Service)
**Why:** Webhook endpoints are managed by tenant admins only (ADMIN+ role). Many SaaS platforms expose a self-service developer API that allows tenant developers (not just admins) to register their own endpoints within pre-approved event scopes. There is no role-differentiated endpoint management today.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants whose development teams are separate from their admin teams cannot self-service webhook integration without escalating to an admin, creating friction and support load.
**Multi-country relevance:** Software development teams in countries with strict organizational role separation (e.g. Japanese enterprise IT governance structures) cannot authorize developers to touch admin settings, making webhook self-service a blocker for adoption.

### Webhook Event Versioning & Schema Registry
**Why:** The event catalog (`webhook.catalog.ts`) is a static TypeScript file with no versioning. When an event payload changes (e.g. a new field is added to `member.created`), subscribers receive no advance notice and have no way to know which schema version they are receiving.
**Complexity:** High
**Multi-tenant relevance:** Different tenants' subscribers may be at different integration maturity levels; versioned events allow a gradual migration where Tenant A stays on `v1` while Tenant B adopts `v2` immediately.
**Multi-country relevance:** Enterprise customers in the EU and US that maintain formal software compliance documentation (e.g. for SOC 2 or ISO 27001) require a schema changelog for external integrations; undocumented schema changes are a compliance finding.

### Subscriber-Facing Delivery Status API (Public Delivery Receipts)
**Why:** The delivery log is visible only to tenant admins through the admin UI. Webhook subscribers (external developers) have no programmatic way to query whether a delivery succeeded or inspect the response body — they must contact the tenant admin.
**Complexity:** Medium
**Multi-tenant relevance:** Enabling a scoped API-key access to delivery receipts allows tenants to grant their integration partners read-only access to delivery status without granting full admin access.
**Multi-country relevance:** Marketplace and open-banking integrations in regulated markets (UK Open Banking, EU PSD2) often require that the receiving party can retrieve and archive delivery receipts for their own audit trail.

---

## Observability & Operations

### Audit Log for Webhook Lifecycle Events
**Why:** Endpoint create, update, delete, secret rotation, manual redeliver, and replay all emit only `Logger.info/warn` lines — no `AuditLogService` entries. Secret rotation in particular (changing a cryptographic credential) is a security-relevant event with no audit trail.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins need a tamper-evident record of who changed which webhook endpoint and when, especially for compliance reviews and incident investigations.
**Multi-country relevance:** ISO 27001 Annex A.12.4 and GDPR Art. 30 require logs of processing activities; changes to webhook configurations that determine what data is shared externally are data-flow configuration changes that must be audited.

### Dead-Letter Queue Admin Dashboard
**Why:** Dead-lettered deliveries are queryable via `listDeliveries` filtered by status, but there is no dedicated admin view aggregating dead-lettered deliveries across all webhooks for a tenant, showing why they failed, and offering bulk re-queue.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins managing many webhook endpoints need a single-pane view of all failed deliveries grouped by endpoint and error type, not a per-webhook delivery list.
**Multi-country relevance:** Enterprise customers in markets with formal incident reporting obligations (EU NIS2 72-hour reporting, UK ICO) need to quickly assess the blast radius of a delivery outage — a cross-endpoint dead-letter view enables rapid assessment.

### Per-Endpoint Latency SLA Alerting
**Why:** `WebhookMetricsService.getMetrics` produces p95 latency figures, but there is no alerting mechanism that fires when a specific endpoint's average or p95 latency exceeds a threshold. Operators discover slow endpoints after the fact.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant whose subscriber endpoint is degrading will see delivery durations climb; proactive per-endpoint latency alerting lets the tenant fix their endpoint before the circuit breaker fires.
**Multi-country relevance:** Regulated industries in the EU (DORA) and US (SOX, FFIEC) require demonstrable monitoring of critical external integrations; per-endpoint latency alerting is a standard control.

### Webhook Delivery Cost / Volume Billing Metering
**Why:** `dispatchEvent` fires and forgets — there is no mechanism that records how many deliveries a tenant has consumed in a billing period, which makes it impossible to meter webhook usage as a billable line item (e.g. "1,000 deliveries included; $0.001/delivery over").
**Complexity:** Medium
**Multi-tenant relevance:** Usage-based billing for webhook delivery volume is a natural plan differentiation lever; without metering, every tenant's plan must include unlimited delivery even if the cost is borne differently.
**Multi-country relevance:** Usage-based billing models require per-country tax treatment of metered charges; the metering data must be durable and auditable for VAT compliance in EU markets and GST in Australia, India, and Canada.

---

## Multi-Region & Data Residency

### Region-Pinned Delivery Workers
**Why:** The single BullMQ worker delivers to all tenants' endpoints regardless of the tenant's region or the endpoint's geography. An EU tenant's payload (potentially containing personal data) is processed by whichever worker picks up the job, which may be hosted in the US.
**Complexity:** High
**Multi-tenant relevance:** Each tenant could be assigned to a regional queue so EU-region tenants' payloads are only processed by EU-hosted workers, satisfying data-residency requirements without architectural changes at the subscriber.
**Multi-country relevance:** GDPR Chapter V prohibits transfer of personal data to third countries without adequate safeguards. Webhook payloads containing EU personal data must not transit US-hosted workers without appropriate legal bases (SCCs, adequacy decisions).

### Geo-Blocked Event Delivery (Country-Restricted Events)
**Why:** All webhook events are delivered to any configured endpoint globally. There is no mechanism to prevent a tenant from receiving certain event types (e.g. payment events) if they are operating in a restricted jurisdiction, or to block delivery to endpoints in sanctioned countries.
**Complexity:** High
**Multi-tenant relevance:** Platform-level compliance may require that certain events are only dispatched to tenants in specific countries (e.g. a payment event for a country-specific payment method should only fire for tenants in that country).
**Multi-country relevance:** OFAC sanctions (US), EU restrictive measures, and UK sanctions regulations prohibit data transfers to certain jurisdictions; delivering webhook payloads to an endpoint in a sanctioned country is a sanctions compliance risk.
