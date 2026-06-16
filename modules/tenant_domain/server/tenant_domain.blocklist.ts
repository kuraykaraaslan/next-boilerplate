import { env } from '@nb/env';
import SettingService from '@nb/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';

/**
 * Reserved / blocked custom domains. A tenant must not be able to claim the
 * platform's own apex, localhost, or well-known public mail/SaaS domains — doing
 * so would let it hijack platform traffic or impersonate a major provider. The
 * operator can extend the list via the root-tenant `reservedDomains` setting
 * (comma-separated). Subdomains of the platform wildcard are handled separately
 * (they are the legitimate self-service path) and are NOT blocked here.
 */
const DEFAULT_RESERVED = [
  'localhost', 'localhost.localdomain', 'example.com', 'example.org', 'example.net',
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com',
  'amazonaws.com', 'cloudfront.net', 'vercel.app', 'herokuapp.com',
  'github.io', 'gov', 'mil',
];

let cache: { value: Set<string>; expiresAt: number } | null = null;

async function loadReserved(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  const set = new Set(DEFAULT_RESERVED);
  const apex = (env.TENANT_WILDCARD_DOMAIN || '').toLowerCase().trim();
  if (apex) set.add(apex);
  try {
    const raw = await SettingService.getValue(ROOT_TENANT_ID, 'reservedDomains');
    if (raw) raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean).forEach((d) => set.add(d));
  } catch { /* keep defaults */ }
  cache = { value: set, expiresAt: now + 60_000 };
  return set;
}

/**
 * True when `domain` is reserved: it equals, or is a subdomain of, any blocked
 * entry. The platform wildcard apex blocks the apex itself but `isSubdomain`
 * (legitimate self-service subdomains) is checked by the caller before this.
 */
export async function isReservedDomain(domain: string): Promise<boolean> {
  const d = domain.toLowerCase().trim().replace(/\.$/, '');
  const reserved = await loadReserved();
  if (reserved.has(d)) return true;
  for (const r of reserved) {
    if (d === r || d.endsWith(`.${r}`)) return true;
  }
  return false;
}
