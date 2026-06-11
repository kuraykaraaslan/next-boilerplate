# Invoice

- **id:** `invoice`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/invoice/`
- **tags:** invoice, billing, compliance, tax
- **icon:** `fas fa-file-invoice`
- **hasNextLayer:** true

Tenant-scoped invoicing with regional e-invoicing adapters (TR e-Arşiv, EU Peppol, US Stripe Tax). Each tenant issues its own invoices keyed to its own subscription / payment flow.

## Dependencies

- **requires:** `db`, `tenant`, `setting`, `audit_log`, `tenant_subscription`, `payment`, `notification_mail`

## Services

- `invoice.adapter.service.ts`
- `invoice.crud.service.ts`
- `invoice.pdf.renderer.service.ts`
- `invoice.pdf.service.ts`
- `invoice.service.ts`
- `invoice.transition.service.ts`

## Entities

- `invoice.entity.ts`
- `invoice_line.entity.ts`

## Enums

- `invoice.enums.ts`

## Message keys

- `invoice.messages.ts`

## Setting keys

- `invoice.setting.keys.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/invoices`
- `tenant` GET `/tenant/[tenantId]/api/invoices/[invoiceId]`
- `tenant` POST `/tenant/[tenantId]/api/invoices/[invoiceId]/issue`
- `tenant` POST `/tenant/[tenantId]/api/invoices/[invoiceId]/mark-paid`
- `tenant` GET `/tenant/[tenantId]/api/invoices/[invoiceId]/pdf`
- `tenant` POST `/tenant/[tenantId]/api/invoices/[invoiceId]/void`
- `tenant` POST `/tenant/[tenantId]/api/invoices/earsiv/sms/send`
- `tenant` POST `/tenant/[tenantId]/api/invoices/earsiv/sms/verify`
- `tenant` GET `/tenant/[tenantId]/api/invoices/preview`

## TypeORM entities

- `Invoice` (system) — `modules/invoice/entities/invoice.entity.ts`
- `InvoiceLine` (system) — `modules/invoice/entities/invoice_line.entity.ts`

## Next layer (modules_next/) surface

- `invoice/ui/EarsivSmsSignModal` _(ui, client)_
- `invoice/ui/InvoiceLineItemsTable` _(ui, client)_
- `invoice/ui/InvoiceTemplateSettings` _(ui, client)_

## README

# Invoice Module

Tenant-scoped invoicing with **regional e-invoicing adapters**: TR (e-Arşiv Fatura / e-Fatura), EU (Peppol BIS Billing 3.0), US (Stripe Tax). Each tenant issues its own invoices keyed to its own subscription / payment flow, renders a branded PDF, and (optionally) submits the legal e-document to the local authority — see [ADR 0006](../../docs/adr/0006-billing-and-e-invoicing.md).

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `Invoice` | `invoices` | One invoice header per tenant. Composite unique `(tenantId, invoiceNumber)`; denormalised customer + amounts; carries per-region submission state (`earsivUuid`/`earsivStatus`/`earsivIntegrator`, `peppolDocumentId`/`peppolStatus`, `stripeTaxCalculationId`) and `pdfStorageKey`. Soft-deletable. |
| `InvoiceLine` | `invoice_lines` | N rows per invoice. `description`, `quantity`, `unitPrice`, `taxRate` (decimal — `0.20` = 20%), computed `taxAmount`/`lineTotal`, optional `sourceType`/`sourceId` linking back to a subscription/order/usage record. |

Both live in the **tenant DB** (per-tenant `DataSource`); every row is isolated by `tenantId`.

---

## Files

| File | Purpose |
|---|---|
| `invoice.service.ts` | Create / issue / mark-paid / void / list invoices; per-tenant invoice-number sequence; TR e-Arşiv SMS finalisation (`requestEarsivSms` / `confirmEarsivSms`) |
| `invoice.pdf.service.ts` | `InvoicePdfService` — renders a branded PDF (jsPDF + jspdf-autotable), `renderPreview` for the settings UI, `renderAndStore` to upload to storage |
| `invoice.types.ts` | Zod schemas + input/output types (`CreateInvoiceInput`, `SafeInvoice`, `SafeInvoiceLine`) |
| `invoice.enums.ts` | `InvoiceStatus`, `InvoiceRegion`, `TaxScheme`, `InvoiceLineSource` |
| `invoice.messages.ts` | Error strings |
| `invoice.setting.keys.ts` | Per-tenant company info, formatting, per-region adapter config, and PDF appearance keys |
| `invoice.seed.ts` | Demo seed (both entities are tenant-scoped) |
| `entities/invoice.entity.ts` | `Invoice` — composite unique `(tenantId, invoiceNumber)` |
| `entities/invoice_line.entity.ts` | `InvoiceLine` — N rows per invoice |
| `adapters/base.adapter.ts` | `InvoiceAdapter` interface (`submit` / `cancel` / `isConfigured`) |
| `adapters/registry.ts` | Region → adapter map; `getInvoiceAdapter` / `listInvoiceAdapters` |
| `adapters/tr_earsiv.adapter.ts` | UBL-TR 2.1 XML builder + GİB portal JSON builder + integrator switch (gib_direct / Foriba / Logo / Uyumsoft / Bizplace / Mikrogep / mock) |
| `adapters/tr_gib_direct.client.ts` | Free GİB e-Arşiv Portal client — login / create draft / SMS-OTP sign / cancel (no integrator contract needed) |
| `adapters/tr_foriba.client.ts` | Foriba integrator HTTP client (UBL submit) |
| `adapters/tr_logo.client.ts` | Logo İnternet integrator HTTP client (UBL submit) |
| `adapters/tr_validators.ts` | TCKN + VKN checksum validation (`isValidTCKN` / `isValidVKN` / `isValidTrTaxId`) |
| `adapters/tr_vat_rates.ts` | Turkish KDV rate constants (`TR_VAT_RATES`, `trVatRate`) |
| `adapters/eu_peppol.adapter.ts` | Peppol BIS Billing 3.0 stub + OSS VAT helpers (`getOssVatRate`, `validateEuVatNumber`) |
| `adapters/us_standard.adapter.ts` | Stripe Tax bridge + EIN/ZIP helpers (`isValidEin`, `isValidUsZip`) |

---

## API Routes (tenant-scoped, ADMIN)

All routes live under `/tenant/[tenantId]/api/invoices/...` and require `requiredTenantRole: 'ADMIN'`.

| Method | Path | Service call | Description |
|---|---|---|---|
| GET | `/invoices` | `list` | Paginated invoice list (`?page=&pageSize=&status=`) |
| POST | `/invoices` | `create` | Create a `draft` invoice with computed totals (feature-gated) |
| GET | `/invoices/[invoiceId]` | `getById` (+ `getLines`) | Get one invoice with its lines |
| POST | `/invoices/[invoiceId]/issue` | `issue` | Submit to the regional adapter and flip to `issued` |
| POST | `/invoices/[invoiceId]/mark-paid` | `markPaid` | Manually record payment (out-of-band funds) |
| POST | `/invoices/[invoiceId]/void` | `markVoid` | Void a non-paid invoice + cancel at the authority |
| GET | `/invoices/[invoiceId]/pdf` | `InvoicePdfService.render` | Download the branded PDF |
| GET | `/invoices/preview` | `InvoicePdfService.renderPreview` | Synthetic PDF using current template settings (Settings UI) |
| POST | `/invoices/earsiv/sms/send` | `requestEarsivSms` | TR `gib_direct` only — request an SMS-OTP, returns `{ oid }` |
| POST | `/invoices/earsiv/sms/verify` | `confirmEarsivSms` | TR `gib_direct` only — verify `{ oid, code, invoiceIds? }`, signs drafts |

---

## Lifecycle

```
draft   ──issue()──▶   issued   ──markPaid()──▶   paid
  │                       │
  │                       └──markVoid()──▶ void
  └──markVoid()──▶ void
```

Statuses: `draft | issued | paid | void | refunded` (`InvoiceStatusEnum`).

- `create()` writes a `draft` invoice with computed totals (subtotal + per-line tax rolled up at 4-dp precision), emits `invoice.created` (audit + webhook).
- `issue()` calls the regional adapter (`submit()`) **only if** `adapter.isConfigured(tenantId)`, persists provider IDs (`earsivUuid` / `peppolDocumentId` / `stripeTaxCalculationId`) + status, flips to `issued`, emits `invoice.issued`, and sends the issued email. Best-effort: adapter failure is logged and does **not** block local issuance.
- `markPaid()` records `paidAt` + `paymentId`, emits `invoice.paid`, sends the receipt email. Idempotent (already-paid is a no-op). The Stripe webhook (`invoice.payment_succeeded`) calls this.
- `markVoid()` reverses a non-paid invoice and calls `adapter.cancel()` (when a provider doc exists) to inform the authority. Voiding a `paid` invoice is rejected (refund instead).

---

## Per-tenant company info

Before a tenant can issue an invoice, set these settings (Settings → Integrations → Invoicing):

| Key | Required? |
|---|---|
| `companyLegalName`, `companyTaxId`, `companyCountryCode` | ✓ (`create()` hard-fails without them) |
| `companyTaxOffice` | TR only |
| `companyAddressLine1`, `companyCity`, `companyPostalCode` | ✓ for legal print |
| `companyEmail`, `companyPhone`, `companyWebsite`, `companyIban`, `companyLogoUrl` | optional |
| `billingRegion` | `TR` / `EU` / `US` / `OTHER` (drives adapter + tax scheme) |
| `invoiceNumberPrefix` | default `INV` |
| `invoiceNumberPadding` | default `5` |
| `invoiceDefaultCurrency` | default `USD` |
| `invoiceDefaultDueDays` | default `0` (on-receipt) |
| `invoiceDefaultVatRate` | e.g. `0.20` |

The full set of keys (including the `invoicePdf*` appearance knobs and per-region adapter credentials) is the `InvoiceSettingKeySchema` enum in `invoice.setting.keys.ts`; see **Tenant Variability** below for the exhaustive table.

---

## Invoice numbering

`getNextInvoiceNumber()` produces a per-tenant, per-year monotonic sequence `PREFIX-YEAR-SEQ` (e.g. `INV-2025-00001`). The prefix (`invoiceNumberPrefix`, default `INV`) and zero-pad width (`invoiceNumberPadding`, default `5`) come from the tenant's settings; the year is the UTC calendar year. The next sequence is found by `MAX` over rows matching `tenantId` + the `PREFIX-YEAR-` prefix.

---

## PDF rendering

`InvoicePdfService` renders the **human-readable** copy (the legal e-document is the adapter's UBL/Peppol/Stripe artifact). One template serves every region; appearance is fully driven by the `invoicePdf*` settings — colors, font family, paper size, label language (`en`/`tr`/`de`/`fr`), logo/IBAN/tax-office toggles, header tagline, footer text/terms URL, and a diagonal watermark. The seller block is loaded from the `company*` settings.

- `render(tenantId, invoiceId)` → `Buffer`
- `renderPreview(tenantId)` → synthetic sample invoice using current template settings (for the settings UI)
- `renderAndStore(tenantId, invoiceId)` → uploads to storage (`folder: 'invoices'`) and writes `pdfStorageKey`

---

## Regional adapters

Adapters are constructed once in `registry.ts` and shared across tenants; all tenant config is read inside each call via `SettingService`. `getInvoiceAdapter(region)` resolves by region; `listInvoiceAdapters(tenantId)` reports per-region `configured` readiness.

### TR — e-Arşiv Fatura / e-Fatura

- `billingRegion='TR'` + one of `earsivIntegrator` ∈ {`mock`, `gib_direct`, `foriba`, `logo`, `uyumsoft`, `bizplace`, `mikrogep`}.
- UBL-TR 2.1 XML built by [tr_earsiv.adapter.ts](adapters/tr_earsiv.adapter.ts) — namespaces, supplier/customer parties, tax totals, line items.
- `mock` mode generates a UUID + status=`accepted` for local development.
- Paid integrators (`foriba` / `logo` / …): fill `earsivIntegratorBaseUrl`, `earsivIntegratorUsername`, `earsivIntegratorPassword` per your contract; the integrator branches POST the UBL-TR XML. `uyumsoft` / `bizplace` / `mikrogep` are stubs today and fall through to mock.
- KDV rates 0% / 1% / 10% / 20% via [tr_vat_rates.ts](adapters/tr_vat_rates.ts).
- TCKN + VKN checksum validators in [tr_validators.ts](adapters/tr_validators.ts).
- Document type: defaults to `EARSIVFATURA` (B2C). Set `earsivDocumentTypeOverride='TICARIFATURA'` for B2B (applied by the foriba/logo branches).

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

- `billingRegion='EU'` + `peppolEndpointId` + `peppolAccessPointUrl` (both gate `isConfigured()`).
- Mock returns a synthetic `peppol-{uuid}` document ID and status=`submitted`.
- Production: build EN-16931-compliant UBL 2.1 XML, wrap in AS4 envelope, POST to the Access Point.
- VAT-OSS helper: `getOssVatRate(consumerCountryCode)` for cross-border B2C digital services (rate table `EU_VAT_RATES`).
- VAT number regex per country via `validateEuVatNumber(country, vat)`. **No VIES roundtrip** — operators should call VIES asynchronously if real-time validation is needed.

### US — Stripe Tax

- `billingRegion='US'`. No federal e-invoice mandate, so `isConfigured()` is always `true`.
- `submit()` is a no-op (`status: 'noop'`) unless `stripeTaxEnabled='true'`, in which case it stubs a `stripe.tax.calculations.create` call and stores the calculation id in `stripeTaxCalculationId`.
- EIN format validator + US ZIP validator are exported for forms.

### OTHER

- No adapter. `issue()` skips submission; the local PDF is the only document.

---

## Feature gating

Every `create()` call enforces `FEATURE_KEYS.FEATURE_INVOICING` via `TenantSubscriptionService.assertFeatureAccess`. Tenants on a plan without invoicing get a `402 Payment Required` from the route layer. The root tenant is short-circuited (no gate).

---

## Stripe webhook integration

`modules/payment/payment.webhook.service.ts` listens for `invoice.payment_succeeded` (Stripe Customer Portal autorenewals) and, after our subscription is extended, calls:

1. `InvoiceService.create({ ... lines: [plan-line + proration if any], paymentId, subscriptionId })`
2. `InvoiceService.issue(tenantId, invoiceId)` (regional submit)
3. `InvoiceService.markPaid(tenantId, invoiceId, paymentId)`

A `invoice.payment_failed` event triggers `TenantSubscriptionService.startGracePeriod` and a dunning email. See [ADR 0006](../../docs/adr/0006-billing-and-e-invoicing.md).

---

## Events & emails

- **Webhooks** (`WebhookService.dispatchEvent`, fire-and-forget after commit): `invoice.created`, `invoice.issued`, `invoice.paid`.
- **Audit log** (`AuditLogService`): `invoice.created`, `invoice.issued`, `invoice.paid`, `invoice.voided`, `invoice.earsiv.signed`.
- **Emails** (`MailService`, fire-and-forget): issued email on `issue()`, receipt email on `markPaid()`.

---

## Mock / development mode

With `billingRegion='TR'` + `earsivIntegrator='mock'`, the boilerplate produces a real UBL-TR XML and a synthetic GİB UUID — enough for local development, screenshots, and tests. Production deploys MUST flip to a real integrator and provide credentials.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The invoice module issues, stores, and PDF-renders tenant-scoped invoices (with regional e-document submission via TR/EU/US adapters), and is deeply tenant-variable: seller identity, numbering, currency/VAT defaults, the chosen billing region/integrator, integrator credentials, and full PDF appearance are all per-tenant settings read with the request tenantId.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `companyLegalName` | string | — | tenant | Seller legal name printed on invoices/UBL; required by create() | `invoice.service.ts` |
| `companyTaxId` | string | — | tenant | Seller VKN/tax id; required by create(), printed and put in UBL-TR supplier party | `invoice.service.ts` |
| `companyTaxOffice` | string | — | tenant | Seller tax office (TR), shown on PDF when invoicePdfShowTaxOffice and in UBL | `invoice.pdf.service.ts` |
| `companyAddressLine1` | string | — | tenant | Seller street address on PDF/UBL | `invoice.pdf.service.ts` |
| `companyAddressLine2` | string | — | tenant | Seller address line 2 (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `companyCity` | string | — | tenant | Seller city on PDF/UBL | `invoice.pdf.service.ts` |
| `companyPostalCode` | string | — | tenant | Seller postal code on PDF/UBL | `invoice.pdf.service.ts` |
| `companyCountryCode` | string | — | tenant | Seller country; required by create(), shown on PDF/UBL | `invoice.service.ts` |
| `companyPhone` | string | — | tenant | Seller phone on PDF and adapter seller info | `invoice.pdf.service.ts` |
| `companyEmail` | string | — | tenant | Seller email on PDF and adapter seller info | `invoice.pdf.service.ts` |
| `companyWebsite` | string | — | tenant | Seller website (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `companyLogoUrl` | string | — | tenant | Seller logo URL loaded into PDF header (when invoicePdfShowLogo) | `invoice.pdf.service.ts` |
| `companyIban` | string | — | tenant | Seller IBAN shown in PDF footer (when invoicePdfShowIban) | `invoice.pdf.service.ts` |
| `invoiceNumberPrefix` | string | `INV` | tenant | Prefix for the per-tenant invoice number sequence | `invoice.service.ts` |
| `invoiceNumberPadding` | number | `5` | tenant | Zero-pad width of the invoice sequence number | `invoice.service.ts` |
| `invoiceDefaultDueDays` | number | `0` | tenant | Default due-date offset in days (0 = on receipt) when dueDate not supplied | `invoice.service.ts` |
| `invoiceDefaultCurrency` | string | `USD` | tenant | Default ISO-4217 currency when create() input omits currency | `invoice.service.ts` |
| `invoiceDefaultVatRate` | number | `0` | tenant | Default decimal VAT rate applied to lines lacking an explicit taxRate | `invoice.service.ts` |
| `billingRegion` | string | `OTHER` | tenant | TR\|EU\|US\|OTHER; selects tax scheme in create() and the regional adapter at issue/void | `invoice.service.ts` |
| `earsivIntegrator` | string | `mock` | tenant | Which TR e-Arsiv integrator (gib_direct\|foriba\|logo\|uyumsoft\|mock) submit/cancel routes to | `tr_earsiv.adapter.ts` |
| `earsivIntegratorBaseUrl` | string | — | tenant | Integrator endpoint URL (required for paid integrators; optional for gib_direct) | `tr_earsiv.adapter.ts` |
| `earsivIntegratorUsername` | string | — | tenant | TR integrator/portal login (TCKN/VKN) used by adapter and SMS finalisation | `tr_earsiv.adapter.ts` |
| `earsivIntegratorPassword` | string | — | tenant | TR integrator/portal password or API key | `tr_earsiv.adapter.ts` |
| `earsivIntegratorSandbox` | boolean | `true` | tenant | Pick GIB TEST vs PROD portal for gib_direct when no baseUrl | `tr_earsiv.adapter.ts` |
| `earsivDocumentTypeOverride` | string | — | tenant | Force EARSIVFATURA vs TICARIFATURA for foriba/logo submissions | `tr_earsiv.adapter.ts` |
| `earsivAutoSubmit` | boolean | — | tenant | Whether to submit to GIB on issue() (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `peppolEndpointId` | string | — | tenant | Tenant Peppol participant id; gates EU adapter isConfigured() | `eu_peppol.adapter.ts` |
| `peppolAccessPointUrl` | string | — | tenant | Tenant's Peppol Access Point URL; gates EU adapter isConfigured() | `eu_peppol.adapter.ts` |
| `peppolDocumentTypeId` | string | — | tenant | Peppol document type id (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `peppolAutoSubmit` | boolean | — | tenant | Auto-submit EU Peppol on issue (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `euVatNumber` | string | — | tenant | Tenant's own EU VAT id for cross-border (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `stripeTaxEnabled` | boolean | `false` | tenant | Whether US adapter runs a Stripe Tax calculation on submit() | `us_standard.adapter.ts` |
| `stripeTaxOrigin` | json | — | tenant | Origin address for Stripe Tax (declared; not yet read in code) | `invoice.setting.keys.ts` |
| `invoicePdfPrimaryColor` | string | `#212529` | tenant | PDF heading/seller-name color | `invoice.pdf.service.ts` |
| `invoicePdfAccentColor` | string | `#0d6efd` | tenant | PDF table-header / totals / watermark accent color | `invoice.pdf.service.ts` |
| `invoicePdfTextColor` | string | `#212529` | tenant | PDF body text color | `invoice.pdf.service.ts` |
| `invoicePdfMutedColor` | string | `#6c757d` | tenant | PDF muted/label/footer color | `invoice.pdf.service.ts` |
| `invoicePdfFontFamily` | string | `helvetica` | tenant | PDF font family (helvetica\|courier\|times) | `invoice.pdf.service.ts` |
| `invoicePdfPaperSize` | string | `a4` | tenant | PDF page format (a4\|letter) | `invoice.pdf.service.ts` |
| `invoicePdfLanguage` | string | `en` | tenant | PDF label localisation (en\|tr\|de\|fr) | `invoice.pdf.service.ts` |
| `invoicePdfShowLogo` | boolean | `true` | tenant | Whether seller logo is drawn on the PDF | `invoice.pdf.service.ts` |
| `invoicePdfShowIban` | boolean | `true` | tenant | Whether IBAN is printed in the PDF footer | `invoice.pdf.service.ts` |
| `invoicePdfShowTaxOffice` | boolean | `true` | tenant | Whether the TR tax office is appended to the tax-id line | `invoice.pdf.service.ts` |
| `invoicePdfFooterText` | string | — | tenant | Custom centered PDF footer line | `invoice.pdf.service.ts` |
| `invoicePdfFooterTermsUrl` | string | — | tenant | Terms URL printed in PDF footer | `invoice.pdf.service.ts` |
| `invoicePdfHeaderTagline` | string | — | tenant | Tagline/slogan under the seller name in the PDF header | `invoice.pdf.service.ts` |
| `invoicePdfWatermark` | string | — | tenant | Diagonal watermark text overlaid on the PDF (e.g. PAID/VOID) | `invoice.pdf.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Invoice` | `invoices` | invoiceNumber, customerEmail, customerName, customerTaxId, customerAddress, customerCountryCode, issueDate, dueDate, paidAt, subtotal, discountAmount, taxAmount, totalAmount, currency, status, region, taxScheme, earsivUuid, earsivStatus, earsivIntegrator, peppolDocumentId, peppolStatus, stripeTaxCalculationId, pdfStorageKey, notes, metadata |
| `InvoiceLine` | `invoice_lines` | invoiceId, description, quantity, unitPrice, taxRate, taxAmount, lineTotal, sourceType, sourceId, metadata |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `invoice.service.ts:create` — Feature-gates on tenant_subscription FEATURE_INVOICING (skipped for root tenant); region/taxScheme, currency, default VAT rate, due-date offset, and invoice-number prefix/padding all derived from per-tenant settings; missing seller identity (companyLegalName/TaxId/CountryCode) hard-fails per tenant.
- `invoice.service.ts:getNextInvoiceNumber` — Invoice-number sequence is per-tenant + per-year (WHERE tenantId=...), with prefix and zero-pad width taken from that tenant's settings.
- `invoice.service.ts:issue` — Selects the regional adapter from the invoice's tenant-derived region and only submits when that adapter isConfigured(tenantId); on success writes the tenant's earsivIntegrator setting onto the row.
- `registry.ts:getInvoiceAdapter / listInvoiceAdapters` — Adapter chosen by tenant billingRegion; isConfigured(tenantId) reports per-tenant readiness based on that tenant's integrator credentials.
- `tr_earsiv.adapter.ts:submit` — Branches on the tenant's earsivIntegrator (mock\|gib_direct\|foriba\|logo\|stubs) and uses that tenant's credentials/baseUrl/sandbox/document-type-override to talk to the chosen GIB integrator.
- `invoice.service.ts:buildGibClient / requestEarsivSms / confirmEarsivSms` — TR SMS-OTP finalisation uses the tenant's gib_direct username/password/baseUrl/sandbox and signs only that tenant's unsigned TR drafts.
- `eu_peppol.adapter.ts:isConfigured` — EU readiness gated on the tenant's peppolEndpointId + peppolAccessPointUrl.
- `us_standard.adapter.ts:submit` — Runs a Stripe Tax calculation only when the tenant's stripeTaxEnabled is 'true'; otherwise no-op.
- `invoice.pdf.service.ts:loadTemplateOptions / loadSeller / buildPdf` — Entire PDF appearance (colors, font, paper size, language labels, logo/IBAN/tax-office toggles, footer/tagline/watermark) and seller identity block are loaded per tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Per-line tax rounding/precision is hardcoded (Math.round(x*10000)/10000, i.e. 4 dp) in totals roll-up | `invoice.service.ts:create` | Different jurisdictions/currencies need different rounding (e.g. line-vs-invoice rounding, 0/2/3 dp); a global 4-dp rule can produce legally-wrong tax totals for some tenants/regions | `invoiceTaxRoundingMode` |
| Invoice number scheme is fixed to PREFIX-YEAR-SEQ with a UTC calendar-year reset | `invoice.service.ts:getNextInvoiceNumber` | Tenants/fiscal regimes need configurable formats (no year, fiscal-year reset, monthly reset, different separators); only prefix and padding are configurable today | `invoiceNumberFormat` |
| earsivAutoSubmit / peppolAutoSubmit are declared per-tenant keys but issue() always submits when the adapter isConfigured, ignoring them | `invoice.service.ts:issue` | Tenants that want to issue locally and submit to GIB/Peppol later have no way to opt out; the intended per-tenant auto-submit toggle is dead | `earsivAutoSubmit` |
| UBL-TR tax scheme/code is hardcoded to KDV / TaxTypeCode 0015 and ProfileID EARSIVFATURA | `tr_earsiv.adapter.ts:buildUblTrXml` | B2B (TICARIFATURA) and non-KDV tax categories (withholding, exemptions) per tenant/document are not expressible; earsivDocumentTypeOverride exists for foriba/logo but is not applied to the generated UBL | `earsivDefaultTaxCode` |
| EU Peppol VAT rate table (EU_VAT_RATES) and the validateEuVatNumber patterns are module-global constants | `eu_peppol.adapter.ts:EU_VAT_RATES/getOssVatRate` | Reduced/zero rates and rate changes vary by product category and over time; a hardcoded standard-rate table can misprice OSS B2C tax for a tenant. Arguably shared reference data, but tenants selling reduced-rate goods need overrides | `euVatRateOverrides` |
| Stripe Tax origin address is referenced as a setting (stripeTaxOrigin) but the US adapter never reads it; submit() is a mock that ignores origin | `us_standard.adapter.ts:submit` | Real Stripe Tax needs the tenant's origin address to compute nexus/rate; the declared per-tenant key is unused so every tenant would compute identically (or not at all) | `stripeTaxOrigin` |
| Storage folder for rendered invoice PDFs is hardcoded to 'invoices' | `invoice.pdf.service.ts:renderAndStore` | Tenants with custom storage layouts/retention may want a configurable prefix; low-priority and arguably fine as a global convention | `invoicePdfStorageFolder` |

---

## Dependencies

`@/modules/db` (per-tenant DataSource), `@/modules/setting` (per-tenant config), `@/modules/tenant_subscription` (feature gating), `@/modules/storage` (PDF upload), `@/modules/notification_mail` (issued/receipt emails), `@/modules/webhook` (lifecycle events), `@/modules/audit_log`, `@/modules/logger`. PDF rendering uses `jspdf` + `jspdf-autotable`.
