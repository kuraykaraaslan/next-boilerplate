import { z } from 'zod';

// Consent purposes a subject can grant/withdraw. `necessary` cookies are
// strictly required for the service to work and are always implicitly granted
// (the banner shows them as a disabled, always-on checkbox).
export const ConsentPurposeEnum = z.enum(['necessary', 'functional', 'analytics', 'marketing']);
export type ConsentPurpose = z.infer<typeof ConsentPurposeEnum>;

// Where a consent decision came from.
export const ConsentSourceEnum = z.enum(['banner', 'api', 'import', 'admin']);
export type ConsentSource = z.infer<typeof ConsentSourceEnum>;
