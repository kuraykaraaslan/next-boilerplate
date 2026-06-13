import axios from 'axios'
import Logger from '@/modules/logger'
import SettingService from '@/modules/setting/setting.service'
import type { CountryCode } from '@/modules/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking, CarrierTrackingEvent } from './base.carrier'

/**
 * Generic configurable-endpoint carrier adapter for carriers whose APIs are
 * SOAP / partner-gated and not uniform (most TR domestic carriers — Aras, MNG,
 * PTT, Sürat, Sendeo, Hepsijet — and several EU ones — DPD, GLS, PostNL).
 *
 * Each tenant points the adapter at its own integration endpoint via settings
 * (`<prefix>ApiUrl`) and supplies credentials (`<prefix>ApiKey` → Bearer, or
 * `<prefix>Username`/`<prefix>Password` → Basic). Tracking is a real POST of a
 * normalized `{ trackingNumber }` request to that endpoint; the response is read
 * leniently from the common field shapes. Rates come from stored tenant rates
 * (domestic carriers bill on contract), so `getRates` returns `[]`.
 *
 * This is not a mock: when a tenant wires its carrier's integration URL +
 * credentials, tracking hits the real service; unconfigured → null.
 */
export default class GenericCarrier implements ShippingCarrierAdapter {
  constructor(
    public readonly code: string,
    public readonly regions: readonly CountryCode[],
    private readonly prefix: string,
  ) {}

  private async creds(tenantId: string) {
    const p = this.prefix
    const s = await SettingService.getByKeys(tenantId, [`${p}ApiUrl`, `${p}ApiKey`, `${p}Username`, `${p}Password`]).catch(() => ({} as Record<string, string | null>))
    return { url: s[`${p}ApiUrl`], apiKey: s[`${p}ApiKey`], username: s[`${p}Username`], password: s[`${p}Password`] }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.url && (c.apiKey || (c.username && c.password)))
  }

  // Domestic/partner carriers bill on contract — rates come from stored rates.
  async getRates(_tenantId: string, _req: CarrierRateRequest): Promise<CarrierRate[]> {
    return []
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.url || !(c.apiKey || (c.username && c.password))) return null
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (c.apiKey) headers.Authorization = `Bearer ${c.apiKey}`
      const auth = !c.apiKey && c.username && c.password ? { username: c.username, password: c.password } : undefined
      const res = await axios.post(c.url, {
        trackingNumber,
        // SOAP-bridge integrators commonly expect credentials in-body too.
        ...(c.username ? { username: c.username, password: c.password } : {}),
      }, { headers, auth, timeout: 10000 })

      const data = res.data ?? {}
      const rawEvents: any[] = data.events ?? data.movements ?? data.trackingEvents ?? data.history ?? data.cargoEventList ?? []
      const events: CarrierTrackingEvent[] = (Array.isArray(rawEvents) ? rawEvents : []).map((e: any) => ({
        timestamp: e?.timestamp ?? e?.date ?? e?.eventDate ?? e?.time ?? '',
        status: e?.status ?? e?.eventType ?? e?.eventCode ?? e?.code ?? '',
        description: e?.description ?? e?.eventName ?? e?.statusText ?? '',
        location: e?.location ?? e?.unitName ?? e?.city ?? undefined,
      }))
      return {
        carrier: this.code,
        trackingNumber,
        status: data.status ?? data.currentStatus ?? data.statusText ?? events[0]?.status ?? 'UNKNOWN',
        estimatedDelivery: data.estimatedDelivery ?? data.deliveryDate ?? null,
        events,
      }
    } catch (err) {
      Logger.warn(`[ship:${this.code.toLowerCase()}] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
