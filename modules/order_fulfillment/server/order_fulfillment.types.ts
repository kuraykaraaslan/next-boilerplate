import { z } from 'zod'
import { FulfillmentStatusEnum, FulfillmentCarrierEnum, HazmatClassEnum } from './order_fulfillment.enums'

const DimensionsSchema = z.object({
  length: z.coerce.number().optional(), width: z.coerce.number().optional(),
  height: z.coerce.number().optional(), unit: z.string().optional(),
})

export const FulfillmentSchema = z.object({
  fulfillmentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  status: FulfillmentStatusEnum,
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  shippingMethodId: z.string().uuid().nullable(),
  warehouseId: z.string().uuid().nullable().optional(),
  originCountry: z.string().nullable().optional(),
  returnRequestId: z.string().uuid().nullable().optional(),
  publicTrackingToken: z.string().nullable().optional(),
  estimatedDeliveryAt: z.date().nullable().optional(),
  isPartial: z.boolean().default(false),
  weightKg: z.coerce.number().nullable().optional(),
  dimensions: DimensionsSchema.nullable().optional(),
  declaredValue: z.coerce.number().nullable().optional(),
  customsCurrency: z.string().nullable().optional(),
  customsData: z.unknown().nullable().optional(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  packedAt: z.date().nullable(),
  shippedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  returnedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Fulfillment = z.infer<typeof FulfillmentSchema>

export const SafeFulfillmentSchema = FulfillmentSchema.omit({ deletedAt: true })
export type SafeFulfillment = z.infer<typeof SafeFulfillmentSchema>

export const FulfillmentItemSchema = z.object({
  fulfillmentItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fulfillmentId: z.string().uuid(),
  orderItemId: z.string().uuid().nullable(),
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  sku: z.string().nullable(),
  name: z.string(),
  quantity: z.number().int(),
  backorderedQuantity: z.number().int().default(0),
  hsCode: z.string().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  unitValue: z.coerce.number().nullable().optional(),
  isDangerousGoods: z.boolean().default(false),
  hazmatClass: z.string().nullable().optional(),
  unNumber: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type FulfillmentItem = z.infer<typeof FulfillmentItemSchema>

export const FulfillmentEventSchema = z.object({
  fulfillmentEventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fulfillmentId: z.string().uuid(),
  status: FulfillmentStatusEnum,
  message: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
})
export type FulfillmentEvent = z.infer<typeof FulfillmentEventSchema>

export const FulfillmentWithItemsSchema = SafeFulfillmentSchema.extend({
  items: z.array(FulfillmentItemSchema),
  events: z.array(FulfillmentEventSchema),
})
export type FulfillmentWithItems = z.infer<typeof FulfillmentWithItemsSchema>

export const WarehouseSchema = z.object({
  warehouseId: z.string().uuid(),
  tenantId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string().nullable().optional(),
  address: z.object({
    line1: z.string().optional(), line2: z.string().optional(),
    postalCode: z.string().optional(), region: z.string().optional(),
  }).nullable().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Warehouse = z.infer<typeof WarehouseSchema>

export const CarrierSchema = z.object({
  carrierId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  trackingUrlPattern: z.string().nullable().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Carrier = z.infer<typeof CarrierSchema>

/** Aggregate fulfillment metrics for an admin operations dashboard. */
export interface FulfillmentAnalytics {
  total: number
  delivered: number
  cancelled: number
  returned: number
  deliveryRate: number
  cancellationRate: number
  returnRate: number
  avgHoursToShip: number | null
  avgHoursToDeliver: number | null
  onTimeDeliveryRate: number | null
  byCarrier: Array<{ carrier: string; total: number; delivered: number; onTimeRate: number | null }>
  byDestinationCountry: Array<{ country: string; total: number; delivered: number }>
}
