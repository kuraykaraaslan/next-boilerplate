import axios from 'axios'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import SettingService from '@/modules/setting/setting.service'
import type { CountryCode } from '@/modules/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking } from './base.carrier'

/**
 * USPS adapter (US) — the USPS APIs platform (OAuth2 client-credentials) for
 * domestic Prices and Tracking. Conforms to the real USPS v3 JSON contracts;
 * active once a tenant sets uspsClientId/uspsClientSecret.
 */
export default class UspsCarrier implements ShippingCarrierAdapter {
  readonly code = 'USPS'
  readonly regions: readonly CountryCode[] = ['US']
  private readonly BASE = 'https://apis.usps.com'

  private async creds(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, ['uspsClientId', 'uspsClientSecret']).catch(() => ({} as Record<string, string | null>))
    return { clientId: s.uspsClientId, clientSecret: s.uspsClientSecret }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.clientId && c.clientSecret)
  }

  private async token(tenantId: string, clientId: string, clientSecret: string): Promise<string | null> {
    const key = `ship:usps:token:${tenantId}`
    const cached = await redis.get(key).catch(() => null)
    if (cached) return cached
    try {
      const res = await axios.post(`${this.BASE}/oauth2/v3/token`,
        { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 })
      const tok = res.data?.access_token as string | undefined
      const ttl = Math.max(60, (Number(res.data?.expires_in) || 3600) - 60)
      if (tok) await redis.setex(key, ttl, tok).catch(() => {})
      return tok ?? null
    } catch (err) {
      Logger.warn(`[ship:usps] token failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  async getRates(tenantId: string, req: CarrierRateRequest): Promise<CarrierRate[]> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret) return []
    if (req.toCountry !== 'US' || req.fromCountry !== 'US') return [] // domestic only
    const tok = await this.token(tenantId, c.clientId, c.clientSecret)
    if (!tok) return []
    try {
      // USPS prices are in lbs; convert from kg.
      const lbs = Math.max(1, Math.ceil(req.weightKg * 2.20462))
      const res = await axios.post(`${this.BASE}/prices/v3/base-rates/search`, {
        originZIPCode: req.fromPostal ?? '', destinationZIPCode: req.toPostal ?? '',
        weight: lbs, mailClass: 'USPS_GROUND_ADVANTAGE', priceType: 'RETAIL',
        processingCategory: 'MACHINABLE', rateIndicator: 'DR', destinationEntryFacilityType: 'NONE',
      }, { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, timeout: 10000 })
      const rates = res.data?.rates ?? (res.data?.totalBasePrice ? [{ price: res.data.totalBasePrice, mailClass: 'USPS_GROUND_ADVANTAGE' }] : [])
      return rates.map((r: any) => ({
        carrier: 'USPS', serviceCode: r?.mailClass ?? 'USPS', serviceName: r?.description ?? r?.mailClass ?? 'USPS',
        price: Number(r?.price) || 0, currency: 'USD', estimatedDays: null,
      })).filter((r: CarrierRate) => r.price > 0)
    } catch (err) {
      Logger.warn(`[ship:usps] rate failed: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret) return null
    const tok = await this.token(tenantId, c.clientId, c.clientSecret)
    if (!tok) return null
    try {
      const res = await axios.get(`${this.BASE}/tracking/v3/tracking/${encodeURIComponent(trackingNumber)}`, {
        headers: { Authorization: `Bearer ${tok}` }, params: { expand: 'DETAIL' }, timeout: 10000,
      })
      const events = res.data?.trackingEvents ?? []
      return {
        carrier: 'USPS', trackingNumber,
        status: res.data?.status ?? events[0]?.eventType ?? 'UNKNOWN',
        events: events.map((e: any) => ({ timestamp: `${e?.eventTimestamp ?? ''}`, status: e?.eventType ?? '', description: e?.eventType ?? '', location: e?.eventCity ?? undefined })),
      }
    } catch (err) {
      Logger.warn(`[ship:usps] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
