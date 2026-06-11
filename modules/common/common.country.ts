import { z } from 'zod';
import { countries } from 'countries-list';

/**
 * Country primitives sourced from the `countries-list` package (ISO 3166-1
 * alpha-2). Single source of truth — no hand-maintained list; the Zod enum and
 * the display list are both derived from the library data so they cannot drift.
 */
type RawCountry = { name: string; native: string };

const COUNTRY_DATA = countries as unknown as Record<string, RawCountry>;
const COUNTRY_CODES = Object.keys(COUNTRY_DATA) as [string, ...string[]];

export const CountryCodeEnum = z.enum(COUNTRY_CODES);
export type CountryCode = z.infer<typeof CountryCodeEnum>;

export const COUNTRIES: { code: CountryCode; name: string; native: string }[] =
  Object.entries(COUNTRY_DATA).map(([code, c]) => ({
    code: code as CountryCode,
    name: c.name,
    native: c.native,
  }));

/** True if `v` is a known ISO 3166-1 alpha-2 country code. */
export function isCountryCode(v: string): v is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRY_DATA, v);
}
