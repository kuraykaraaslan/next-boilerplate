import axios from 'axios'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import SettingService from '@/modules/setting/setting.service'
import type { CountryCode } from '@/modules/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking } from './base.carrier'

/**
 * UPS adapter — OAuth2 client-credentials + the UPS Rating ("Shop") and
 * Tracking REST APIs. Conforms to the real UPS request/response shapes; works
 * once a tenant sets upsClientId/upsClientSecret/upsAccountNumber.
 */
export default class UpsCarrier implements ShippingCarrierAdapter {
  readonly code = 'UPS'
  readonly regions: readonly CountryCode[] = ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'IT', 'ES', 'TR']

  private base(sandbox: boolean) { return sandbox ? 'https://wwwcie.ups.com' : 'https://onlinetools.ups.com' }

  private async creds(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, ['upsClientId', 'upsClientSecret', 'upsAccountNumber', 'upsSandbox']).catch(() => ({} as Record<string, string | null>))
    return { clientId: s.upsClientId, clientSecret: s.upsClientSecret, account: s.upsAccountNumber, sandbox: s.upsSandbox === 'true' }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.clientId && c.clientSecret)
  }

  /** OAuth2 token (cached in Redis until shortly before expiry). */
  private async token(tenantId: string, clientId: string, clientSecret: string, sandbox: boolean): Promise<string | null> {
    const key = `ship:ups:token:${tenantId}`
    const cached = await redis.get(key).catch(() => null)
    if (cached) return cached
    try {
      const res = await axios.post(`${this.base(sandbox)}/security/v1/oauth/token`,
        new URLSearchParams({ grant_type: 'client_credentials' }),
        { auth: { username: clientId, password: clientSecret }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 })
      const tok = res.data?.access_token as string | undefined
      const ttl = Math.max(60, (Number(res.data?.expires_in) || 3600) - 60)
      if (tok) await redis.setex(key, ttl, tok).catch(() => {})
      return tok ?? null
    } catch (err) {
      Logger.warn(`[ship:ups] token failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  async getRates(tenantId: string, req: CarrierRateRequest): Promise<CarrierRate[]> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret) return []
    const tok = await this.token(tenantId, c.clientId, c.clientSecret, c.sandbox)
    if (!tok) return []
    try {
      const body = {
        RateRequest: {
          Request: { TransactionReference: { CustomerContext: 'rating' } },
          Shipment: {
            Shipper: { ShipperNumber: c.account ?? '', Address: { CountryCode: req.fromCountry, PostalCode: req.fromPostal ?? '' } },
            ShipTo: { Address: { CountryCode: req.toCountry, PostalCode: req.toPostal ?? '' } },
            ShipFrom: { Address: { CountryCode: req.fromCountry, PostalCode: req.fromPostal ?? '' } },
            Package: {
              PackagingType: { Code: '02' },
              PackageWeight: { UnitOfMeasurement: { Code: 'KGS' }, Weight: String(req.weightKg) },
              ...(req.dimensionsCm ? { Dimensions: { UnitOfMeasurement: { Code: 'CM' }, Length: String(req.dimensionsCm.length), Width: String(req.dimensionsCm.width), Height: String(req.dimensionsCm.height) } } : {}),
            },
          },
        },
      }
      const res = await axios.post(`${this.base(c.sandbox)}/api/rating/v2409/Shop`, body, {
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, timeout: 10000,
      })
      const shipments = res.data?.RateResponse?.RatedShipment ?? []
      const list = Array.isArray(shipments) ? shipments : [shipments]
      return list.map((r: any) => ({
        carrier: 'UPS',
        serviceCode: r?.Service?.Code ?? '',
        serviceName: r?.Service?.Code ? `UPS ${r.Service.Code}` : 'UPS',
        price: Number(r?.TotalCharges?.MonetaryValue) || 0,
        currency: r?.TotalCharges?.CurrencyCode ?? req.currency,
        estimatedDays: r?.GuaranteedDelivery?.BusinessDaysInTransit ? Number(r.GuaranteedDelivery.BusinessDaysInTransit) : null,
      })).filter((r: CarrierRate) => r.price > 0)
    } catch (err) {
      Logger.warn(`[ship:ups] rate failed: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret) return null
    const tok = await this.token(tenantId, c.clientId, c.clientSecret, c.sandbox)
    if (!tok) return null
    try {
      const res = await axios.get(`${this.base(c.sandbox)}/api/track/v1/details/${encodeURIComponent(trackingNumber)}`, {
        headers: { Authorization: `Bearer ${tok}`, transId: `trk-${Date.now()}`, transactionSrc: 'app' }, timeout: 10000,
      })
      const pkg = res.data?.trackResponse?.shipment?.[0]?.package?.[0]
      const activity = pkg?.activity ?? []
      return {
        carrier: 'UPS', trackingNumber,
        status: activity[0]?.status?.description ?? 'UNKNOWN',
        events: activity.map((a: any) => ({
          timestamp: `${a?.date ?? ''}${a?.time ?? ''}`,
          status: a?.status?.type ?? '',
          description: a?.status?.description ?? '',
          location: a?.location?.address?.city ?? undefined,
        })),
      }
    } catch (err) {
      Logger.warn(`[ship:ups] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
