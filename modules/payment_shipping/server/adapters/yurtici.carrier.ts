import axios from 'axios'
import Logger from '@kuraykaraaslan/logger'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import type { CountryCode } from '@kuraykaraaslan/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking } from './base.carrier'

/**
 * Yurtiçi Kargo adapter (TR). Yurtiçi exposes a SOAP/integrator web service
 * rather than an open REST rating API, so domestic rates come from stored tenant
 * rates (`getRates` → []). Tracking is performed against the tenant-configured
 * Yurtiçi query endpoint (`yurticiApiUrl`) with the documented cargoKey query;
 * credentials and endpoint are per-tenant so each tenant uses its own contract.
 */
export default class YurticiCarrier implements ShippingCarrierAdapter {
  readonly code = 'YURTICI'
  readonly regions: readonly CountryCode[] = ['TR']

  private async creds(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, ['yurticiApiUrl', 'yurticiUsername', 'yurticiPassword']).catch(() => ({} as Record<string, string | null>))
    return { url: s.yurticiApiUrl, username: s.yurticiUsername, password: s.yurticiPassword }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.url && c.username && c.password)
  }

  // No open Yurtiçi rating API — TR domestic rates come from stored tenant rates.
  async getRates(_tenantId: string, _req: CarrierRateRequest): Promise<CarrierRate[]> {
    return []
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.url || !c.username || !c.password) return null
    try {
      // Yurtiçi "queryShipment" by cargo key — JSON bridge over the integrator
      // endpoint the tenant points us at (wsUserName/wsPassword + cargoKey).
      const res = await axios.post(c.url, {
        wsUserName: c.username, wsPassword: c.password, wsLanguage: 'TR',
        keyType: 0, key: trackingNumber, addHistoricalData: true, onlyTracking: false,
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 })
      const result = res.data?.shippingDeliveryItemDetailVO ?? res.data?.shipping ?? res.data
      const movements = result?.cargoEventList ?? result?.movements ?? []
      return {
        carrier: 'YURTICI', trackingNumber,
        status: result?.operationStatus ?? result?.docCurrentStatusName ?? 'UNKNOWN',
        events: (Array.isArray(movements) ? movements : []).map((m: any) => ({
          timestamp: m?.eventDate ?? m?.date ?? '', status: m?.eventName ?? m?.status ?? '',
          description: m?.eventName ?? '', location: m?.unitName ?? m?.location ?? undefined,
        })),
      }
    } catch (err) {
      Logger.warn(`[ship:yurtici] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
