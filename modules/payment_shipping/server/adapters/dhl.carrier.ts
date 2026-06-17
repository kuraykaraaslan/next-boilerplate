import axios from 'axios'
import Logger from '@kuraykaraaslan/logger'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import type { CountryCode } from '@kuraykaraaslan/common'
import type { ShippingCarrierAdapter, CarrierRateRequest, CarrierRate, CarrierTracking, CarrierLabelRequest, CarrierLabel } from './base.carrier'

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

  /** DHL Express MyDHL API (/shipments) — real label generation. */
  async createLabel(tenantId: string, req: CarrierLabelRequest): Promise<CarrierLabel | null> {
    const c = await this.creds(tenantId)
    if (!c.user || !c.pass || !c.account) return null

    const encodingFormat = req.labelFormat === 'ZPL' ? 'zpl' : req.labelFormat === 'PNG' ? 'png' : 'pdf'
    const party = (a: typeof req.from) => ({
      postalAddress: {
        postalCode: a.postalCode, cityName: a.city, countryCode: a.countryCode,
        addressLine1: a.street1, ...(a.street2 ? { addressLine2: a.street2 } : {}),
      },
      contactInformation: {
        companyName: a.company || a.name, fullName: a.name,
        ...(a.phone ? { phone: a.phone } : {}), ...(a.email ? { email: a.email } : {}),
      },
    })
    try {
      const planned = new Date(Date.now() + 86_400_000).toISOString().slice(0, 19) + ' GMT+00:00'
      const customsDeclarable = req.from.countryCode !== req.to.countryCode
      const body: any = {
        plannedShippingDateAndTime: planned,
        pickup: { isRequested: false },
        productCode: req.serviceCode || 'P',
        accounts: [{ typeCode: 'shipper', number: c.account }],
        outputImageProperties: { encodingFormat, imageOptions: [{ typeCode: 'label', templateName: 'ECOM26_84_001' }] },
        customerDetails: { shipperDetails: party(req.from), receiverDetails: party(req.to) },
        content: {
          packages: [{
            weight: req.weightKg,
            dimensions: {
              length: req.dimensionsCm?.length ?? 1, width: req.dimensionsCm?.width ?? 1, height: req.dimensionsCm?.height ?? 1,
            },
          }],
          isCustomsDeclarable: customsDeclarable,
          description: req.reference ?? 'Shipment',
          incoterm: 'DAP',
          unitOfMeasurement: 'metric',
        },
      }
      const res = await axios.post(`${this.base(c.sandbox)}/shipments`, body, {
        auth: { username: c.user, password: c.pass },
        headers: { 'Content-Type': 'application/json' }, timeout: 20000,
      })
      const doc = res.data?.documents?.find((d: any) => d?.typeCode === 'label') ?? res.data?.documents?.[0]
      const trackingNumber = res.data?.shipmentTrackingNumber
      if (!doc?.content || !trackingNumber) return null
      return {
        carrier: 'DHL', trackingNumber,
        labelFormat: encodingFormat === 'zpl' ? 'ZPL' : encodingFormat === 'png' ? 'PNG' : 'PDF',
        labelBase64: doc.content,
        cost: Number(res.data?.shipmentCharges?.[0]?.price) || null,
        currency: res.data?.shipmentCharges?.[0]?.currencyType ?? null,
      }
    } catch (err) {
      Logger.warn(`[ship:dhl] label failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
