import { z } from 'zod'

export const ReturnTypeEnum = z.enum(['RETURN', 'EXCHANGE', 'REFUND'])
export type ReturnType = z.infer<typeof ReturnTypeEnum>

export const ReturnStatusEnum = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'REFUNDED',
  'COMPLETED',
  'CANCELLED',
])
export type ReturnStatus = z.infer<typeof ReturnStatusEnum>

export const ReturnItemConditionEnum = z.enum([
  'UNOPENED',
  'USED',
  'DAMAGED',
  'DEFECTIVE',
  'OTHER',
])
export type ReturnItemCondition = z.infer<typeof ReturnItemConditionEnum>

// Canonical, machine-stable return reason codes (store the code; render the
// localized label). Free-text `reason` stays available for "OTHER".
export const ReturnReasonCodeEnum = z.enum([
  'DEFECTIVE',
  'WRONG_ITEM',
  'NOT_AS_DESCRIBED',
  'DAMAGED_IN_TRANSIT',
  'NO_LONGER_NEEDED',
  'BETTER_PRICE',
  'SIZE_FIT',
  'ARRIVED_LATE',
  'OTHER',
])
export type ReturnReasonCode = z.infer<typeof ReturnReasonCodeEnum>

const REASON_LABELS: Record<string, { en: string; tr: string }> = {
  DEFECTIVE:          { en: 'Defective / not working', tr: 'Arızalı / çalışmıyor' },
  WRONG_ITEM:         { en: 'Wrong item received', tr: 'Yanlış ürün geldi' },
  NOT_AS_DESCRIBED:   { en: 'Not as described', tr: 'Açıklamadaki gibi değil' },
  DAMAGED_IN_TRANSIT: { en: 'Damaged in transit', tr: 'Kargoda hasar gördü' },
  NO_LONGER_NEEDED:   { en: 'No longer needed', tr: 'Artık ihtiyaç yok' },
  BETTER_PRICE:       { en: 'Found a better price', tr: 'Daha uygun fiyat buldum' },
  SIZE_FIT:           { en: 'Size / fit issue', tr: 'Beden / uyum sorunu' },
  ARRIVED_LATE:       { en: 'Arrived too late', tr: 'Çok geç geldi' },
  OTHER:              { en: 'Other', tr: 'Diğer' },
}

/** Localized label for a reason code (falls back to the raw code). */
export function returnReasonLabel(code: string, locale = 'en'): string {
  const entry = REASON_LABELS[code]
  if (!entry) return code
  return locale.toLowerCase().startsWith('tr') ? entry.tr : entry.en
}
