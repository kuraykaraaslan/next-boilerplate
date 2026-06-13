import { z } from 'zod'

export const ShippingCarrierEnum = z.enum([
  // ── Turkey ────────────────────────────────────────────────────────────────
  'ARAS',
  'YURTICI',
  'MNG',
  'PTT',
  'SURAT',
  'SENDEO',
  'HEPSIJET',
  // ── Global / US ───────────────────────────────────────────────────────────
  'UPS',
  'FEDEX',
  'USPS',
  'DHL',
  'TNT',
  // ── Europe / UK ───────────────────────────────────────────────────────────
  'ROYAL_MAIL',
  'DPD',
  'GLS',
  'POSTNL',
  'CUSTOM',
])
export type ShippingCarrier = z.infer<typeof ShippingCarrierEnum>

/** Incoterms governing who pays duties/taxes on a cross-border shipment. */
export const IncotermEnum = z.enum(['DDP', 'DDU', 'DAP', 'EXW', 'FOB', 'CIF'])
export type Incoterm = z.infer<typeof IncotermEnum>
