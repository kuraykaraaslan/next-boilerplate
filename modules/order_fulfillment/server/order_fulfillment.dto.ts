import { z } from 'zod'
import { FulfillmentStatusEnum, HazmatClassEnum } from './order_fulfillment.enums'

// Carrier is a free-form string (validated against the per-tenant allowlist at
// the service layer) so live carriers from the shipping registry — ROYAL_MAIL,
// GLS, POSTNL, etc. — are accepted, not just the legacy compile-time enum.
const CarrierInput = z.string().min(1).max(50)

const DimensionsInput = z.object({
  length: z.coerce.number().optional(), width: z.coerce.number().optional(),
  height: z.coerce.number().optional(), unit: z.string().optional(),
})

// ============================================================================
// Fulfillment DTOs
// ============================================================================

export const FulfillmentItemInputSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  sku: z.string().optional(),
  name: z.string(),
  quantity: z.number().int().positive().default(1),
  backorderedQuantity: z.number().int().nonnegative().default(0),
  hsCode: z.string().max(14).optional(),
  countryOfOrigin: z.string().length(2).optional(),
  unitValue: z.coerce.number().nonnegative().optional(),
  isDangerousGoods: z.boolean().default(false),
  hazmatClass: HazmatClassEnum.optional(),
  unNumber: z.string().max(10).optional(),
})
export type FulfillmentItemInput = z.infer<typeof FulfillmentItemInputSchema>

export const CreateFulfillmentDTO = z.object({
  orderId: z.string().uuid(),
  carrier: CarrierInput.optional(),
  shippingMethodId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  originCountry: z.string().length(2).optional(),
  estimatedDeliveryAt: z.coerce.date().optional(),
  isPartial: z.boolean().optional(),
  weightKg: z.coerce.number().nonnegative().optional(),
  dimensions: DimensionsInput.optional(),
  declaredValue: z.coerce.number().nonnegative().optional(),
  customsCurrency: z.string().length(3).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  items: z.array(FulfillmentItemInputSchema).min(1),
  /** Exactly-once guard for retried creates (an order may have several partial
   *  fulfillments, so there is no safe auto-key — supply one per logical create). */
  idempotencyKey: z.string().optional(),
})
export type CreateFulfillmentDTO = z.infer<typeof CreateFulfillmentDTO>

export const UpdateFulfillmentDTO = z.object({
  carrier: CarrierInput.optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  warehouseId: z.string().uuid().optional(),
  originCountry: z.string().length(2).optional(),
  estimatedDeliveryAt: z.coerce.date().optional(),
  weightKg: z.coerce.number().nonnegative().optional(),
  dimensions: DimensionsInput.optional(),
  declaredValue: z.coerce.number().nonnegative().optional(),
  customsCurrency: z.string().length(3).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type UpdateFulfillmentDTO = z.infer<typeof UpdateFulfillmentDTO>

export const AddTrackingDTO = z.object({
  carrier: CarrierInput,
  trackingNumber: z.string(),
  trackingUrl: z.string().url().optional(),
})
export type AddTrackingDTO = z.infer<typeof AddTrackingDTO>

export const UpdateStatusDTO = z.object({
  status: FulfillmentStatusEnum,
  message: z.string().optional(),
})
export type UpdateStatusDTO = z.infer<typeof UpdateStatusDTO>

export const BulkUpdateStatusDTO = z.object({
  fulfillmentIds: z.array(z.string().uuid()).min(1).max(500),
  status: FulfillmentStatusEnum,
  message: z.string().optional(),
})
export type BulkUpdateStatusDTO = z.infer<typeof BulkUpdateStatusDTO>

export const GetFulfillmentsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  status: FulfillmentStatusEnum.optional(),
  carrier: CarrierInput.optional(),
  trackingNumber: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
})
export type GetFulfillmentsQuery = z.infer<typeof GetFulfillmentsQuery>

// ============================================================================
// Warehouse DTOs
// ============================================================================

export const CreateWarehouseDTO = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  country: z.string().length(2),
  city: z.string().optional(),
  address: z.object({
    line1: z.string().optional(), line2: z.string().optional(),
    postalCode: z.string().optional(), region: z.string().optional(),
  }).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateWarehouseDTO = z.infer<typeof CreateWarehouseDTO>

export const UpdateWarehouseDTO = CreateWarehouseDTO.partial().omit({ code: true })
export type UpdateWarehouseDTO = z.infer<typeof UpdateWarehouseDTO>

export const AnalyticsQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
export type AnalyticsQuery = z.infer<typeof AnalyticsQuery>

// ============================================================================
// Shipping label generation
// ============================================================================

export const LabelAddressSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2),
})
export type LabelAddress = z.infer<typeof LabelAddressSchema>

export const GenerateLabelDTO = z.object({
  // When omitted, `from` is derived from the fulfillment's warehouse and `to`
  // from the order address in fulfillment metadata.
  from: LabelAddressSchema.optional(),
  to: LabelAddressSchema.optional(),
  serviceCode: z.string().optional(),
  labelFormat: z.enum(['PDF', 'ZPL', 'PNG']).default('PDF'),
  weightKg: z.coerce.number().positive().optional(),
})
export type GenerateLabelDTO = z.infer<typeof GenerateLabelDTO>
