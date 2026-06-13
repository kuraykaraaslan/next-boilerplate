import type { ShippingCarrierAdapter } from './base.carrier'
import UpsCarrier from './ups.carrier'
import FedexCarrier from './fedex.carrier'
import DhlCarrier from './dhl.carrier'
import RoyalMailCarrier from './royalmail.carrier'
import YurticiCarrier from './yurtici.carrier'

// Singleton adapters (tenant context is passed per-call, never held on instance).
const ADAPTERS: ShippingCarrierAdapter[] = [
  new UpsCarrier(),
  new FedexCarrier(),
  new DhlCarrier(),
  new RoyalMailCarrier(),
  new YurticiCarrier(),
]

const BY_CODE = new Map(ADAPTERS.map((a) => [a.code, a]))

export function getCarrierAdapter(code: string): ShippingCarrierAdapter | null {
  return BY_CODE.get(code) ?? null
}

export function allCarrierAdapters(): ShippingCarrierAdapter[] {
  return ADAPTERS
}

/** Adapters that serve shipments originating from `countryCode`. */
export function carriersForOrigin(countryCode: string): ShippingCarrierAdapter[] {
  const cc = countryCode.toUpperCase()
  return ADAPTERS.filter((a) => a.regions.includes(cc as never))
}
