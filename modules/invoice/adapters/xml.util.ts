/** Shared serialisation helpers for the e-invoice document builders. */

export const xmlEscape = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const money = (n: number, dp = 2): string => (Math.round((n ?? 0) * 10 ** dp) / 10 ** dp).toFixed(dp);
export const qty = (n: number): string => String(n ?? 0);
export const pct = (rateDecimal: number): string => money(Math.round((rateDecimal ?? 0) * 10000) / 100);

export const isoDate = (d: Date | string | undefined): string => {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
};

/** `YYYYMMDD` — used by CII (format="102") and several gateways. */
export const compactDate = (d: Date | string | undefined): string => isoDate(d).replace(/-/g, '');

export interface ParsedAddress {
  line: string;
  city: string;
  postal: string;
  region: string;
}

/** Normalise a free-form address JSON object into common parts. */
export function readAddress(addr: unknown): ParsedAddress {
  const a = (addr ?? {}) as Record<string, unknown>;
  return {
    line: String(a.line1 ?? a.addressLine1 ?? a.street ?? a.line ?? ''),
    city: String(a.city ?? a.town ?? ''),
    postal: String(a.postalCode ?? a.postal_code ?? a.zip ?? ''),
    region: String(a.region ?? a.state ?? a.province ?? ''),
  };
}
