# invoice module

Tenant-scoped invoicing with **regional e-invoicing adapters**: TR (e-Arşiv Fatura / e-Fatura), EU (Peppol BIS Billing 3.0), US (Stripe Tax). Each tenant issues its own invoices keyed to its own subscription / payment flow — see [ADR 0006](../../docs/adr/0006-billing-and-e-invoicing.md).

---

## Files

| File | Purpose |
|---|---|
| `invoice.service.ts` | Create / issue / mark-paid / void / list invoices; per-tenant invoice-number sequence |
| `invoice.types.ts` | Zod schemas + input/output types |
| `invoice.enums.ts` | `InvoiceStatus`, `InvoiceRegion`, `TaxScheme`, `InvoiceLineSource` |
| `invoice.messages.ts` | Error strings |
| `invoice.setting.keys.ts` | Per-tenant company info + per-region adapter config keys |
| `entities/invoice.entity.ts` | `Invoice` — composite unique `(tenantId, invoiceNumber)` |
| `entities/invoice_line.entity.ts` | `InvoiceLine` — N rows per invoice |
| `adapters/base.adapter.ts` | `InvoiceAdapter` interface (submit / cancel / isConfigured) |
| `adapters/registry.ts` | Region → adapter map |
| `adapters/tr_earsiv.adapter.ts` | UBL-TR 2.1 XML builder + integrator switch (Foriba / Logo / Uyumsoft / mock) |
| `adapters/tr_validators.ts` | TCKN + VKN checksum validation |
| `adapters/tr_vat_rates.ts` | Turkish KDV rate constants |
| `adapters/eu_peppol.adapter.ts` | Peppol BIS Billing 3.0 stub + OSS VAT helpers |
| `adapters/us_standard.adapter.ts` | Stripe Tax bridge + EIN/ZIP helpers |

---

## Lifecycle

```
draft   ──issue()──▶   issued   ──markPaid()──▶   paid
  │                       │
  │                       └──markVoid()──▶ void
  └──markVoid()──▶ void
```

- `create()` writes a `draft` invoice with computed totals.
- `issue()` calls the regional adapter (`submit()`), persists provider IDs (`earsivUuid` / `peppolDocumentId` / `stripeTaxCalculationId`), flips status to `issued`. Best-effort: adapter failure does not block local issuance.
- `markPaid()` records `paidAt` + `paymentId`. Stripe webhook (`invoice.payment_succeeded`) calls this.
- `markVoid()` reverses an `issued` invoice and calls `adapter.cancel()` to inform the authority.

---

## Per-tenant company info

Before a tenant can issue an invoice, set these settings (Settings → Integrations → Invoicing):

| Key | Required? |
|---|---|
| `companyLegalName`, `companyTaxId`, `companyCountryCode` | ✓ |
| `companyTaxOffice` | TR only |
| `companyAddressLine1`, `companyCity`, `companyPostalCode` | ✓ for legal print |
| `companyEmail`, `companyPhone`, `companyWebsite`, `companyIban`, `companyLogoUrl` | optional |
| `billingRegion` | `TR` / `EU` / `US` / `OTHER` (drives adapter) |
| `invoiceNumberPrefix` | default `INV` |
| `invoiceNumberPadding` | default `5` |
| `invoiceDefaultCurrency` | default `USD` |
| `invoiceDefaultDueDays` | default `0` (on-receipt) |
| `invoiceDefaultVatRate` | e.g. `0.20` |

---

## Regional adapters

### TR — e-Arşiv Fatura / e-Fatura

- `billingRegion='TR'` + one of `earsivIntegrator` ∈ {`mock`, `foriba`, `logo`, `uyumsoft`, `bizplace`, `mikrogep`}.
- UBL-TR 2.1 XML built by [tr_earsiv.adapter.ts](adapters/tr_earsiv.adapter.ts) — namespaces, supplier/customer parties, tax totals, line items.
- `mock` mode generates a UUID + status=`accepted` for local development.
- Production: fill `earsivIntegratorBaseUrl`, `earsivIntegratorUsername`, `earsivIntegratorPassword` per your contract; implement the integrator branch inside `submit()`.
- KDV rates 0% / 1% / 10% / 20% via [tr_vat_rates.ts](adapters/tr_vat_rates.ts).
- TCKN + VKN checksum validators in [tr_validators.ts](adapters/tr_validators.ts).
- Document type: defaults to `EARSIVFATURA` (B2C). Set `earsivDocumentTypeOverride='TICARIFATURA'` for B2B.

### EU — Peppol BIS Billing 3.0

- `billingRegion='EU'` + `peppolEndpointId` + `peppolAccessPointUrl`.
- Mock returns a synthetic `peppol-{uuid}` document ID and status=`submitted`.
- Production: build EN-16931-compliant UBL 2.1 XML, wrap in AS4 envelope, POST to the Access Point.
- VAT-OSS helper: `getOssVatRate(consumerCountryCode)` for cross-border B2C digital services.
- VAT number regex per country via `validateEuVatNumber(country, vat)`. **No VIES roundtrip** — operators should call VIES asynchronously if real-time validation is needed.

### US — Stripe Tax

- `billingRegion='US'`. No federal e-invoice mandate.
- `submit()` is a no-op unless `stripeTaxEnabled='true'`, in which case it stubs a `stripe.tax.calculations.create` call.
- EIN format validator + US ZIP validator are exported for forms.

### OTHER

- No adapter. `issue()` skips submission; the local PDF is the only document.

---

## Feature gating

Every `create()` call enforces `FEATURE_KEYS.FEATURE_INVOICING` via `TenantSubscriptionService.assertFeatureAccess`. Tenants on a plan without invoicing get a `402 Payment Required` from the route layer. Root tenant is short-circuited.

---

## Stripe webhook integration

`modules/payment/payment.webhook.service.ts` listens for `invoice.payment_succeeded` (Stripe Customer Portal autorenewals) and, after our subscription is extended, calls:

1. `InvoiceService.create({ ... lines: [plan-line + proration if any], paymentId, subscriptionId })`
2. `InvoiceService.issue(tenantId, invoiceId)` (regional submit)
3. `InvoiceService.markPaid(tenantId, invoiceId, paymentId)`

A `invoice.payment_failed` event triggers `TenantSubscriptionService.startGracePeriod` and a dunning email. See [ADR 0006](../../docs/adr/0006-billing-and-e-invoicing.md).

---

## Mock / development mode

With `billingRegion='TR'` + `earsivIntegrator='mock'`, the boilerplate produces a real UBL-TR XML and a synthetic GİB UUID — enough for local development, screenshots, and tests. Production deploys MUST flip to a real integrator and provide credentials.
