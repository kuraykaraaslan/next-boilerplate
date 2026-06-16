import axios from 'axios';

/**
 * OIDC discovery (`/.well-known/openid-configuration`). Lets a provider configure
 * just an `issuer` and have the authorize/token/userinfo/jwks endpoints resolved
 * automatically — fewer hand-copied URLs, and the jwks_uri needed for id_token
 * verification comes for free. Cached per issuer with a TTL.
 */
export interface OidcDiscoveryDoc {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  end_session_endpoint?: string;
}

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
const HTTP_TIMEOUT_MS = 10_000;
const cache = new Map<string, { doc: OidcDiscoveryDoc; expiresAt: number }>();
const inflight = new Map<string, Promise<OidcDiscoveryDoc>>();

export async function discover(issuer: string): Promise<OidcDiscoveryDoc> {
  const hit = cache.get(issuer);
  if (hit && hit.expiresAt > Date.now()) return hit.doc;
  const existing = inflight.get(issuer);
  if (existing) return existing;

  const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const p = (async () => {
    const res = await axios.get<OidcDiscoveryDoc>(url, { timeout: HTTP_TIMEOUT_MS });
    const doc = res.data;
    cache.set(issuer, { doc, expiresAt: Date.now() + DISCOVERY_TTL_MS });
    return doc;
  })().finally(() => inflight.delete(issuer));
  inflight.set(issuer, p);
  return p;
}

/** Test helper: clear the discovery cache. */
export function _clearDiscoveryCache(): void {
  cache.clear();
  inflight.clear();
}
