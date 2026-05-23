/**
 * Turkish VAT (KDV) rates as of July 2023.
 *
 *   • Standard (general): 20 %
 *   • Reduced (basic foodstuffs, books, medicine, …): 10 %
 *   • Super-reduced (specific listed items): 1 %
 *   • Zero / exempt: 0 %
 *
 * The boilerplate ships only the standard / reduced / zero — operators
 * should override per line at issue time when a non-standard rate applies.
 */
export const TR_VAT_RATES = {
  STANDARD: 0.20,
  REDUCED: 0.10,
  SUPER_REDUCED: 0.01,
  ZERO: 0,
} as const;

export type TrVatRateKey = keyof typeof TR_VAT_RATES;

export function trVatRate(key: TrVatRateKey = 'STANDARD'): number {
  return TR_VAT_RATES[key];
}
