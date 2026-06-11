import { z } from 'zod';
import { AppError, ErrorCode } from './app-error';
import { CurrencyCodeEnum, type CurrencyCode } from './common.currency';
import { DEFAULT_LOCALE, type LocaleCode } from './common.locale';

/**
 * Money value object: an amount paired with its ISO 4217 currency, so the two
 * never drift apart in arithmetic. Arithmetic across mismatched currencies is a
 * `CURRENCY_MISMATCH` error rather than a silent wrong total. Formatting defers
 * to `Intl.NumberFormat`, which knows each currency's minor units (JPY 0, KWD 3).
 *
 * Dependency-free: depends only on sibling `common` primitives.
 */
export const MoneySchema = z.object({
  amount: z.number(),
  currency: CurrencyCodeEnum,
});

export type Money = z.infer<typeof MoneySchema>;

/** Construct a `Money`. */
export function money(amount: number, currency: CurrencyCode): Money {
  return { amount, currency };
}

/** Locale-aware currency string, e.g. `$1,234.50`, `￥1,235`, `₺1.234,50`. */
export function formatMoney(m: Money, locale?: LocaleCode | string): string {
  return new Intl.NumberFormat(locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency: m.currency,
  }).format(m.amount);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new AppError(
      `Cannot operate on mismatched currencies: ${a.currency} vs ${b.currency}`,
      422,
      ErrorCode.CURRENCY_MISMATCH,
    );
  }
}

/** Add two same-currency amounts; throws `CURRENCY_MISMATCH` (422) otherwise. */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

/** Subtract `b` from `a` (same currency); throws `CURRENCY_MISMATCH` (422) otherwise. */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/** Scale an amount by a unitless factor, preserving the currency. */
export function multiplyMoney(m: Money, factor: number): Money {
  return { amount: m.amount * factor, currency: m.currency };
}
