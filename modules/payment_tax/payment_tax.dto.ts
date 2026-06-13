import { z } from 'zod'
import { CountryCodeInput, CurrencyCodeInput, DEFAULT_CURRENCY } from '@/modules/common'

// ============================================================================
// Tax Class DTOs
// ============================================================================

export const CreateTaxClassDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
})
export type CreateTaxClassDTO = z.infer<typeof CreateTaxClassDTO>

export const UpdateTaxClassDTO = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
})
export type UpdateTaxClassDTO = z.infer<typeof UpdateTaxClassDTO>

// ============================================================================
// Tax Rate DTOs
// ============================================================================

export const CreateTaxRateDTO = z.object({
  taxClassId: z.string().uuid().optional(),
  name: z.string().min(1),
  countryCode: CountryCodeInput.optional(),
  region: z.string().optional(),
  postalCodePattern: z.string().optional(),
  rate: z.number(),
  isCompound: z.boolean().default(false),
  includedInPrice: z.boolean().default(false),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
})
export type CreateTaxRateDTO = z.infer<typeof CreateTaxRateDTO>

export const UpdateTaxRateDTO = z.object({
  taxClassId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  countryCode: CountryCodeInput.nullable().optional(),
  region: z.string().nullable().optional(),
  postalCodePattern: z.string().nullable().optional(),
  rate: z.number().optional(),
  isCompound: z.boolean().optional(),
  includedInPrice: z.boolean().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
})
export type UpdateTaxRateDTO = z.infer<typeof UpdateTaxRateDTO>

// ============================================================================
// Calculation DTO
// ============================================================================

export const CalculateTaxDTO = z.object({
  currency: CurrencyCodeInput.default(DEFAULT_CURRENCY),
  destination: z.object({
    countryCode: CountryCodeInput.optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  lines: z.array(
    z.object({
      reference: z.string(),
      amount: z.number(),
      quantity: z.number().default(1),
      taxClassCode: z.string().optional(),
    }),
  ),
  // ── Rounding policy ───────────────────────────────────────────────────────
  /** 'half-up' (default, commercial) or 'half-even' (banker's rounding). */
  roundingMode: z.enum(['half-up', 'half-even']).default('half-up'),
  /** Round per line (default) or once at the order total. */
  roundingLevel: z.enum(['line', 'order']).default('line'),
  // ── Exemption / reverse-charge ────────────────────────────────────────────
  /** Customer is tax-exempt (reseller / non-profit / diplomatic) → zeroes tax. */
  exempt: z.boolean().default(false),
  exemptionReason: z.string().optional(),
  /** B2B intra-EU reverse charge: liability shifts to the buyer → zero-rated. */
  reverseCharge: z.boolean().default(false),
  /** Point-in-time for effective-dated rate selection (defaults to now). */
  at: z.coerce.date().optional(),
})
export type CalculateTaxDTO = z.infer<typeof CalculateTaxDTO>

// ============================================================================
// Query DTOs
// ============================================================================

export const GetTaxRatesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  countryCode: CountryCodeInput.optional(),
  taxClassId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
})
export type GetTaxRatesQuery = z.infer<typeof GetTaxRatesQuery>
