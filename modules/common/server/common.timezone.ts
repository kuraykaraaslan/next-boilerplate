import { z } from 'zod';

/**
 * IANA timezone primitive. `TIMEZONES` is the runtime-supported zone list,
 * computed once from the Intl database, so scheduling/invoice/date-display
 * modules validate against exactly what this Node build supports.
 *
 * Dependency-free: relies only on the platform `Intl` API.
 */
export const TIMEZONES: string[] = Intl.supportedValuesOf('timeZone');

export const DEFAULT_TIMEZONE = 'UTC';

// `Intl.supportedValuesOf('timeZone')` omits the `UTC` alias in some runtimes;
// include the default explicitly so it always validates.
const TIMEZONE_SET: ReadonlySet<string> = new Set([...TIMEZONES, DEFAULT_TIMEZONE]);

/** Membership check against the supported IANA zones (case-sensitive). */
export function isTimezone(v: string): boolean {
  return TIMEZONE_SET.has(v);
}

export const TimezoneSchema = z.string().refine(isTimezone, 'Invalid IANA timezone');

export type Timezone = z.infer<typeof TimezoneSchema>;
