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
  'ROYAL_MAIL',
  'DPD',
  'CUSTOM',
])
export type ShippingCarrier = z.infer<typeof ShippingCarrierEnum>

/** Incoterms governing who pays duties/taxes on a cross-border shipment. */
export const IncotermEnum = z.enum(['DDP', 'DDU', 'DAP', 'EXW', 'FOB', 'CIF'])
export type Incoterm = z.infer<typeof IncotermEnum>
