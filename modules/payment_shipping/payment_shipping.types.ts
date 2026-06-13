import { z } from 'zod'
import { ShippingCarrierEnum } from './payment_shipping.enums'

// ============================================================================
// Shipping Method
// ============================================================================

export const ShippingMethodSchema = z.object({
  shippingMethodId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  carrier: ShippingCarrierEnum.nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>

export const SafeShippingMethodSchema = ShippingMethodSchema.omit({ deletedAt: true })
export type SafeShippingMethod = z.infer<typeof SafeShippingMethodSchema>

// ============================================================================
// Shipping Rate
// ============================================================================

export const ShippingRateSchema = z.object({
  shippingRateId: z.string().uuid(),
  tenantId: z.string().uuid(),
  shippingMethodId: z.string().uuid(),
  name: z.string(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
  minWeight: z.number().nullable(),
  maxWeight: z.number().nullable(),
  minSubtotal: z.number().nullable(),
  maxSubtotal: z.number().nullable(),
  price: z.number(),
  currency: z.string().max(3),
  freeThreshold: z.number().nullable(),
  estimatedDaysMin: z.number().int().nullable(),
  estimatedDaysMax: z.number().int().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type ShippingRate = z.infer<typeof ShippingRateSchema>

// ============================================================================
// Method + Rates
// ============================================================================

export const ShippingMethodWithRatesSchema = SafeShippingMethodSchema.extend({
  rates: z.array(ShippingRateSchema),
})
export type ShippingMethodWithRates = z.infer<typeof ShippingMethodWithRatesSchema>

// ============================================================================
// Quote (output of calculateShipping)
// ============================================================================

export const ShippingQuoteSchema = z.object({
  shippingMethodId: z.string().uuid(),
  methodName: z.string(),
  carrier: ShippingCarrierEnum.nullable(),
  rateId: z.string().uuid(),
  price: z.number(),
  currency: z.string().max(3),
  estimatedDaysMin: z.number().int().nullable(),
  estimatedDaysMax: z.number().int().nullable(),
  isFree: z.boolean(),
  /** Fees/duties breakdown (defaulted so existing callers are unaffected). */
  handlingFee: z.number().default(0),
  estimatedDuties: z.number().default(0),
  packageCount: z.number().int().default(1),
  chargeableWeight: z.number().nullable().default(null),
  incoterm: z.string().nullable().default(null),
  /** True when this quote came from a live carrier API rather than a stored rate. */
  live: z.boolean().default(false),
})
export type ShippingQuote = z.infer<typeof ShippingQuoteSchema>
