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

/** True for loopback / unspecified / ULA / link-local IPv6 (and mapped v4). */
function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) — judge by the embedded v4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isBlockedIpv4(mapped[1]);
  if (lower === '::1' || lower === '::') return true;
  const head = lower.split(':')[0];
  if (!head) return false;
  const prefix = parseInt(head, 16);
  if (Number.isNaN(prefix)) return false;
  // fc00::/7 (unique-local) — first byte 0xfc/0xfd → head 0xfc..0xfd
  if (prefix >= 0xfc00 && prefix <= 0xfdff) return true;
  // fe80::/10 (link-local) → head 0xfe80..0xfebf
  if (prefix >= 0xfe80 && prefix <= 0xfebf) return true;
  return false;
}

export function isBlockedIp(ip: string): boolean {
  return ip.includes(':') ? isBlockedIpv6(ip) : isBlockedIpv4(ip);
}

/** Match an IP against an allowlist entry — exact IP or IPv4 CIDR (`a.b.c.d/n`). */
function matchesAllowEntry(ip: string, entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;
  if (trimmed.includes('/')) {
    const [base, bitsRaw] = trimmed.split('/');
    const bits = Number(bitsRaw);
    const ipInt = ipv4ToInt(ip);
    if (ipInt !== null && Number.isInteger(bits) && bits >= 0 && bits <= 32) {
      return inV4Range(ipInt, base, bits);
    }
    return false;
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
