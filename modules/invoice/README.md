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
| `adapters/tr_earsiv.adapter.ts` | UBL-TR 2.1 XML builder + GİB portal JSON builder + integrator switch (gib_direct / Foriba / Logo / Uyumsoft / mock) |
| `adapters/tr_gib_direct.client.ts` | Free GİB e-Arşiv Portal client — login / create draft / SMS-OTP sign / cancel (no integrator contract needed) |
| `adapters/tr_foriba.client.ts` | Foriba integrator HTTP client (UBL submit) |
| `adapters/tr_logo.client.ts` | Logo İnternet integrator HTTP client (UBL submit) |
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

- `billingRegion='TR'` + one of `earsivIntegrator` ∈ {`mock`, `gib_direct`, `foriba`, `logo`, `uyumsoft`, `bizplace`, `mikrogep`}.
- UBL-TR 2.1 XML built by [tr_earsiv.adapter.ts](adapters/tr_earsiv.adapter.ts) — namespaces, supplier/customer parties, tax totals, line items.
- `mock` mode generates a UUID + status=`accepted` for local development.
- Paid integrators (`foriba` / `logo` / …): fill `earsivIntegratorBaseUrl`, `earsivIntegratorUsername`, `earsivIntegratorPassword` per your contract; the integrator branches POST the UBL-TR XML.
- KDV rates 0% / 1% / 10% / 20% via [tr_vat_rates.ts](adapters/tr_vat_rates.ts).
- TCKN + VKN checksum validators in [tr_validators.ts](adapters/tr_validators.ts).
- Document type: defaults to `EARSIVFATURA` (B2C). Set `earsivDocumentTypeOverride='TICARIFATURA'` for B2B.

#### Free GİB portal (`gib_direct`) + SMS signing

For small issuers (freelancers, micro-businesses) who use GİB's free e-Arşiv Portal directly instead of a paid integrator. See [tr_gib_direct.client.ts](adapters/tr_gib_direct.client.ts).

- Settings: `earsivIntegrator='gib_direct'`, `earsivIntegratorUsername` (TCKN/VKN), `earsivIntegratorPassword`, `earsivIntegratorSandbox` (`'true'` = GİB TEST portal, default; `'false'` = PROD). `earsivIntegratorBaseUrl` is an optional override.
- The portal does **not** take UBL-TR XML — it takes a flat JSON invoice (`buildGibPortalInvoice`) and renders the UBL itself.
- **Two-step finalisation.** `issue()` creates an **unsigned** draft (`earsivStatus='submitted'`). Making it legally final needs an SMS-OTP — that step can't run unattended from a webhook, so it is driven from the Invoices admin page:
  1. `POST /tenant/[tenantId]/api/invoices/earsiv/sms/send` → `InvoiceService.requestEarsivSms()` sends the OTP to the account's phone and returns an `oid`.
  2. `POST /tenant/[tenantId]/api/invoices/earsiv/sms/verify` with `{ oid, code, invoiceIds? }` → `InvoiceService.confirmEarsivSms()` signs the matching drafts and flips them to `earsivStatus='accepted'`. Omitting `invoiceIds` signs every unsigned TR invoice.
- On submit failure `gib_direct` surfaces `earsivStatus='rejected'` (no silent mock fallback) so the operator notices and can retry.
- Limits: the free portal is rate-limited (a few hundred docs/day) and issues e-Arşiv (B2C) only — for e-Fatura (B2B) at volume, use a paid integrator.

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
