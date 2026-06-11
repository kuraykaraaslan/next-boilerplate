# Good to Have — Invoice

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Country-Specific E-Invoice Standards

### ZUGFeRD / XRechnung (Germany)
**Why:** Germany mandates XRechnung for all B2G invoices and ZUGFeRD is the dominant hybrid PDF/XML format for B2B. The EU adapter today is a Peppol mock; ZUGFeRD requires embedding a UNCEFACT/CrossIndustryInvoice XML into the PDF itself (a PDF/A-3 attachment), which is a distinct document format not covered by the current Peppol stub.
**Complexity:** High
**Multi-tenant relevance:** Tenants with German corporate customers or government contracts need ZUGFeRD/XRechnung or face payment delays and legal non-compliance.
**Multi-country relevance:** Germany is the EU's largest economy; mandatory from 2025 for B2B invoices under the ViDA directive timeline.

### FatturaPA / SdI (Italy)
**Why:** Italy's `Sistema di Interscambio` (SdI) mandates e-invoicing for all resident businesses (B2B and B2C) since 2019. FatturaPA is an XML format distinct from Peppol UBL, transmitted via the SdI gateway. The EU Peppol adapter does not cover this path.
**Complexity:** High
**Multi-tenant relevance:** Tenants operating in Italy (including foreign companies with an Italian fiscal position) are legally required to use FatturaPA for all domestic invoices.
**Multi-country relevance:** Italy has one of the most mature and enforced e-invoicing mandates in the EU; non-compliance results in fines.

### Chorus Pro (France)
**Why:** France mandates B2G invoicing via Chorus Pro (a national e-invoicing platform) and is extending this to B2B from 2026. Peppol alone is insufficient; direct Chorus Pro API integration is required for French public sector customers.
**Complexity:** High
**Multi-tenant relevance:** Tenants supplying French public administration cannot use the generic Peppol stub to submit invoices legally.
**Multi-country relevance:** France's B2B mandate (Factur-X) uses a format similar to ZUGFeRD; a single implementation would cover both markets.

### CFDI (Mexico)
**Why:** Mexico's SAT mandates CFDI 4.0 for all invoices, including those issued by foreign companies with Mexican customers. There is no Latin American region or adapter in the current module.
**Complexity:** High
**Multi-tenant relevance:** Tenants with Mexican corporate customers cannot issue compliant invoices from the platform today.
**Multi-country relevance:** Mexico is Latin America's second-largest economy; CFDI is a prerequisite for any LATAM market entry.

### GST Invoice (India / Australia)
**Why:** India's GST framework requires e-invoicing (IRP portal) for businesses above a turnover threshold. Australia's GST requires specific tax invoice fields. Neither is covered today.
**Complexity:** High
**Multi-tenant relevance:** Tenants targeting APAC markets cannot issue compliant GST invoices.
**Multi-country relevance:** India and Australia together represent a significant SaaS buyer base; GST compliance is mandatory for local invoicing.

---

## Peppol Production Implementation

### Real UBL 2.1 / EN 16931 XML Generation
**Why:** The EU Peppol adapter's `submit()` generates a synthetic UUID and logs a mock message. No actual UBL 2.1 XML is built, no AS4 envelope is constructed, and no Access Point is called. The adapter is non-functional in production.
**Complexity:** High
**Multi-tenant relevance:** Every EU tenant who configures `peppolEndpointId` and `peppolAccessPointUrl` will silently get a mock success instead of a real submission.
**Multi-country relevance:** Peppol is the mandated or strongly recommended network in 30+ countries (all EU + NO, IS, AU, SG, NZ, JP). A real implementation unlocks all of them simultaneously.

### VIES VAT Number Validation (Online)
**Why:** `validateEuVatNumber()` does only a regex format check with no VIES roundtrip. Issuing a zero-VAT intra-EU invoice to an invalid or revoked VAT number exposes the tenant to VAT reclaim liability.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant is independently liable for incorrect zero-rate applications on their invoices.
**Multi-country relevance:** VIES validation is the EU-standard mechanism; all 27 member states' VAT numbers can be verified through a single API endpoint.

### OSS VAT Rate Table Updates
**Why:** The `EU_VAT_RATES` table in `eu_peppol.adapter.ts` is a hardcoded static constant. EU member states change VAT rates (e.g. Finland raised to 25.5% in 2024, Romania changed in 2024). A static table will produce incorrect tax amounts without a code update.
**Complexity:** Medium
**Multi-tenant relevance:** Incorrect VAT rates on invoices are the tenant's legal liability.
**Multi-country relevance:** VAT rates change at irregular intervals in most EU countries; an automated rate source (EC TEDB API or similar) is needed for long-term accuracy.

---

## Invoice Lifecycle

### Credit Note / Partial Refund
**Why:** The current lifecycle supports only `void` (cancels the entire invoice). A credit note (partial or full counter-invoice) is the legally required mechanism for correcting an issued invoice in most jurisdictions (TR e-Fatura iptal/iade, EU credit memo, US credit memo). `markVoid()` explicitly rejects paid invoices.
**Complexity:** High
**Multi-tenant relevance:** Every tenant that processes partial refunds (e.g. returned items on an order) needs credit notes; voiding and re-issuing is not legally equivalent.
**Multi-country relevance:** TR GİB, EU Peppol, and US Stripe Tax all have distinct credit note semantics that must be handled per-adapter.

### Dunning / Overdue Reminder Automation
**Why:** `dueDate` is stored but there is no scheduled job or hook that sends payment reminders when an invoice passes its due date. The Stripe webhook handles autopay failures, but manually-created invoices have no dunning flow.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with net-30/net-60 payment terms (common in B2B) need automated reminders; today they must implement these themselves outside the module.
**Multi-country relevance:** Payment reminder timing norms differ by market (e.g. DACH markets expect a formal Mahnung sequence; UK/US are more informal). Per-country dunning templates would be needed.

### Invoice Locking After Issue
**Why:** After `issue()` flips an invoice to `issued`, the underlying `Invoice` entity fields (customer name, amounts, notes) can still be modified by a direct DB operation or future service method. Legally, an issued invoice must be immutable; the module should enforce this at the service layer.
**Complexity:** Low
**Multi-tenant relevance:** Any tenant audit reveals immutability as a compliance requirement.
**Multi-country relevance:** TR GİB, EU VAT Directive, and US GAAP all require issued invoices to be immutable; only credit notes or cancellations are allowed.

---

## PDF and Document Rendering

### PDF/A-3 with Embedded XML (ZUGFeRD / Factur-X)
**Why:** The current jsPDF-based renderer produces a plain PDF. ZUGFeRD (DE) and Factur-X (FR) require a PDF/A-3 file with an embedded XML attachment. jsPDF does not support PDF/A-3; a server-side renderer (puppeteer, @pdftk, or a dedicated library like `pdf-lib`) would be needed.
**Complexity:** High
**Multi-tenant relevance:** Tenants needing ZUGFeRD/Factur-X compliance cannot use the current renderer.
**Multi-country relevance:** The hybrid PDF+XML format is the trajectory for most EU countries; building this once unlocks DE, FR, and AT simultaneously.

### Digital Signature Support
**Why:** TR e-Arşiv invoices must be digitally signed (the GİB portal handles this via SMS-OTP, but UBL-TR submitted via a paid integrator must carry an XAdES signature). EU Peppol documents require AS4 signing. The current adapters neither sign nor validate signatures.
**Complexity:** High
**Multi-tenant relevance:** Tenants using paid TR integrators (Foriba, Logo) need signed UBL-TR documents; the current adapter sends unsigned XML.
**Multi-country relevance:** Digital signing requirements are near-universal for mandatory e-invoicing regimes (TR, IT, FR, DE, MX).

### Multi-Language Label Support Expansion
**Why:** `invoicePdfLanguage` supports `en`, `tr`, `de`, `fr`. Spanish (ES/LATAM), Italian (IT), Portuguese (PT/BR), Arabic (AR), Dutch (NL), and Polish (PL) are missing. Tenants in these markets must issue legally-required document labels in the local language.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant can have a different locale requirement; the setting exists but the label set is thin.
**Multi-country relevance:** Direct requirement for ES, IT, PT, NL, PL market entry.

---

## Stripe Tax

### Real Stripe Tax Integration
**Why:** `us_standard.adapter.ts` logs a mock message and returns a synthetic calculation ID when `stripeTaxEnabled=true`. No actual `stripe.tax.calculations.create` call is made and `stripeTaxOrigin` (the declared per-tenant setting) is never read.
**Complexity:** Medium
**Multi-tenant relevance:** US tenants who set `stripeTaxEnabled=true` believe tax is being calculated; it is not. This is a silent compliance failure.
**Multi-country relevance:** Stripe Tax covers 40+ countries; a real implementation would extend sales tax compliance beyond the US to CA, AU, and EU OSS.

---

## Numbering and Compliance

### Fiscal-Year and Monthly Sequence Resets
**Why:** The invoice number sequence resets per calendar year (UTC). Many fiscal years do not align with the calendar year (e.g. UK April–March, IN April–March, AU July–June). Monthly resets (`INV-2025-06-00001`) are required in some jurisdictions (e.g. Portugal, Spain).
**Complexity:** Medium
**Multi-tenant relevance:** A per-tenant `invoiceNumberFormat` setting (hinted at in POSTURE.md) would allow each tenant to configure their fiscal calendar.
**Multi-country relevance:** Required for correct statutory invoicing in the UK, India, Australia, and several EU member states.

### Gap-Free Sequence Enforcement
**Why:** The sequence uses `MAX(invoiceNumber)` to find the last number, which works under normal conditions but has a gap risk: if a `create()` transaction rolls back after `getNextInvoiceNumber()` allocates a number, the sequence has a gap. Many jurisdictions (TR, IT, ES) legally prohibit gaps in invoice sequences.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant has an independent sequence; a gap in any tenant's sequence is that tenant's compliance problem.
**Multi-country relevance:** Gap-free sequences are required in TR (GİB), IT (FatturaPA), ES, and PT; the risk is real in any multi-threaded checkout environment.

---

## Multi-Warehouse / Multi-Legal-Entity

### Per-Legal-Entity Seller Identity
**Why:** The module supports one seller identity per tenant (one set of `company*` settings). Tenants operating as multiple legal entities in different countries (e.g. "Acme DE GmbH" and "Acme TR A.Ş.") need to issue invoices from different legal entities without creating separate platform tenants.
**Complexity:** High
**Multi-tenant relevance:** Large tenants with international subsidiaries need this; today they must split their operation across multiple tenants.
**Multi-country relevance:** Core requirement for any multi-country entity structure; each country typically requires invoices to originate from the local registered legal entity.
