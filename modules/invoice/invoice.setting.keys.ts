import { z } from 'zod';

/**
 * Per-tenant invoice / billing configuration. Every key is read via
 * `SettingService.getValue(tenantId, key)`.
 */
export const InvoiceSettingKeySchema = z.enum([
  // ── Issuer (seller) — required to print a legally valid invoice ───────────
  'companyLegalName',
  'companyTaxId',
  'companyTaxOffice',
  'companyAddressLine1',
  'companyAddressLine2',
  'companyCity',
  'companyPostalCode',
  'companyCountryCode',
  'companyPhone',
  'companyEmail',
  'companyWebsite',
  'companyLogoUrl',
  'companyIban',

  // ── Invoice formatting ─────────────────────────────────────────────────────
  'invoiceNumberPrefix',        // e.g. 'INV'
  'invoiceNumberPadding',       // digits to zero-pad to (default 5)
  'invoiceDefaultDueDays',      // 0 = on-receipt
  'invoiceDefaultCurrency',     // ISO 4217 (TRY/EUR/USD …)
  'invoiceDefaultVatRate',      // 0.20 → 20 %

  // ── Region selector (drives which adapter to use) ─────────────────────────
  'billingRegion',              // 'TR' | 'EU' | 'US' | 'OTHER'

  // ── TR e-Arşiv / e-Fatura specific ────────────────────────────────────────
  'earsivIntegrator',           // 'gib_direct' | 'foriba' | 'logo' | 'uyumsoft' | 'mock'
  'earsivIntegratorBaseUrl',    // optional — gib_direct defaults to the GİB TEST portal
  'earsivIntegratorUsername',   // TCKN (11) / VKN (10) — gib_direct portal login
  'earsivIntegratorPassword',   // gib_direct portal password / integrator API key
  'earsivIntegratorSandbox',    // 'true' (default) | 'false' — pick GİB TEST vs PROD when no baseUrl
  'earsivAutoSubmit',           // 'true' | 'false' — submit to GİB on issue()
  'earsivDocumentTypeOverride', // 'EARSIVFATURA' | 'TICARIFATURA' — auto by default

  // ── EU Peppol specific ────────────────────────────────────────────────────
  'peppolEndpointId',           // e.g. '0088:7300010000001'
  'peppolDocumentTypeId',
  'peppolAccessPointUrl',
  'peppolAutoSubmit',
  'euVatNumber',                // tenant's own VAT id for cross-border

  // ── US specific (Stripe Tax) ─────────────────────────────────────────────
  'stripeTaxEnabled',           // 'true' | 'false'
  'stripeTaxOrigin',            // JSON: { city, state, postal, country }

  // ── PDF template appearance (read by InvoicePdfService.buildPdf) ──────────
  'invoicePdfPrimaryColor',     // hex, default '#212529'
  'invoicePdfAccentColor',      // hex (totals row, headings), default '#0d6efd'
  'invoicePdfTextColor',        // hex, default '#212529'
  'invoicePdfMutedColor',       // hex (labels, subtle text), default '#6c757d'
  'invoicePdfFontFamily',       // 'helvetica' | 'courier' | 'times', default 'helvetica'
  'invoicePdfPaperSize',        // 'a4' | 'letter', default 'a4'
  'invoicePdfLanguage',         // 'en' | 'tr' | 'de' | 'fr' — label localisation
  'invoicePdfShowLogo',         // 'true' | 'false'
  'invoicePdfShowIban',         // 'true' | 'false'
  'invoicePdfShowTaxOffice',    // 'true' | 'false' (TR-only field)
  'invoicePdfFooterText',       // custom footer line (e.g. "Thank you for your business.")
  'invoicePdfFooterTermsUrl',   // URL printed in footer
  'invoicePdfHeaderTagline',    // small tagline under company name (e.g. slogan)
  'invoicePdfWatermark',        // 'PAID' | 'VOID' | '' — overlay on PDFs at that status
]);

export type InvoiceSettingKey = z.infer<typeof InvoiceSettingKeySchema>;
export const INVOICE_KEYS = InvoiceSettingKeySchema.options;
