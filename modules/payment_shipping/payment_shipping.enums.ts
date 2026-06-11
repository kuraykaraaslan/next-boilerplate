import { z } from 'zod'

export const ShippingCarrierEnum = z.enum([
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
export type ShippingCarrier = z.infer<typeof ShippingCarrierEnum>
