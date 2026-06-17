import axios from 'axios'
import redis from '@kuraykaraaslan/redis'
import Logger from '@kuraykaraaslan/logger'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import type { CountryCode } from '@kuraykaraaslan/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking, CarrierLabelRequest, CarrierLabel } from './base.carrier'

/**
 * FedEx adapter — OAuth2 + the FedEx Rate ("rates/quotes") and Track APIs.
 * Conforms to the real FedEx JSON contracts; active once a tenant sets
 * fedexClientId/fedexClientSecret/fedexAccountNumber.
 */
export default class FedexCarrier implements ShippingCarrierAdapter {
  readonly code = 'FEDEX'
  readonly regions: readonly CountryCode[] = ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'TR']

  private base(sandbox: boolean) { return sandbox ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com' }

  private async creds(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, ['fedexClientId', 'fedexClientSecret', 'fedexAccountNumber', 'fedexSandbox']).catch(() => ({} as Record<string, string | null>))
    return { clientId: s.fedexClientId, clientSecret: s.fedexClientSecret, account: s.fedexAccountNumber, sandbox: s.fedexSandbox === 'true' }
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.creds(tenantId)
    return Boolean(c.clientId && c.clientSecret && c.account)
  }

  private async token(tenantId: string, clientId: string, clientSecret: string, sandbox: boolean): Promise<string | null> {
    const key = `ship:fedex:token:${tenantId}`
    const cached = await redis.get(key).catch(() => null)
    if (cached) return cached
    try {
      const res = await axios.post(`${this.base(sandbox)}/oauth/token`,
        new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 })
      const tok = res.data?.access_token as string | undefined
      const ttl = Math.max(60, (Number(res.data?.expires_in) || 3600) - 60)
      if (tok) await redis.setex(key, ttl, tok).catch(() => {})
      return tok ?? null
    } catch (err) {
      Logger.warn(`[ship:fedex] token failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  async getRates(tenantId: string, req: CarrierRateRequest): Promise<CarrierRate[]> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret || !c.account) return []
    const tok = await this.token(tenantId, c.clientId, c.clientSecret, c.sandbox)
    if (!tok) return []
    try {
      const body = {
        accountNumber: { value: c.account },
        requestedShipment: {
          shipper: { address: { postalCode: req.fromPostal ?? '', countryCode: req.fromCountry } },
          recipient: { address: { postalCode: req.toPostal ?? '', countryCode: req.toCountry } },
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          rateRequestType: ['ACCOUNT', 'LIST'],
          requestedPackageLineItems: [{
            weight: { units: 'KG', value: req.weightKg },
            ...(req.dimensionsCm ? { dimensions: { length: req.dimensionsCm.length, width: req.dimensionsCm.width, height: req.dimensionsCm.height, units: 'CM' } } : {}),
          }],
        },
      }
      const res = await axios.post(`${this.base(c.sandbox)}/rate/v1/rates/quotes`, body, {
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'X-locale': 'en_US' }, timeout: 10000,
      })
      const details = res.data?.output?.rateReplyDetails ?? []
      return details.map((d: any) => {
        const shipment = d?.ratedShipmentDetails?.[0]
        return {
          carrier: 'FEDEX',
          serviceCode: d?.serviceType ?? '',
          serviceName: d?.serviceName ?? d?.serviceType ?? 'FedEx',
          price: Number(shipment?.totalNetCharge) || 0,
          currency: shipment?.currency ?? req.currency,
          estimatedDays: null,
        }
      }).filter((r: CarrierRate) => r.price > 0)
    } catch (err) {
      Logger.warn(`[ship:fedex] rate failed: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async track(tenantId: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret) return null
    const tok = await this.token(tenantId, c.clientId, c.clientSecret, c.sandbox)
    if (!tok) return null
    try {
      const res = await axios.post(`${this.base(c.sandbox)}/track/v1/trackingnumbers`,
        { trackingInfo: [{ trackingNumberInfo: { trackingNumber } }], includeDetailedScans: true },
        { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, timeout: 10000 })
      const result = res.data?.output?.completeTrackResults?.[0]?.trackResults?.[0]
      const scans = result?.scanEvents ?? []
      return {
        carrier: 'FEDEX', trackingNumber,
        status: result?.latestStatusDetail?.statusByLocale ?? result?.latestStatusDetail?.description ?? 'UNKNOWN',
        events: scans.map((s: any) => ({ timestamp: s?.date ?? '', status: s?.eventType ?? '', description: s?.eventDescription ?? '', location: s?.scanLocation?.city ?? undefined })),
      }
    } catch (err) {
      Logger.warn(`[ship:fedex] track failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  /** FedEx Ship API (/ship/v1/shipments) — real label generation. */
  async createLabel(tenantId: string, req: CarrierLabelRequest): Promise<CarrierLabel | null> {
    const c = await this.creds(tenantId)
    if (!c.clientId || !c.clientSecret || !c.account) return null
    const tok = await this.token(tenantId, c.clientId, c.clientSecret, c.sandbox)
    if (!tok) return null

    const imageType = req.labelFormat === 'ZPL' ? 'ZPLII' : req.labelFormat === 'PNG' ? 'PNG' : 'PDF'
    const party = (a: typeof req.from) => ({
      contact: { personName: a.name, ...(a.company ? { companyName: a.company } : {}), ...(a.phone ? { phoneNumber: a.phone } : {}) },
      address: {
        streetLines: [a.street1, ...(a.street2 ? [a.street2] : [])],
        city: a.city, ...(a.state ? { stateOrProvinceCode: a.state } : {}),
        postalCode: a.postalCode, countryCode: a.countryCode,
      },
    })
    try {
      const body: any = {
        labelResponseOptions: 'LABEL',
        accountNumber: { value: c.account },
        requestedShipment: {
          shipper: party(req.from),
          recipients: [party(req.to)],
          shipDatestamp: new Date().toISOString().slice(0, 10),
          serviceType: req.serviceCode || 'FEDEX_GROUND',
          packagingType: 'YOUR_PACKAGING',
          pickupType: 'USE_SCHEDULED_PICKUP',
          blockInsightVisibility: false,
          shippingChargesPayment: { paymentType: 'SENDER' },
          labelSpecification: { imageType, labelStockType: imageType === 'ZPLII' ? 'STOCK_4X6' : 'PAPER_4X6' },
          ...(req.isReturn ? { shipmentSpecialServices: { specialServiceTypes: ['RETURN_SHIPMENT'], returnShipmentDetail: { returnType: 'PRINT_RETURN_LABEL' } } } : {}),
          requestedPackageLineItems: [{
            weight: { units: 'KG', value: req.weightKg },
            ...(req.dimensionsCm ? { dimensions: { length: req.dimensionsCm.length, width: req.dimensionsCm.width, height: req.dimensionsCm.height, units: 'CM' } } : {}),
          }],
        },
      }
      const res = await axios.post(`${this.base(c.sandbox)}/ship/v1/shipments`, body, {
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'X-locale': 'en_US' }, timeout: 15000,
      })
      const shipment = res.data?.output?.transactionShipments?.[0]
      const piece = shipment?.pieceResponses?.[0]
      const doc = piece?.packageDocuments?.[0]
      const trackingNumber = piece?.trackingNumber ?? shipment?.masterTrackingNumber
      if (!doc?.encodedLabel || !trackingNumber) return null
      return {
        carrier: 'FEDEX', trackingNumber,
        labelFormat: imageType === 'ZPLII' ? 'ZPL' : (imageType as 'PDF' | 'PNG'),
        labelBase64: doc.encodedLabel,
        labelUrl: doc?.url ?? null,
        cost: Number(shipment?.shipmentAdvisoryDetails?.totalNetCharge ?? piece?.netRateAmount) || null,
        currency: piece?.currency ?? null,
      }
    } catch (err) {
      Logger.warn(`[ship:fedex] label failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
