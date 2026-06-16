import { z } from 'zod';

// ============================================================================
// Terms & Consent Setting Keys
// ============================================================================

export const TermsConsentSettingKeySchema = z.enum([
  // ── Cookie-consent banner ──
  'consentBannerEnabled',
  'consentPolicyVersion',
  'consentBannerTitle',
  'consentBannerMessage',
  // JSON-stringified array of BannerPurpose ({ key, label, description, required }).
  'consentPurposes',

  // ── Checkout agreements ──
  // JSON-stringified array of AgreementType the checkout flow must collect before
  // payment (e.g. ["distance_selling","pre_information"]).
  'checkoutRequiredAgreements',

  // ── Seller legal identity (interpolated into distance-selling / pre-information docs) ──
  'legalSellerName',
  'legalSellerAddress',
  'legalSellerTaxOffice',
  'legalSellerTaxId',
  'legalSellerMersis',
  'legalSellerEmail',
  'legalSellerPhone',
]);
export type TermsConsentSettingKey = z.infer<typeof TermsConsentSettingKeySchema>;
export const TERMS_CONSENT_KEYS = TermsConsentSettingKeySchema.options;

// Subset read for cookie-banner config (avoids loading legal/seller keys).
export const CONSENT_BANNER_KEYS = [
  'consentBannerEnabled',
  'consentPolicyVersion',
  'consentBannerTitle',
  'consentBannerMessage',
  'consentPurposes',
] as const;

// Seller legal identity keys, used to render order-specific agreements.
export const SELLER_LEGAL_KEYS = [
  'legalSellerName',
  'legalSellerAddress',
  'legalSellerTaxOffice',
  'legalSellerTaxId',
  'legalSellerMersis',
  'legalSellerEmail',
  'legalSellerPhone',
] as const;
