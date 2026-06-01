import { z } from 'zod'

// ============================================================================
// Persisted entities
// ============================================================================

export const TaxClassSchema = z.object({
  taxClassId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type TaxClass = z.infer<typeof TaxClassSchema>

export const SafeTaxClassSchema = TaxClassSchema.omit({ deletedAt: true })
export type SafeTaxClass = z.infer<typeof SafeTaxClassSchema>

export const TaxRateSchema = z.object({
  taxRateId: z.string().uuid(),
  tenantId: z.string().uuid(),
  taxClassId: z.string().uuid().nullable(),
  name: z.string(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
  postalCodePattern: z.string().nullable(),
  rate: z.coerce.number(),
  isCompound: z.boolean(),
  includedInPrice: z.boolean(),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type TaxRate = z.infer<typeof TaxRateSchema>

// ============================================================================
// Calculation result shapes
// ============================================================================

// A single tax applied to a single line.
export const TaxLineSchema = z.object({
  taxRateId: z.string().uuid(),
  name: z.string(),
  rate: z.number(),
  taxableAmount: z.number(),
  taxAmount: z.number(),
  isCompound: z.boolean(),
})
export type TaxLine = z.infer<typeof TaxLineSchema>

// The tax breakdown for one caller-supplied line.
export const TaxCalculationLineSchema = z.object({
  reference: z.string(),
  taxClassCode: z.string().nullable(),
  netAmount: z.number(),
  taxAmount: z.number(),
  grossAmount: z.number(),
  taxes: z.array(TaxLineSchema),
})
export type TaxCalculationLine = z.infer<typeof TaxCalculationLineSchema>

// The full calculation result across all lines.
export const TaxCalculationResultSchema = z.object({
  currency: z.string().length(3),
  subtotalNet: z.number(),
  totalTax: z.number(),
  totalGross: z.number(),
  lines: z.array(TaxCalculationLineSchema),
  appliedRates: z.number().int(),
})
export type TaxCalculationResult = z.infer<typeof TaxCalculationResultSchema>
