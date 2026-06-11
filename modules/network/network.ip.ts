import type { IpVersion } from './network.enums';

// Subnet matching. Everything is modelled as a CIDR subnet: a single host is
// just a /32 (IPv4) or /128 (IPv6). IPv4 CIDR ranges are matched with real
// mask arithmetic; IPv6 is matched by exact (normalised) address for now —
// enough for the typical "pin to a NAT gateway address" case. Never throws on
// malformed input.

/** Structured, validated view of a subnet rule. */
export interface SubnetDescriptor {
  /** Canonical CIDR form, e.g. `192.168.1.182/32`. */
  subnet: string;
  /** Base address without the mask. */
  base: string;
  /** Prefix length. */
  bits: number;
  version: IpVersion;
}

/** Parse a dotted-quad IPv4 string into a uint32, or null if not IPv4. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    acc = (acc << 8) | n;
  }
  // `>>> 0` coerces back to an unsigned 32-bit integer.
  return acc >>> 0;
}

function matchesV4Cidr(ipInt: number, rangeInt: number, bits: number): boolean {
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** Normalise an IPv4-mapped IPv6 address (`::ffff:1.2.3.4`) to plain IPv4. */
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(trimmed);
  return m ? m[1] : trimmed;
}

/**
 * Parse a subnet rule into a {@link SubnetDescriptor}, or null when it is not a
 * recognisable address / CIDR block. A bare address is treated as a host route:
 * `/32` for IPv4, `/128` for IPv6.
 */
export function parseSubnet(value: string): SubnetDescriptor | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let base = trimmed;
  let bitsRaw: string | undefined;
  if (trimmed.includes('/')) {
    const slash = trimmed.indexOf('/');
    base = trimmed.slice(0, slash);
    bitsRaw = trimmed.slice(slash + 1);
  }

  const v4Base = normalizeIp(base);
  if (ipv4ToInt(v4Base) !== null) {
    const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null;
    return { subnet: `${v4Base}/${bits}`, base: v4Base, bits, version: 'v4' };
  }

  if (base.includes(':')) {
    const bits = bitsRaw === undefined ? 128 : Number(bitsRaw);
    if (!Number.isInteger(bits) || bits < 0 || bits > 128) return null;
    return { subnet: `${base}/${bits}`, base, bits, version: 'v6' };
  }

  return null;
}

/** Canonical CIDR form of a rule (bare IP → /32 or /128), or null if invalid. */
export function normalizeSubnet(value: string): string | null {
  return parseSubnet(value)?.subnet ?? null;
}

/** Whether `value` is a valid subnet / address. */
export function isValidSubnet(value: string): boolean {
  return parseSubnet(value) !== null;
}

/** Whether a single IP falls inside a single subnet. */
export function ipInSubnet(ip: string | null | undefined, subnet: string): boolean {
  if (!ip || ip === 'unknown') return false;
  const desc = parseSubnet(subnet);
  if (!desc) return false;

  const candidate = normalizeIp(ip);
  if (desc.version === 'v4') {
    const ipInt = ipv4ToInt(candidate);
    const baseInt = ipv4ToInt(desc.base);
    if (ipInt === null || baseInt === null) return false;
    return matchesV4Cidr(ipInt, baseInt, desc.bits);
  }
  // IPv6: exact (normalised) match only.
  return desc.base === candidate;
}

/**
 * Returns true when `ip` is permitted by `subnets`. An empty/undefined list
 * permits everything (no restriction). A non-empty list denies by default — the
 * IP must fall inside at least one subnet. An `unknown`/missing IP never matches
 * a non-empty list (fail closed).
 */
export function ipMatchesAllowlist(ip: string | null | undefined, subnets: string[] | null | undefined): boolean {
  const rules = (subnets ?? []).map((r) => r.trim()).filter(Boolean);
  if (rules.length === 0) return true;
  if (!ip || ip === 'unknown') return false;
  return rules.some((subnet) => ipInSubnet(ip, subnet));
}

/** Parse a comma/whitespace/newline-separated subnet list into rules. */
export function parseSubnetString(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
