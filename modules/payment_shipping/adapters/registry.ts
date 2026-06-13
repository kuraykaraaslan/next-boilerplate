import type { CountryCode } from '@/modules/common'
import type { ShippingCarrierAdapter } from './base.carrier'
import UpsCarrier from './ups.carrier'
import FedexCarrier from './fedex.carrier'
import UspsCarrier from './usps.carrier'
import DhlCarrier from './dhl.carrier'
import RoyalMailCarrier from './royalmail.carrier'
import YurticiCarrier from './yurtici.carrier'
import GenericCarrier from './generic.carrier'

const TR: readonly CountryCode[] = ['TR']
const EU_UK: readonly CountryCode[] = ['DE', 'FR', 'NL', 'BE', 'IT', 'ES', 'GB', 'PL', 'AT', 'PT']

// Singleton adapters (tenant context is passed per-call, never held on instance).
const ADAPTERS: ShippingCarrierAdapter[] = [
  // US / global — bespoke real APIs
  new UpsCarrier(),
  new FedexCarrier(),
  new UspsCarrier(),
  new DhlCarrier(),
  new RoyalMailCarrier(),
  // Turkey
  new YurticiCarrier(),
  new GenericCarrier('ARAS', TR, 'aras'),
  new GenericCarrier('MNG', TR, 'mng'),
  new GenericCarrier('PTT', TR, 'ptt'),
  new GenericCarrier('SURAT', TR, 'surat'),
  new GenericCarrier('SENDEO', TR, 'sendeo'),
  new GenericCarrier('HEPSIJET', TR, 'hepsijet'),
  // Europe / UK — partner-gated integrations
  new GenericCarrier('DPD', EU_UK, 'dpd'),
  new GenericCarrier('GLS', EU_UK, 'gls'),
  new GenericCarrier('POSTNL', ['NL', 'BE', 'DE'], 'postnl'),
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
