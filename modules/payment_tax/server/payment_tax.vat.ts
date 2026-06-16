import Logger from '@nb/logger'

/**
 * EU VAT number validation against the European Commission's VIES service —
 * the canonical home for VAT validation now lives in the tax engine
 * (`payment_tax`), so invoice / checkout flows delegate here instead of each
 * re-implementing it. Real REST roundtrip; Greece uses the `EL` prefix.
 *
 * On a VIES outage we return `source: 'unavailable'` (never silently "valid"),
 * so the caller decides whether to block B2B zero-rating or proceed with a
 * standard-rated charge.
 */
export interface VatValidationResult {
  valid: boolean
  source: 'vies' | 'unavailable'
  countryCode: string
  vatNumber: string
  name?: string
  address?: string
}

export async function validateVatNumber(country: string, vatNumber: string, timeoutMs = 5000): Promise<VatValidationResult> {
  const countryCode = country.toUpperCase() === 'GR' ? 'EL' : country.toUpperCase()
  const cleaned = vatNumber.toUpperCase().replace(/[\s-]/g, '').replace(new RegExp(`^${countryCode}`), '')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber: cleaned }),
      signal: controller.signal,
    })
    if (!res.ok) return { valid: false, source: 'unavailable', countryCode, vatNumber: cleaned }
    const json = (await res.json()) as { valid?: boolean; name?: string; address?: string }
    return {
      valid: Boolean(json.valid),
      source: 'vies',
      countryCode,
      vatNumber: cleaned,
      name: json.name && json.name !== '---' ? json.name : undefined,
      address: json.address && json.address !== '---' ? json.address : undefined,
    }
  } catch (err) {
    Logger.warn(`[payment_tax.vat] VIES check failed for ${countryCode}${cleaned}: ${err instanceof Error ? err.message : err}`)
    return { valid: false, source: 'unavailable', countryCode, vatNumber: cleaned }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Decide whether an intra-EU B2B sale qualifies for reverse charge: buyer and
 * seller in different EU member states and the buyer holds a VIES-valid VAT
 * number. Returns the validation result alongside the decision.
 */
export async function qualifiesForReverseCharge(args: {
  sellerCountry: string
  buyerCountry: string
  buyerVatNumber?: string | null
}): Promise<{ reverseCharge: boolean; validation: VatValidationResult | null }> {
  const seller = args.sellerCountry?.toUpperCase()
  const buyer = args.buyerCountry?.toUpperCase()
  if (!seller || !buyer || seller === buyer || !args.buyerVatNumber) {
    return { reverseCharge: false, validation: null }
  }
  const validation = await validateVatNumber(buyer, args.buyerVatNumber)
  return { reverseCharge: validation.valid, validation }
}
