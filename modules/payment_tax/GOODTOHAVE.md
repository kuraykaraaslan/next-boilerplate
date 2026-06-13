# Good to Have — Payment Tax

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## VAT / GST Compliance

### EU VAT OSS / MOSS Compliance (Digital Services)
**Why:** The engine can model EU VAT rates as `TaxRate` rows but has no awareness of the EU's One Stop Shop (OSS) rules, which require digital service providers to charge the VAT rate of the buyer's EU member state rather than the seller's.
**Complexity:** High
**Multi-tenant relevance:** Any tenant selling digital services (SaaS, digital content) to EU consumers must apply destination-based VAT; the current engine applies rates based on `countryCode` but has no enforcement mechanism ensuring the correct member-state rate is used.
**Multi-country relevance:** OSS covers 27 EU member states each with their own standard and reduced rates; the rate matrix must be complete and automatically applied based on buyer country.

### ✅ VAT Number Validation and B2B Zero-Rating (Reverse Charge)
**Why:** The module has no concept of a buyer's VAT number; EU B2B transactions (reverse charge mechanism) should be zero-rated when the buyer has a valid EU VAT number in a different member state, but this logic is entirely absent.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants selling B2B across EU borders who do not apply reverse charge will over-collect VAT and face compliance audits.
**Multi-country relevance:** Reverse charge applies across the entire EU/EEA and requires real-time VAT number validation via the EU VIES API.

### GST / HST Multi-Rate Support (Canada)
**Why:** Canada's tax system combines federal GST with provincial HST/QST/PST rates that vary not only by province but by product type; the current engine models this as standard multi-rate calculation, but Canada requires that the combined tax be presented as a single line on the invoice.
**Complexity:** Medium
**Multi-tenant relevance:** Any Canadian tenant or tenant with Canadian customers needs correct provincial tax presentation and calculation.
**Multi-country relevance:** Canada is a major English-language SaaS market; tax miscalculation creates compliance and customer-trust problems.

### Australian GST (10% Flat, Threshold-Based)
**Why:** Australian GST is a flat 10% on most goods and services, but non-resident sellers are only required to register and collect once they exceed AUD 75,000 in annual sales; there is no threshold-based registration trigger or automatic GST toggle.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants approaching the AUD 75,000 threshold need an alert and a way to enable GST collection for Australian buyers.
**Multi-country relevance:** Australia-specific GST rules apply uniformly to all digital and physical goods sold to Australian consumers by overseas sellers above the threshold.

### Indian GST (CGST / SGST / IGST) Dual-Rate Structure
**Why:** India's GST is split between Central GST and State GST for domestic transactions, and Integrated GST for interstate transactions; a single rate field cannot model this two-component structure correctly.
**Complexity:** High
**Multi-tenant relevance:** Tenants registered in India (or selling to Indian customers above the ₹20 lakh threshold for digital services) must split tax between CGST/SGST or apply IGST.
**Multi-country relevance:** India is a top-3 global market by population; correct GST handling is required for any serious multi-country deployment.

### US Sales Tax Nexus and Rate Lookup
**Why:** US sales tax has no federal standard — it is state and county-level with over 10,000 taxing jurisdictions; the current engine can store rates as rows but has no integration with a tax rate API (TaxJar, Avalara, Vertex) that provides accurate per-ZIP-code rates.
**Complexity:** High
**Multi-tenant relevance:** Any tenant with US sales tax nexus (physical presence or economic nexus above state-specific thresholds) is legally required to collect and remit sales tax; the static rate table cannot be kept current manually.
**Multi-country relevance:** US sales tax is uniquely complex globally; a third-party rate API integration is the only practical solution.

### Turkish e-Fatura / KDV Integration
**Why:** Turkish KDV (VAT) is modeled as a standard rate, but Turkey mandates electronic invoicing (e-Fatura) for companies above certain revenue thresholds; the tax calculation result must feed into an e-Fatura submission, which is not supported.
**Complexity:** High
**Multi-tenant relevance:** Turkish tenants above the threshold face significant penalties for non-compliance; the boilerplate must support this for Turkish deployments.
**Multi-country relevance:** Turkey-specific but foundational for any multi-country platform targeting the Turkish market (one of the largest e-commerce markets in MENA/EMEA).

## Rounding & Precision

### ✅ Zero-Decimal Currency Rounding Support
**Why:** `round2()` always rounds to 2 decimal places; currencies like JPY, KRW, VND, and CLP have no minor units and must be rounded to 0 decimal places, producing incorrect tax amounts (e.g. `¥21.75` is not a valid JPY amount).
**Complexity:** Low
**Multi-tenant relevance:** Tenants targeting Japan, South Korea, Vietnam, or Chile need correct zero-decimal handling; all are exposed to this bug.
**Multi-country relevance:** Zero-decimal currencies are dominant in East Asia and some Latin American markets; the fix requires only a per-currency decimal lookup.

### ✅ Banker's Rounding (Half-Even) Option
**Why:** `Math.round()` uses "round half up" (0.5 → 1), which can introduce systematic upward bias on large volumes of transactions; EU tax compliance guidance and some national standards require banker's rounding (half-even).
**Complexity:** Low
**Multi-tenant relevance:** High-volume tenants (thousands of transactions per day) accumulate rounding errors that may trigger audit scrutiny.
**Multi-country relevance:** Several European tax authorities specify half-even rounding in their VAT guidance; the rounding mode should be per-tenant or per-jurisdiction configurable.

### ✅ Line-Level vs. Order-Level Tax Rounding
**Why:** Taxes are currently rounded at the line level and summed; some tax jurisdictions require tax to be rounded at the order level (apply rate to total, then round once), which produces a different total.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants operating in jurisdictions with order-level rounding requirements will have discrepancies between their calculated and reported tax amounts.
**Multi-country relevance:** The US (most states), Canada, and some EU member states specify order-level rounding in their sales tax regulations.

## Tax Exemptions & Special Cases

### ✅ Customer-Level Tax Exemption (Reseller / Non-Profit)
**Why:** There is no way to mark a specific customer or user as tax-exempt (e.g. a reseller with a tax exemption certificate, or a non-profit organization); all customers receive the same tax calculation.
**Complexity:** Medium
**Multi-tenant relevance:** B2B tenants regularly deal with resellers and exempt organizations; tax exemption certificates must be stored and respected at checkout.
**Multi-country relevance:** Exemption certificate requirements differ by country (US state-issued certificates, EU VAT number as reverse-charge trigger, Australian ATO exemptions).

### Digital Goods vs. Physical Goods Tax Classification
**Why:** The `TaxClassCodeEnum` includes `DIGITAL` as a class code, but there is no automatic detection or enforcement of different rates for digital vs. physical goods; the caller must pass the correct `taxClassCode`.
**Complexity:** Medium
**Multi-tenant relevance:** Many tenants sell a mix of digital and physical goods; automatic classification prevents operator error from applying the wrong rate.
**Multi-country relevance:** The digital/physical distinction drives wildly different tax treatment in the EU (digital services use buyer's country rate), US (digital goods tax varies by state), and Australia (GST applies equally).

### Product-Specific Tax Override Rules
**Why:** The engine applies rates at the class level but has no per-product tax override; some products within the same class may have special rates (e.g. children's books at zero rate vs. adult books at standard rate in the UK).
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with complex product catalogs spanning multiple tax treatments cannot model this without creating dozens of tax classes.
**Multi-country relevance:** Product-specific rate exceptions are jurisdiction-specific (UK book zero-rating, German reduced food rate exceptions) and are a routine requirement in any multi-product, multi-country deployment.

## Reporting & Compliance Output

### ✅ Tax Report Generation (Period-Based)
**Why:** There is no service method to aggregate tax collected for a given tenant across a date range; filing a VAT/GST return requires summing `taxAmount` by jurisdiction for the period, which must be queried from the `payment_sell` / invoice records — but there is no cross-module aggregate available.
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant must file periodic tax returns; an aggregate reporting service per tenant eliminates manual spreadsheet work.
**Multi-country relevance:** Tax reporting periods differ by country (monthly in Germany, quarterly in UK, annually in some US states); the reporting service needs to support flexible period parameters.

### ✅ Tax Calculation Audit Log
**Why:** `calculateTax` returns a result but does not persist the calculation inputs or outputs; if a tax authority audits a past transaction, the calculation that produced the charged amount cannot be reproduced from the current live `TaxRate` rows (which may have changed since the transaction).
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant is subject to tax audits; immutable audit records of tax calculations are a compliance necessity.
**Multi-country relevance:** Tax record retention requirements range from 5 years (UK) to 10 years (Germany) to indefinite (some APAC jurisdictions); per-country retention policies must be supported.

### ✅ Tax Rate Change History / Effective Date Support
**Why:** `TaxRate` has no `effectiveFrom` / `effectiveTo` date columns; when a government changes a VAT rate (e.g. Turkey's 2023 KDV increase from 18% to 20%), updating the rate immediately applies it to all historical recalculations retroactively.
**Complexity:** Medium
**Multi-tenant relevance:** All tenants with recurring billing or refund scenarios are affected by retroactive rate application.
**Multi-country relevance:** Tax rate changes happen frequently across all jurisdictions; effective-date support is a baseline requirement for any multi-country tax engine.
