/**
 * Money rounding for the tax engine. Two axes the previous hardcoded
 * `round2` could not express:
 *
 *  - **Currency precision**: zero-decimal currencies (JPY, KRW, …) round to 0
 *    decimals; everything else to 2. (3-decimal dinars handled too.)
 *  - **Rounding mode**: `half-up` (commercial default) or `half-even`
 *    (banker's rounding — required by several tax authorities to avoid upward
 *    bias on large volumes).
 *
 * Rounding *level* (per-line vs per-order) is handled by the calc service, not
 * here — this only rounds a single value.
 */

export type RoundingMode = 'half-up' | 'half-even';

const ZERO_DECIMAL = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'XOF', 'XAF', 'BIF', 'PYG', 'RWF', 'UGX', 'XPF', 'GNF', 'KMF', 'DJF',
]);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function currencyDecimals(currency: string): number {
  const c = (currency || 'USD').toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
}

/** Round `value` to `dp` decimals using the given mode. */
export function roundTo(value: number, dp: number, mode: RoundingMode = 'half-up'): number {
  const factor = 10 ** dp;
  const scaled = value * factor;
  if (mode === 'half-even') {
    const floor = Math.floor(scaled);
    const diff = scaled - floor;
    // Use an epsilon so float noise doesn't misclassify exact .5 ties.
    let rounded: number;
    if (Math.abs(diff - 0.5) < 1e-9) {
      rounded = floor % 2 === 0 ? floor : floor + 1; // tie → nearest even
    } else {
      rounded = Math.round(scaled);
    }
    return rounded / factor;
  }
  // half-up (with epsilon to counter binary representation drift)
  return Math.round((scaled + Number.EPSILON)) / factor;
}

/** Round a monetary `value` for a currency + mode. */
export function roundMoney(value: number, currency: string, mode: RoundingMode = 'half-up'): number {
  return roundTo(value, currencyDecimals(currency), mode);
}
