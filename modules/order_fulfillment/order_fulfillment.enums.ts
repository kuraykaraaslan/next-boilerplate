import { z } from 'zod'

export const FulfillmentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
])
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusEnum>

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
