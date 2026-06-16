import SettingService from '@nb/setting/server/setting.service'
import { currencyMinorUnits } from '@nb/payment_core'

/**
 * Small, dependency-light payment helpers:
 *  - settlement currency resolution (wires the declared per-tenant setting),
 *  - zero-decimal-aware minor-unit conversion for provider APIs (Stripe et al.
 *    expect integer minor units; JPY has 0 decimals, KWD has 3),
 *  - provider error-code → localized, user-safe message mapping.
 */

/** Per-tenant settlement currency (`paymentSettlementCurrency`); fallback provided. */
export async function getSettlementCurrency(tenantId: string, fallback = 'USD'): Promise<string> {
  const raw = await SettingService.getValue(tenantId, 'paymentSettlementCurrency').catch(() => null)
  return (raw || fallback).toUpperCase()
}

/** Convert a major-unit amount to integer minor units for the currency. */
export function toMinorUnits(amountMajor: number, currency: string): number {
  return Math.round(amountMajor * 10 ** currencyMinorUnits(currency))
}

/** Convert integer minor units back to a major-unit amount. */
export function fromMinorUnits(amountMinor: number, currency: string): number {
  return amountMinor / 10 ** currencyMinorUnits(currency)
}

// Canonical provider error codes → safe, localized customer messages. Raw
// gateway codes/messages must never be surfaced verbatim (they leak internals
// and aren't localized).
const ERROR_MESSAGES: Record<string, { en: string; tr: string }> = {
  card_declined:       { en: 'Your card was declined.', tr: 'Kartınız reddedildi.' },
  insufficient_funds:  { en: 'Insufficient funds.', tr: 'Yetersiz bakiye.' },
  expired_card:        { en: 'Your card has expired.', tr: 'Kartınızın süresi dolmuş.' },
  incorrect_cvc:       { en: 'The security code is incorrect.', tr: 'Güvenlik kodu hatalı.' },
  processing_error:    { en: 'A processing error occurred. Please try again.', tr: 'İşlem hatası oluştu. Lütfen tekrar deneyin.' },
  authentication_required: { en: 'Additional authentication is required.', tr: 'Ek doğrulama gerekli.' },
  fraud_suspected:     { en: 'This transaction could not be completed.', tr: 'Bu işlem tamamlanamadı.' },
}

/** Map a provider error code to a localized, user-safe message. */
export function localizeProviderError(code: string | null | undefined, locale = 'en'): string {
  const entry = code ? ERROR_MESSAGES[code] : undefined
  const lang = locale.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  if (entry) return entry[lang]
  return lang === 'tr' ? 'Ödeme tamamlanamadı.' : 'The payment could not be completed.'
}
