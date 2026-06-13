import { lookup } from 'node:dns/promises';

/**
 * SSRF protection for outbound webhook deliveries.
 *
 * Webhook URLs are user-controlled, so a delivery is a server-side request to an
 * arbitrary host — a classic SSRF vector (e.g. pointing at `169.254.169.254` to
 * read cloud metadata, or `127.0.0.1`/internal ranges). We resolve the URL host
 * and reject private / loopback / link-local / metadata addresses, unless the
 * webhook carries an explicit `ipAllowlist` (operator override). Validate at
 * BOTH create/update time and delivery time (DNS rebinding defence).
 */

export class WebhookSsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSsrfError';
  }
}

/** Parse an IPv4 string to a 32-bit unsigned int, or null if not IPv4. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function inV4Range(ipInt: number, base: string, maskBits: number): boolean {
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** True for private / loopback / link-local / CGNAT / reserved IPv4. */
function isBlockedIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  return (
    inV4Range(ipInt, '0.0.0.0', 8) ||        // "this" network
    inV4Range(ipInt, '10.0.0.0', 8) ||       // private
    inV4Range(ipInt, '100.64.0.0', 10) ||    // CGNAT
    inV4Range(ipInt, '127.0.0.0', 8) ||      // loopback
    inV4Range(ipInt, '169.254.0.0', 16) ||   // link-local (incl. 169.254.169.254 metadata)
    inV4Range(ipInt, '172.16.0.0', 12) ||    // private
    inV4Range(ipInt, '192.168.0.0', 16) ||   // private
    inV4Range(ipInt, '198.18.0.0', 15) ||    // benchmarking
    ipInt === 0xffffffff                      // broadcast
  );
}

/**
 * Parse any IPv6 form (incl. `::` compression, embedded IPv4, zone id) to a
 * 128-bit BigInt, or null when not valid IPv6. Enables correct ULA/link-local
 * detection and IPv6 CIDR allowlist matching (not just fragile string compare).
 */
function ipv6ToBigInt(ip: string): bigint | null {
  let s = ip.toLowerCase().trim();
  const zone = s.indexOf('%');
  if (zone !== -1) s = s.slice(0, zone);
  // Embedded IPv4 tail (::ffff:1.2.3.4, ::1.2.3.4) → rewrite as two hex groups.
  const v4m = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
  if (v4m) {
    const v4 = ipv4ToInt(v4m[1]);
    if (v4 === null) return null;
    const hex = v4.toString(16).padStart(8, '0');
    s = s.slice(0, v4m.index) + hex.slice(0, 4) + ':' + hex.slice(4);
  }
  if (!s.includes(':')) return null;
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
  let groups: string[];
  if (tail === null) {
    groups = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill('0'), ...tail];
  }
  if (groups.length !== 8) return null;
  const SIXTEEN = BigInt(16);
  let val = BigInt(0);
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    val = (val << SIXTEEN) + BigInt(parseInt(g, 16));
  }
  return val;
}

function inV6Range(ipBig: bigint, base: string, maskBits: number): boolean {
  const baseBig = ipv6ToBigInt(base);
  if (baseBig === null || maskBits < 0 || maskBits > 128) return false;
  const ONE = BigInt(1);
  const full = (ONE << BigInt(128)) - ONE;
  const mask = maskBits === 0 ? BigInt(0) : full ^ ((ONE << BigInt(128 - maskBits)) - ONE);
  return (ipBig & mask) === (baseBig & mask);
}

/** True for loopback / unspecified / ULA / link-local IPv6 (and mapped/NAT64 v4). */
function isBlockedIpv6(ip: string): boolean {
  const big = ipv6ToBigInt(ip);
  if (big === null) return false;
  if (big === BigInt(0) || big === BigInt(1)) return true;         // ::, ::1
  // IPv4-mapped (::ffff:0:0/96) and NAT64 (64:ff9b::/96) — judge embedded v4.
  if (inV6Range(big, '::ffff:0:0', 96) || inV6Range(big, '64:ff9b::', 96)) {
    const v4 = Number(big & BigInt(0xffffffff)) >>> 0;
    const v4Str = [(v4 >>> 24) & 255, (v4 >>> 16) & 255, (v4 >>> 8) & 255, v4 & 255].join('.');
    return isBlockedIpv4(v4Str);
  }
  return (
    inV6Range(big, 'fc00::', 7) ||    // unique-local
    inV6Range(big, 'fe80::', 10) ||   // link-local
    inV6Range(big, '::', 96)          // IPv4-compatible (deprecated) / very low space
  );
}

export function isBlockedIp(ip: string): boolean {
  return ip.includes(':') ? isBlockedIpv6(ip) : isBlockedIpv4(ip);
}

/** Match an IP against an allowlist entry — exact IP or CIDR, IPv4 AND IPv6. */
function matchesAllowEntry(ip: string, entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;
  if (trimmed.includes('/')) {
    const [base, bitsRaw] = trimmed.split('/');
    const bits = Number(bitsRaw);
    if (!Number.isInteger(bits)) return false;
    if (base.includes(':') || ip.includes(':')) {
      const ipBig = ipv6ToBigInt(ip);
      return ipBig !== null && inV6Range(ipBig, base, bits);
    }
    const ipInt = ipv4ToInt(ip);
    if (ipInt !== null && bits >= 0 && bits <= 32) return inV4Range(ipInt, base, bits);
    return false;
  }
  // Exact match — normalise IPv6 via BigInt so `::1` == `0:0:0:0:0:0:0:1`.
  if (trimmed.includes(':') || ip.includes(':')) {
    const a = ipv6ToBigInt(ip);
    const b = ipv6ToBigInt(trimmed);
    return a !== null && b !== null && a === b;
  }
  return ip === trimmed;
}

/**
 * Synchronous, no-DNS pre-check for create/update time. Blocks obvious targets
 * (localhost, `.local`, and private/reserved IP literals) so admins get instant
 * feedback. The authoritative, DNS-rebinding-resistant check is the async
 * {@link assertSafeWebhookUrl} run at delivery time. An explicit `ipAllowlist`
 * is the escape hatch for intentionally targeting an internal address.
 */
export function assertSafeWebhookUrlSync(url: string, ipAllowlist?: string[] | null): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new WebhookSsrfError('Webhook URL is not a valid URL.');
  }

  const lowerHost = host.toLowerCase();
  if (lowerHost === 'localhost' || lowerHost.endsWith('.localhost') || lowerHost.endsWith('.local')) {
    throw new WebhookSsrfError('Webhook URL must not target localhost. Add an explicit IP allowlist to override.');
  }

  // IPv6 literals in URLs are bracketed: http://[::1]/
  const ipLiteral = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  const isIpLiteral = ipv4ToInt(ipLiteral) !== null || ipLiteral.includes(':');
  if (!isIpLiteral) return; // a domain — can't judge without DNS; delivery-time check handles it

  const allow = (ipAllowlist ?? []).filter(Boolean);
  if (allow.length > 0) {
    if (!allow.some((entry) => matchesAllowEntry(ipLiteral, entry))) {
      throw new WebhookSsrfError(`Webhook IP ${ipLiteral} is not in the configured allowlist.`);
    }
  } else if (isBlockedIp(ipLiteral)) {
    throw new WebhookSsrfError(`Webhook URL targets a private or reserved address (${ipLiteral}).`);
  }
}

/**
 * Resolve the URL host and assert it is safe to deliver to. Throws
 * {@link WebhookSsrfError} on a blocked address (or, with an allowlist, on any
 * address outside it). DNS failures also throw so we never deliver blind.
 */
export async function assertSafeWebhookUrl(url: string, ipAllowlist?: string[] | null): Promise<void> {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new WebhookSsrfError('Webhook URL is not a valid URL.');
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new WebhookSsrfError(`Could not resolve webhook host "${host}".`);
  }
  if (addresses.length === 0) {
    throw new WebhookSsrfError(`Webhook host "${host}" did not resolve to any address.`);
  }

  const allow = (ipAllowlist ?? []).filter(Boolean);
  for (const { address } of addresses) {
    if (allow.length > 0) {
      // Strict allowlist: every resolved address must be explicitly permitted.
      if (!allow.some((entry) => matchesAllowEntry(address, entry))) {
        throw new WebhookSsrfError(`Webhook host resolves to ${address}, which is not in the configured IP allowlist.`);
      }
    } else if (isBlockedIp(address)) {
      throw new WebhookSsrfError(`Webhook host resolves to a private or reserved address (${address}).`);
    }
  }
}
