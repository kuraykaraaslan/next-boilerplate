import axios from 'axios'
import Logger from '@/modules/logger'
import SettingService from '@/modules/setting/setting.service'
import type { CountryCode } from '@/modules/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking } from './base.carrier'

/**
 * DHL Express adapter — the MyDHL API (Basic auth) for rates, plus the public
 * DHL Unified Shipment Tracking API (API key) for tracking. Conforms to the
 * real DHL request/response shapes; covers EU + UK + global lanes.
 */
export default class DhlCarrier implements ShippingCarrierAdapter {
  readonly code = 'DHL'
  readonly regions: readonly CountryCode[] = ['DE', 'GB', 'FR', 'NL', 'IT', 'ES', 'TR', 'US', 'AE']

  private base(sandbox: boolean) { return sandbox ? 'https://express.api.dhl.com/mydhlapi/test' : 'https://express.api.dhl.com/mydhlapi' }

  private async creds(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, ['dhlApiUser', 'dhlApiPassword', 'dhlAccountNumber', 'dhlTrackingApiKey', 'dhlSandbox']).catch(() => ({} as Record<string, string | null>))
    return { user: s.dhlApiUser, pass: s.dhlApiPassword, account: s.dhlAccountNumber, trackKey: s.dhlTrackingApiKey, sandbox: s.dhlSandbox === 'true' }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.user && c.pass)
  }

  async getRates(tenantId: string, req: CarrierRateRequest): Promise<CarrierRate[]> {
    const c = await this.creds(tenantId)
    if (!c.user || !c.pass) return []
    try {
      const planned = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
      const res = await axios.get(`${this.base(c.sandbox)}/rates`, {
        auth: { username: c.user, password: c.pass },
        params: {
          accountNumber: c.account ?? undefined,
          originCountryCode: req.fromCountry, originPostalCode: req.fromPostal ?? '',
          destinationCountryCode: req.toCountry, destinationPostalCode: req.toPostal ?? '',
          weight: req.weightKg, weightUnit: 'metric',
          length: req.dimensionsCm?.length ?? 1, width: req.dimensionsCm?.width ?? 1, height: req.dimensionsCm?.height ?? 1,
          plannedShippingDate: planned, isCustomsDeclarable: req.fromCountry !== req.toCountry,
          unitOfMeasurement: 'metric',
        },
        timeout: 10000,
      })
      const products = res.data?.products ?? []
      return products.map((p: any) => {
        const price = p?.totalPrice?.find((tp: any) => tp?.currencyType === 'BILLC') ?? p?.totalPrice?.[0]
        return {
          carrier: 'DHL',
          serviceCode: p?.productCode ?? '',
          serviceName: p?.productName ?? 'DHL Express',
          price: Number(price?.price) || 0,
          currency: price?.priceCurrency ?? req.currency,
          estimatedDays: p?.deliveryCapabilities?.totalTransitDays ? Number(p.deliveryCapabilities.totalTransitDays) : null,
        }
      }).filter((r: CarrierRate) => r.price > 0)
    } catch (err) {
      Logger.warn(`[ship:dhl] rate failed: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.trackKey) return null
    try {
      const res = await axios.get('https://api-eu.dhl.com/track/shipments', {
        headers: { 'DHL-API-Key': c.trackKey }, params: { trackingNumber }, timeout: 10000,
      })
      const sh = res.data?.shipments?.[0]
      const events = sh?.events ?? []
      return {
        carrier: 'DHL', trackingNumber,
        status: sh?.status?.statusCode ?? sh?.status?.status ?? 'UNKNOWN',
        estimatedDelivery: sh?.estimatedTimeOfDelivery ?? null,
        events: events.map((e: any) => ({ timestamp: e?.timestamp ?? '', status: e?.statusCode ?? '', description: e?.description ?? '', location: e?.location?.address?.addressLocality ?? undefined })),
      }
    } catch (err) {
      Logger.warn(`[ship:dhl] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
