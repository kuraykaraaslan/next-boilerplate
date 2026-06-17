import axios from 'axios'
import Logger from '@kuraykaraaslan/logger'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import type { CountryCode } from '@kuraykaraaslan/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking } from './base.carrier'

/**
 * Royal Mail adapter (UK) — the Royal Mail Tracking API v2 (IBM API gateway,
 * Client-Id/Secret headers). Royal Mail has no open public *rating* API
 * (pricing is contract-based), so `getRates` returns `[]` and tenants price UK
 * domestic shipping with stored rates; tracking is live.
 */
export default class RoyalMailCarrier implements ShippingCarrierAdapter {
  readonly code = 'ROYAL_MAIL'
  readonly regions: readonly CountryCode[] = ['GB']

  private async creds(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, ['royalMailClientId', 'royalMailClientSecret']).catch(() => ({} as Record<string, string | null>))
    return { clientId: s.royalMailClientId, clientSecret: s.royalMailClientSecret }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.clientId && c.clientSecret)
  }

  // No open Royal Mail rating API — domestic rates come from stored tenant rates.
  async getRates(_tenantId: string, _req: CarrierRateRequest): Promise<CarrierRate[]> {
    return []
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret) return null
    try {
      const res = await axios.get(`https://api.royalmail.net/mailpieces/v2/${encodeURIComponent(trackingNumber)}/events`, {
        headers: { 'X-IBM-Client-Id': c.clientId, 'X-IBM-Client-Secret': c.clientSecret, Accept: 'application/json' },
        timeout: 10000,
      })
      const mp = res.data?.mailPieces
      const events = mp?.events ?? []
      return {
        carrier: 'ROYAL_MAIL', trackingNumber,
        status: mp?.summary?.lastEventCode ?? events[0]?.eventCode ?? 'UNKNOWN',
        estimatedDelivery: mp?.estimatedDelivery?.date ?? null,
        events: events.map((e: any) => ({ timestamp: e?.eventDateTime ?? '', status: e?.eventCode ?? '', description: e?.eventName ?? '', location: e?.locationName ?? undefined })),
      }
    } catch (err) {
      Logger.warn(`[ship:royalmail] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
