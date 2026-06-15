import { z } from 'zod';

// ============================================================================
// GDPR Consent Setting Keys
// ============================================================================

export const GdprConsentSettingKeySchema = z.enum([
  'consentBannerEnabled',
  'consentPolicyVersion',
  'consentBannerTitle',
  'consentBannerMessage',
  // JSON-stringified array of BannerPurpose ({ key, label, description, required }).
  'consentPurposes',
]);
export type GdprConsentSettingKey = z.infer<typeof GdprConsentSettingKeySchema>;
export const GDPR_CONSENT_KEYS = GdprConsentSettingKeySchema.options;
