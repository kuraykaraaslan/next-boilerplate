/**
 * Locale- and currency-aware money formatting for payment surfaces. Uses the
 * platform's `Intl` so amounts render with the right symbol, grouping, decimal
 * separator, and minor-unit count (TRY/USD → 2, JPY → 0, etc.) per locale.
 *
 * Amounts are accepted in MAJOR units (e.g. 12.50 = 12 lira 50 kuruş). Use
 * `minorToMajor` when your store keeps integer minor units.
 */

/** Currencies with zero minor units (no decimals). */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'XOF', 'XAF']);

export function currencyMinorUnits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/** Convert integer minor units to a major-unit number for formatting. */
export function minorToMajor(amountMinor: number, currency: string): number {
  const dp = currencyMinorUnits(currency);
  return amountMinor / 10 ** dp;
}

/**
 * Format a major-unit amount for display. Falls back gracefully when the locale
 * or currency is unknown rather than throwing on a checkout page.
 */
export function formatAmount(amountMajor: number, currency: string, locale = 'en'): string {
  const cur = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(amountMajor);
  } catch {
    try {
      const dp = currencyMinorUnits(cur);
      return `${amountMajor.toFixed(dp)} ${cur}`;
    } catch {
      return `${amountMajor} ${cur}`;
    }
  }
}

/** Convenience: format an integer minor-unit amount directly. */
export function formatMinor(amountMinor: number, currency: string, locale = 'en'): string {
  return formatAmount(minorToMajor(amountMinor, currency), currency, locale);
}
