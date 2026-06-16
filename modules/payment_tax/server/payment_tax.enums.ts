import { z } from 'zod'

// Well-known tax class codes. Tenants may define additional classes, but these
// are the canonical machine codes recognised by the calculation engine.
export const TaxClassCodeEnum = z.enum(['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT', 'DIGITAL'])
export type TaxClassCode = z.infer<typeof TaxClassCodeEnum>
