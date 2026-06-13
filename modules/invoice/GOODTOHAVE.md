# Good to Have — Invoice

> Production-readiness backlog for a multi-tenant, multi-country SaaS platform.
> **Policy:** no mocks — a feature either really works or it is not shipped.
> Tax is single-sourced from the tenant's own `payment_tax` engine; e-invoice
> document signing goes through the shared `ESignatureDocumentService` in the
> `e_signature` module (real XAdES via `xml-crypto` with the tenant's seal
> certificate), wrapped by `InvoiceSignatureService`.

## ✅ Tax via `payment_tax` (no external/mock tax) ★ Implemented

`invoice.tax.service.ts` (`InvoiceTaxService.computeForLines`) prices every
invoice line through `PaymentTaxService.calculateTax()`, resolving the tenant's
own destination-matched `tax_rates` (country / region / postal), including
compound and price-inclusive rates. This is the single source of truth for VAT
/ KDV / sales tax across all regions. `InvoiceCrudService.create` calls it
automatically; it falls back to the manual `invoiceDefaultVatRate` only when the
caller passed explicit per-line rates or the tenant has no matching rate. The
engine is fail-open (an outage never blocks invoicing).

## Country-Specific E-Invoice Standards

> **Adapters + settings shipped (no mock).** Each country regime below now has a
> real document builder (correct XML/JSON for that authority) and a real adapter
> that POSTs to the tenant's configured gateway. There is **no fake success**:
> if the gateway/credentials are not configured the adapter returns `noop`; if a
> submission fails it throws. The fiscal stamp / IRN / SdI id is always assigned
> by the authority — never synthesised. The issuer's `companyCountryCode` selects
> the regime automatically (`resolveInvoiceAdapter`).
>
> | Country | Adapter | Builder | Gateway settings |
> |---|---|---|---|
> | IT | `it_fatturapa.adapter.ts` | `it_fatturapa.builder.ts` (FatturaPA 1.2) | `fatturapa*` |
> | FR | `fr_choruspro.adapter.ts` | `cii_xml.ts` (Factur-X CII) | `chorusPro*` |
> | DE | `de_zugferd.adapter.ts` | `cii_xml.ts` (ZUGFeRD CII) | `zugferd*` |
> | MX | `mx_cfdi.adapter.ts` | `mx_cfdi.builder.ts` (CFDI 4.0) | `cfdi*` |
> | IN | `in_gst.adapter.ts` | `in_gst.builder.ts` (IRP JSON 1.1) | `gst*` |
>
> SdI/Chorus Pro/ZUGFeRD documents are signed via `InvoiceSignatureService`
> (XAdES) when a seal certificate is configured. The remaining country-specific
> work is schema-completeness hardening against each authority's full XSD and
> the PDF/A-3 hybrid container (tracked below).

### ✅ ZUGFeRD / XRechnung (Germany)
**Why:** Germany mandates XRechnung for all B2G invoices and ZUGFeRD is the dominant hybrid PDF/XML format for B2B. The EU adapter today is a Peppol mock; ZUGFeRD requires embedding a UNCEFACT/CrossIndustryInvoice XML into the PDF itself (a PDF/A-3 attachment), which is a distinct document format not covered by the current Peppol stub.
**Complexity:** High
**Multi-tenant relevance:** Tenants with German corporate customers or government contracts need ZUGFeRD/XRechnung or face payment delays and legal non-compliance.
**Multi-country relevance:** Germany is the EU's largest economy; mandatory from 2025 for B2B invoices under the ViDA directive timeline.

### ✅ FatturaPA / SdI (Italy)
**Why:** Italy's `Sistema di Interscambio` (SdI) mandates e-invoicing for all resident businesses (B2B and B2C) since 2019. FatturaPA is an XML format distinct from Peppol UBL, transmitted via the SdI gateway. The EU Peppol adapter does not cover this path.
**Complexity:** High
**Multi-tenant relevance:** Tenants operating in Italy (including foreign companies with an Italian fiscal position) are legally required to use FatturaPA for all domestic invoices.
**Multi-country relevance:** Italy has one of the most mature and enforced e-invoicing mandates in the EU; non-compliance results in fines.

### ✅ Chorus Pro / Factur-X (France)
**Why:** France mandates B2G invoicing via Chorus Pro (a national e-invoicing platform) and is extending this to B2B from 2026. Peppol alone is insufficient; direct Chorus Pro API integration is required for French public sector customers.
**Complexity:** High
**Multi-tenant relevance:** Tenants supplying French public administration cannot use the generic Peppol stub to submit invoices legally.
**Multi-country relevance:** France's B2B mandate (Factur-X) uses a format similar to ZUGFeRD; a single implementation would cover both markets.

### ✅ CFDI 4.0 (Mexico)
**Why:** Mexico's SAT mandates CFDI 4.0 for all invoices, including those issued by foreign companies with Mexican customers. There is no Latin American region or adapter in the current module.
**Complexity:** High
**Multi-tenant relevance:** Tenants with Mexican corporate customers cannot issue compliant invoices from the platform today.
**Multi-country relevance:** Mexico is Latin America's second-largest economy; CFDI is a prerequisite for any LATAM market entry.

### ✅ GST e-invoice / IRP (India)
**Why:** India's GST framework requires e-invoicing (IRP portal) for businesses above a turnover threshold. Australia's GST requires specific tax invoice fields. Neither is covered today.
**Complexity:** High
**Multi-tenant relevance:** Tenants targeting APAC markets cannot issue compliant GST invoices.
**Multi-country relevance:** India and Australia together represent a significant SaaS buyer base; GST compliance is mandatory for local invoicing.

---

## Peppol Production Implementation

### ✅ Real UBL 2.1 / EN 16931 XML Generation
The mock is gone. `adapters/eu_ubl.ts` (`buildUblInvoiceXml`) serialises a real,
well-formed UBL 2.1 / EN 16931 (Peppol BIS Billing 3.0) `Invoice` document from
our rows — supplier/customer parties, tax totals, monetary totals, and line
items with VAT categories. `EuPeppolAdapter.submit()` builds this XML and does a
**real POST** to the tenant's configured `peppolAccessPointUrl` (optional bearer
via `peppolAccessPointToken`); the Access Point performs the AS4 transport onto
the network. **No fake success:** if no Access Point is configured it returns
`noop`, and if the POST fails it throws so the failure is recorded.
**Remaining:** the AS4 envelope itself is the Access Point's responsibility; we
do not run an AS4 stack in-process.

### ✅ VIES VAT Number Validation (Online)
`validateEuVatNumberOnline(country, vatNumber)` in `eu_peppol.adapter.ts` does a
**real REST roundtrip** to the EC VIES service
(`ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`), handling the
`EL` prefix for Greece and stripping the country prefix. It returns
`{ valid, source, name?, address? }`. On a VIES outage it returns
`source: 'unavailable'` with the local format verdict rather than silently
claiming validity, so the caller can choose to block or warn. The regex
`validateEuVatNumber()` remains as a fast pre-filter.

### OSS VAT Rate Table Updates
**Status:** Largely superseded. Invoice tax now comes from each tenant's own
`payment_tax` rates, which they keep current — so the static `EU_VAT_RATES`
constant is no longer the source of truth for issued invoices (it survives only
behind the `getOssVatRate()` helper for quick estimates). The remaining nicety
is an automated feed (EC TEDB API) to *seed/refresh* tenants' `payment_tax`
rates; that is a `payment_tax` concern, tracked there rather than here.
**Complexity:** Medium

---

## Invoice Lifecycle

### ✅ Credit Note / Partial Refund
`invoice.creditnote.service.ts` (`InvoiceCreditNoteService.create`, exposed as
`InvoiceService.createCreditNote`) issues a counter-document with negative
amounts referencing the original (`metadata.creditNoteOf`). Supports **full
reversal** (omit `lines`) and **partial** credits (per-line, per-quantity, with
proportional tax), validating that credited quantity never exceeds the original.
It only operates on `issued`/`paid` invoices, gets its own gap-free `CN-`
sequence, writes an audit entry, and fires the new `invoice.credit_note.created`
webhook. The original invoice stays immutable.

### Dunning / Overdue Reminder Automation
**Why:** `dueDate` is stored but there is no scheduled job or hook that sends payment reminders when an invoice passes its due date. The Stripe webhook handles autopay failures, but manually-created invoices have no dunning flow.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with net-30/net-60 payment terms (common in B2B) need automated reminders; today they must implement these themselves outside the module.
**Multi-country relevance:** Payment reminder timing norms differ by market (e.g. DACH markets expect a formal Mahnung sequence; UK/US are more informal). Per-country dunning templates would be needed.

### ✅ Invoice Locking After Issue
`InvoiceCrudService.updateDraft()` is the only field-mutation path and throws
`409 LOCKED` for any invoice whose status is not `draft`. Once issued, an invoice
is immutable at the service layer — corrections must go through a credit note
(TR GİB, EU VAT Directive, US GAAP all require this).

---

## PDF and Document Rendering

### PDF/A-3 with Embedded XML (ZUGFeRD / Factur-X)
**Why:** The current jsPDF-based renderer produces a plain PDF. ZUGFeRD (DE) and Factur-X (FR) require a PDF/A-3 file with an embedded XML attachment. jsPDF does not support PDF/A-3; a server-side renderer (puppeteer, @pdftk, or a dedicated library like `pdf-lib`) would be needed.
**Complexity:** High
**Multi-tenant relevance:** Tenants needing ZUGFeRD/Factur-X compliance cannot use the current renderer.
**Multi-country relevance:** The hybrid PDF+XML format is the trajectory for most EU countries; building this once unlocks DE, FR, and AT simultaneously.

### ✅ Digital Signature Support (real, offline — engine in `e_signature`)
The signing **engine is a shared, reusable service**:
`ESignatureDocumentService` in the `e_signature` module (`signXml`,
`signXmlIfConfigured`, `signXmlWithKeys`). It produces a **real enveloped
XAdES-BES / XML-DSig** signature via `xml-crypto` (RSA-SHA256, exclusive C14N,
X.509 cert embedded in `KeyInfo`) and is usable for any document (invoices,
contracts, archives, e-gov submissions). `invoice.signature.service.ts` is now a
thin wrapper that just pins the invoice seal's setting keys
(`invoiceSigningKeyPem` / `invoiceSigningCertPem`, AES-256-GCM encrypted at rest)
and delegates. The IT FatturaPA, FR Chorus Pro, and DE ZUGFeRD adapters call it
before transmission; when no cert is configured the document is sent unsigned —
no mock signature is ever produced.

This is deliberately separate from the `e_signature` mobile **identity-challenge**
workflow (`initiateLogin`/`pollStatus`), which authenticates a signer rather than
signing document bytes.
**Remaining:** full XAdES *qualifying properties* (signing time, cert digest)
and PAdES over the rendered PDF; the current enveloped XAdES-BES is valid and
accepted by gateways that verify enveloped XML-DSig.

### Multi-Language Label Support Expansion
**Why:** `invoicePdfLanguage` supports `en`, `tr`, `de`, `fr`. Spanish (ES/LATAM), Italian (IT), Portuguese (PT/BR), Arabic (AR), Dutch (NL), and Polish (PL) are missing. Tenants in these markets must issue legally-required document labels in the local language.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant can have a different locale requirement; the setting exists but the label set is thin.
**Multi-country relevance:** Direct requirement for ES, IT, PT, NL, PL market entry.

---

## Stripe Tax → replaced by `payment_tax`

### ✅ Stripe Tax mock removed
The `us_standard.adapter.ts` Stripe Tax mock (synthetic `txcalc_mock_…` id) and
the unused `stripeTaxEnabled` / `stripeTaxOrigin` settings have been removed. US
sales tax is now computed natively by the tenant's own `payment_tax` engine at
invoice-creation time (destination-matched state/postal rates); `submit()` is an
honest no-op. Tenants who genuinely want Stripe Tax can add it later as an
optional rate source behind `payment_tax` — no mock is shipped in the meantime.

---

## Numbering and Compliance

### ✅ Fiscal-Year and Monthly Sequence Resets
`InvoiceCrudService.periodSegment()` drives the period component of the number
from the `invoiceNumberResetPolicy` setting: `yearly` (default, `INV-2025-…`),
`monthly` (`INV-2025-06-…`), `fiscal` (honouring `invoiceFiscalYearStartMonth`,
labelled by the year the fiscal year begins), or `never` (single running
sequence). Configurable per tenant.

### ✅ Gap-Free Sequence Enforcement
`InvoiceCrudService.allocateNumber()` now runs **inside the create transaction**
under a `pg_advisory_xact_lock(hashtext('inv:<tenant>:<prefix>:<period>'))`.
Concurrent creates are serialised, and because the number is allocated and the
row inserted in the same transaction, a rollback releases the number without
leaving a gap. Required by TR (GİB), IT (FatturaPA), ES, and PT. Credit notes
use the same allocator for their own gap-free `CN-` series.

---

## Multi-Warehouse / Multi-Legal-Entity

### Per-Legal-Entity Seller Identity
**Why:** The module supports one seller identity per tenant (one set of `company*` settings). Tenants operating as multiple legal entities in different countries (e.g. "Acme DE GmbH" and "Acme TR A.Ş.") need to issue invoices from different legal entities without creating separate platform tenants.
**Complexity:** High
**Multi-tenant relevance:** Large tenants with international subsidiaries need this; today they must split their operation across multiple tenants.
**Multi-country relevance:** Core requirement for any multi-country entity structure; each country typically requires invoices to originate from the local registered legal entity.
