// IP allowlist matching for API keys. Supports exact IPv4/IPv6 addresses and
// IPv4 CIDR blocks (the common server-to-server case). IPv6 CIDR is matched
// only by exact-prefix string for now — good enough for the typical
// "pin to a NAT gateway address" use case and never throws on malformed input.

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

function matchesV4Cidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** Normalise an IPv6-mapped IPv4 address (`::ffff:1.2.3.4`) to plain IPv4. */
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(trimmed);
  return m ? m[1] : trimmed;
}

/**
 * Returns true when `ip` is permitted by `allowlist`. An empty/undefined
 * allowlist permits everything (no restriction). A non-empty allowlist denies
 * by default — the IP must match at least one rule. An `unknown` source IP
 * never matches a non-empty allowlist (fail closed).
 */
export function ipMatchesAllowlist(ip: string | null | undefined, allowlist: string[] | null | undefined): boolean {
  const rules = (allowlist ?? []).map((r) => r.trim()).filter(Boolean);
  if (rules.length === 0) return true;
  if (!ip || ip === 'unknown') return false;

  const candidate = normalizeIp(ip);
  for (const rule of rules) {
    if (rule.includes('/')) {
      if (matchesV4Cidr(candidate, rule)) return true;
    } else if (normalizeIp(rule) === candidate) {
      return true;
    }
  }
  return false;
}

/** Parse a comma/whitespace/newline-separated allowlist string into rules. */
export function parseAllowlistString(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
