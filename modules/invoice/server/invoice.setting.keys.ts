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
  'companyProvince',            // 2-letter province/state (IT Provincia, etc.)

  // ── Invoice formatting ─────────────────────────────────────────────────────
  'invoiceNumberPrefix',        // e.g. 'INV'
  'invoiceNumberPadding',       // digits to zero-pad to (default 5)
  'invoiceNumberResetPolicy',   // 'yearly' (default) | 'monthly' | 'fiscal' | 'never'
  'invoiceFiscalYearStartMonth',// 1-12 — fiscal year start (used when resetPolicy = 'fiscal')
  'invoiceCreditNotePrefix',    // credit note sequence prefix (default 'CN')
  'invoiceDefaultDueDays',      // 0 = on-receipt
  'invoiceDefaultCurrency',     // ISO 4217 (TRY/EUR/USD …)
  'invoiceDefaultVatRate',      // 0.20 → 20 % — fallback only; payment_tax is the source of truth

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
  'peppolAccessPointUrl',       // real Access Point submission endpoint
  'peppolAccessPointToken',     // optional bearer token for the Access Point
  'peppolAutoSubmit',
  'euVatNumber',                // tenant's own VAT id for cross-border

  // ── Document signing (mali mühür / qualified seal) ────────────────────────
  'invoiceSigningKeyPem',       // PEM private key (encrypted at rest)
  'invoiceSigningCertPem',      // PEM X.509 certificate (encrypted at rest)

  // ── IT FatturaPA / SdI ────────────────────────────────────────────────────
  'fatturapaGatewayUrl',        // intermediary endpoint that forwards to SdI
  'fatturapaGatewayToken',      // bearer token (encrypted at rest)
  'fatturapaTransmitterCountry',// IdTrasmittente IdPaese (e.g. 'IT')
  'fatturapaTransmitterCode',   // IdTrasmittente IdCodice (CF/VAT)
  'fatturapaCodiceDestinatario',// 7-char recipient code ('0000000' for PEC)
  'fatturapaPecDestinatario',   // recipient PEC when codiceDestinatario='0000000'
  'fatturapaFormat',            // 'FPR12' (private) | 'FPA12' (public admin)
  'fatturapaRegimeFiscale',     // e.g. 'RF01'

  // ── FR Chorus Pro / Factur-X ──────────────────────────────────────────────
  'chorusProGatewayUrl',
  'chorusProToken',             // bearer token (encrypted at rest)
  'chorusProSiret',

  // ── DE ZUGFeRD / XRechnung ────────────────────────────────────────────────
  'zugferdProfile',             // 'EN16931' | 'BASIC' | 'EXTENDED' | 'XRECHNUNG'
  'zugferdGatewayUrl',          // optional transmission endpoint
  'zugferdGatewayToken',

  // ── MX CFDI 4.0 (PAC) ─────────────────────────────────────────────────────
  'cfdiPacUrl',                 // PAC stamping endpoint
  'cfdiPacToken',               // PAC token (encrypted at rest)
  'cfdiRfcEmisor',
  'cfdiRegimenFiscal',          // e.g. '601'
  'cfdiSerie',
  'cfdiUsoCfdi',                // receptor usage, e.g. 'G03'
  'cfdiMetodoPago',             // 'PUE' | 'PPD'
  'cfdiFormaPago',              // e.g. '03' | '99'
  'cfdiReceptorRegimen',        // receptor tax regime (CFDI 4.0)

  // ── IN GST e-invoice (IRP) ────────────────────────────────────────────────
  'gstIrpUrl',                  // IRP/GSP endpoint
  'gstIrpToken',                // IRP token (encrypted at rest)
  'gstGstin',
  'gstStateCode',               // GST state code, e.g. '29'

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
