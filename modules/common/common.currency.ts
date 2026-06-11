import { z } from 'zod';
import { codes } from 'currency-codes-ts';

/**
 * ISO 4217 currency primitive, single-sourced from `currency-codes-ts` — the
 * same package `payment_core` already uses, so currency stays canonical across
 * payment, invoice and store modules. Dependency-free at runtime (npm data lib
 * only; no DB/env/next/react).
 */
const CURRENCY_CODES = codes() as [string, ...string[]];

export const CurrencyCodeEnum = z.enum(CURRENCY_CODES);

export type CurrencyCode = z.infer<typeof CurrencyCodeEnum>;

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

const CURRENCY_SET: ReadonlySet<string> = new Set(CURRENCY_CODES);

/** True if `v` is a valid ISO 4217 currency code (uppercase). */
export function isCurrencyCode(v: string): v is CurrencyCode {
  return CURRENCY_SET.has(v);
}
