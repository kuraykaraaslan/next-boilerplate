import type { CountryCode } from '@kuraykaraaslan/common'

/**
 * Live carrier adapter contract. Each adapter talks to a real carrier REST API
 * (UPS, FedEx, DHL, Royal Mail, Yurtiçi…) for live rate quotes and tracking.
 *
 * No-mock policy: an adapter returns `[]` / `null` when the tenant has not
 * configured credentials, and surfaces real errors otherwise — it never invents
 * a rate or a tracking status. Credentials are read per-tenant from settings so
 * the same singleton adapter serves all tenants.
 */

export interface CarrierRateRequest {
  fromCountry: string
  fromPostal?: string
  toCountry: string
  toPostal?: string
  weightKg: number
  dimensionsCm?: { length: number; width: number; height: number }
  declaredValue?: number
  currency: string
}

export interface CarrierRate {
  carrier: string
  serviceCode: string
  serviceName: string
  price: number
  currency: string
  estimatedDays?: number | null
}

export interface CarrierTrackingEvent {
  timestamp: string
  status: string
  location?: string
  description?: string
}

export interface CarrierTracking {
  carrier: string
  trackingNumber: string
  status: string
  estimatedDelivery?: string | null
  events: CarrierTrackingEvent[]
}

export interface CarrierAddress {
  name: string
  company?: string
  phone?: string
  email?: string
  street1: string
  street2?: string
  city: string
  state?: string
  postalCode: string
  countryCode: string
}

export interface CarrierLabelRequest {
  from: CarrierAddress
  to: CarrierAddress
  weightKg: number
  dimensionsCm?: { length: number; width: number; height: number }
  serviceCode?: string
  /** Preferred label format; carrier may downgrade. */
  labelFormat?: 'PDF' | 'ZPL' | 'PNG'
  reference?: string
  declaredValue?: number
  currency?: string
  /** Generate a return label (reverse from/to) rather than an outbound label. */
  isReturn?: boolean
}

export interface CarrierLabel {
  carrier: string
  trackingNumber: string
  labelFormat: 'PDF' | 'ZPL' | 'PNG'
  /** Base64-encoded label payload (always present on success). */
  labelBase64: string
  /** Carrier-hosted label URL when the API returns one. */
  labelUrl?: string | null
  cost?: number | null
  currency?: string | null
}

export interface ShippingCarrierAdapter {
  /** Matches the ShippingCarrierEnum code. */
  readonly code: string
  /** ISO 3166-1 alpha-2 origin countries this carrier serves from. */
  readonly regions: readonly CountryCode[]
  isConfigured(tenantId: string): Promise<boolean>
  getRates(tenantId: string, req: CarrierRateRequest): Promise<CarrierRate[]>
  track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null>
  /**
   * Generate a shipping label via the carrier's real label API. Optional —
   * adapters for carriers without an integrated label API (or partner-gated
   * ones) omit it; callers treat a missing method / null as "not available".
   */
  createLabel?(tenantId: string, req: CarrierLabelRequest): Promise<CarrierLabel | null>
}
