import { z } from 'zod'
import { ShippingCarrierEnum } from './payment_shipping.enums'

// ============================================================================
// Shipping Method DTOs
// ============================================================================

export const CreateShippingMethodDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  carrier: ShippingCarrierEnum.optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type CreateShippingMethodDTO = z.infer<typeof CreateShippingMethodDTO>

export const UpdateShippingMethodDTO = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  carrier: ShippingCarrierEnum.optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type UpdateShippingMethodDTO = z.infer<typeof UpdateShippingMethodDTO>

// ============================================================================
// Shipping Rate DTOs
// ============================================================================

export const CreateShippingRateDTO = z.object({
  shippingMethodId: z.string().uuid(),
  name: z.string().min(1),
  countryCode: z.string().length(2).optional(),
  region: z.string().optional(),
  minWeight: z.number().nonnegative().optional(),
  maxWeight: z.number().nonnegative().optional(),
  minSubtotal: z.number().nonnegative().optional(),
  maxSubtotal: z.number().nonnegative().optional(),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  freeThreshold: z.number().nonnegative().optional(),
  estimatedDaysMin: z.number().int().nonnegative().optional(),
  estimatedDaysMax: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})
export type CreateShippingRateDTO = z.infer<typeof CreateShippingRateDTO>

export const UpdateShippingRateDTO = z.object({
  name: z.string().min(1).optional(),
  countryCode: z.string().length(2).optional(),
  region: z.string().optional(),
  minWeight: z.number().nonnegative().optional(),
  maxWeight: z.number().nonnegative().optional(),
  minSubtotal: z.number().nonnegative().optional(),
  maxSubtotal: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  freeThreshold: z.number().nonnegative().optional(),
  estimatedDaysMin: z.number().int().nonnegative().optional(),
  estimatedDaysMax: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})
export type UpdateShippingRateDTO = z.infer<typeof UpdateShippingRateDTO>

// ============================================================================
// Calculation / Query DTOs
// ============================================================================

export const CalculateShippingDTO = z.object({
  countryCode: z.string().length(2).optional(),
  region: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  subtotal: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
})
export type CalculateShippingDTO = z.infer<typeof CalculateShippingDTO>

export const GetShippingMethodsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  isActive: z.boolean().optional(),
  carrier: ShippingCarrierEnum.optional(),
})
export type GetShippingMethodsQuery = z.infer<typeof GetShippingMethodsQuery>
