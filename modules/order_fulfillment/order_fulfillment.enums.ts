import { z } from 'zod'

export const FulfillmentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'BACKORDERED',
  'PACKED',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
])
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusEnum>

// Order-level fulfillment rollup across one order's fulfillments.
export const OrderFulfillmentStateEnum = z.enum(['UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULLY_FULFILLED'])
export type OrderFulfillmentState = z.infer<typeof OrderFulfillmentStateEnum>

// Dangerous-goods transport class (ADR road / IATA air). 'NONE' default.
export const HazmatClassEnum = z.enum([
  'NONE', 'CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4', 'CLASS_5',
  'CLASS_6', 'CLASS_7', 'CLASS_8', 'CLASS_9', 'LITHIUM_BATTERY',
])
export type HazmatClass = z.infer<typeof HazmatClassEnum>

export const FulfillmentCarrierEnum = z.enum([
  'ARAS',
  'YURTICI',
  'MNG',
  'PTT',
  'UPS',
  'FEDEX',
  'DHL',
  'TNT',
  'CUSTOM',
])
export type FulfillmentCarrier = z.infer<typeof FulfillmentCarrierEnum>
