# ADR 0006 — Billing reality + regional e-invoicing

**Status:** Accepted (2026-05)

## Context

Earlier turns gave every tenant its own payment provider credentials (Stripe, PayPal, Iyzico, …) and a basic `Payment` + `TenantSubscription` model. What was still missing:

- **No `Invoice` entity.** A `Payment` row is just a charge, not a legal document. Tenants couldn't issue invoices to their customers.
- **No subscription auto-renew.** Stripe was charging cards, but our local `TenantSubscription.currentPeriodEnd` was never being extended; the app didn't react to `invoice.payment_succeeded` webhooks.
- **No dunning.** Failed payments silently became expired subscriptions; no retry / customer notification flow.
- **No tax compliance.** Turkey requires **e-Arşiv Fatura** (B2C) and **e-Fatura** (B2B) submission to GİB. The EU is converging on **Peppol BIS Billing 3.0**. The US has no federal mandate but Stripe Tax is the de-facto integration.

For a "perfect tenancy boilerplate" running real SaaS workloads, these are non-negotiable.

## Decision

Introduce a dedicated **`modules/invoice/`** module with:

- `Invoice` + `InvoiceLine` entities — denormalised customer info (immutable once issued), monotonic per-tenant `invoiceNumber`, region + tax-scheme columns, regional-submission state columns (`earsivUuid`, `peppolDocumentId`, `stripeTaxCalculationId`).
- `InvoiceService` — `create / issue / markPaid / markVoid / list / addLine / generatePdf` (admin-only, tenant-scoped).
- `InvoicePdfService` — PDF render with pdfkit; output stored under the tenant's Storage bucket.
- **Regional adapters** behind a small `InvoiceAdapter` interface (`submit`, `cancel`, `isConfigured`):
  - `TrEarsivAdapter` — UBL-TR 2.1 XML, integrator selection per-tenant (Foriba / Logo / Uyumsoft / mock). TCKN+VKN validation, KDV 0%/1%/10%/20%.
  - `EuPeppolAdapter` — Peppol BIS Billing 3.0 (UBL 2.1 + EN 16931), endpoint config per tenant. OSS VAT helper for cross-border B2C digital services.
  - `UsStandardAdapter` — Stripe Tax integration (no federal e-invoicing). EIN format validation.
- Adapter selection driven by per-tenant `Setting.billingRegion`. Every adapter has a "mock" / dev mode so the boilerplate works out of the box without paid integrator accounts.

Wire **Stripe webhook events** into the billing cycle:
- `invoice.payment_succeeded` → create `Invoice` (draft), issue + submit to regional adapter, mark paid, extend `TenantSubscription.currentPeriodEnd`.
- `invoice.payment_failed` → mark subscription `PAST_DUE`, start grace period, send dunning email.
- `customer.subscription.updated` → re-bind tenant to new plan; Stripe pre-computes proration items.
- `customer.subscription.deleted` → cancel local `TenantSubscription`.

The Stripe customer is linked to a tenant via `customer.metadata.tenantId`; the tenant's `Setting.stripeCustomerId` caches the mapping.

A Stripe Customer Portal session endpoint (`POST /api/admin/subscription/customer-portal`) hands the tenant admin off to Stripe for self-service plan changes / payment-method updates — the webhook flow keeps our state in sync.

## Consequences

**Positive**
- Tenants can issue legally-compliant invoices in the regions the boilerplate explicitly supports. Turkish operators can plug in their GİB integrator credentials and ship to production.
- Failed payments now drive a real dunning flow: PAST_DUE state + customer email + grace period + eventual cancellation, all visible in `AuditLog` and `NotificationLog`.
- A new region is one adapter file away. The shape of the contract (`submit` returns `{externalId, status, pdfUrl?}`) is generic enough for Mexico's CFDI, Brazil's NF-e, or whatever comes next.
- `Invoice` is its own audit surface (issueDate, paidAt, status) decoupled from `Payment`; refunds and partial payments don't lose the legal trail.

**Negative**
- Regional integrator accounts (Foriba, Logo, Peppol AP) are paid services. The boilerplate ships with `mock` adapters that simulate success; production deploys need real credentials. This is documented per-adapter.
- Invoice number sequences are per-tenant and must not have gaps in TR (legal requirement). The implementation uses a transactional `MAX(invoice_number) + 1` lookup; on extreme concurrency it falls back to a Postgres advisory lock.
- e-Arşiv (B2C) and e-Fatura (B2B) require different integrator endpoints in TR. The decision is made by checking the customer's GİB sicil status at issue time — for the mock adapter we always treat as e-Arşiv. Real adapters override.

## Alternatives considered

- **Bring in Stripe Invoicing.** Rejected as the primary path: a multi-region boilerplate cannot make Stripe the single source of truth for invoices because Stripe doesn't natively integrate with GİB / Peppol. We still use Stripe Invoicing as the charge engine and webhook source — but local `Invoice` rows + regional adapters handle the legal-document side.
- **Outsource e-invoicing to one vendor (e.g. Vatstack, Avalara).** Rejected: locks operators into one vendor and a per-document cost. The adapter interface lets them choose.
- **Skip invoicing in the boilerplate; ship only `Payment`.** Rejected by the goal — "perfect tenancy boilerplate" implies a tenant can run a real SaaS without writing their own invoice/tax stack.

## Compliance pointers (per region)

| Region | Standard | Mandatory for | Notes |
|---|---|---|---|
| TR | e-Arşiv Fatura (UBL-TR 2.1) | B2C sales | Submit to GİB via integrator within 7 days |
| TR | e-Fatura (UBL-TR 2.1) | B2B between registered companies | Document type chosen at issue time |
| EU | Peppol BIS Billing 3.0 | Varies by country (DE/IT/FR/NL/BE etc. mandate it for B2B/B2G) | OSS for cross-border B2C digital services |
| US | Stripe Tax (sales tax) | Nexus-dependent per state | No federal e-invoice mandate |
| Other | Generic PDF only | — | Adapter returns `submit() = no-op` |

Operators are responsible for verifying that the boilerplate's regional shape matches their current legal obligations — tax law moves faster than boilerplate code.
