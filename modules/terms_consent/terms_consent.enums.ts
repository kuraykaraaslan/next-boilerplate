import { z } from 'zod';

// Consent purposes a subject can grant/withdraw. `necessary` cookies are
// strictly required for the service to work and are always implicitly granted
// (the banner shows them as a disabled, always-on checkbox).
export const ConsentPurposeEnum = z.enum(['necessary', 'functional', 'analytics', 'marketing']);
export type ConsentPurpose = z.infer<typeof ConsentPurposeEnum>;

// Where a consent decision came from.
export const ConsentSourceEnum = z.enum(['banner', 'api', 'import', 'admin']);
export type ConsentSource = z.infer<typeof ConsentSourceEnum>;

// Legal agreement types. `distance_selling` and `pre_information` are
// order-specific (rendered per order, stored verbatim); the rest are reusable
// versioned documents.
export const AgreementTypeEnum = z.enum([
  'terms_of_use',
  'privacy_policy',
  'kvkk', // TR personal-data clarification text
  'cookie',
  'distance_selling', // Mesafeli satış sözleşmesi
  'pre_information', // Ön bilgilendirme formu
  'refund_policy',
  'custom',
]);
export type AgreementType = z.infer<typeof AgreementTypeEnum>;

// Order-specific types are rendered from a template per order and stored verbatim
// on the acceptance, rather than referencing a reusable immutable version.
export const ORDER_SPECIFIC_AGREEMENT_TYPES: AgreementType[] = ['distance_selling', 'pre_information'];

export function isOrderSpecificAgreement(type: AgreementType): boolean {
  return ORDER_SPECIFIC_AGREEMENT_TYPES.includes(type);
}

// Lifecycle of an agreement version.
export const AgreementVersionStatusEnum = z.enum(['draft', 'published', 'archived']);
export type AgreementVersionStatus = z.infer<typeof AgreementVersionStatusEnum>;
