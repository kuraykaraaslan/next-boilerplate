import crypto from 'crypto';
import axios from 'axios';

/**
 * Minimal JWKS client — fetches an issuer's signing keys, converts each JWK to a
 * PEM via Node's native `crypto.createPublicKey({ format: 'jwk' })` (no external
 * dependency), and caches by `jwksUri#kid` with a short TTL + single-flight
 * refresh. Supports RSA and EC keys (RS256/PS256/ES256).
 */
interface Jwk {
  kid?: string; kty: string; alg?: string; use?: string;
  n?: string; e?: string; x?: string; y?: string; crv?: string;
}

const JWKS_TTL_MS = 10 * 60 * 1000;
const HTTP_TIMEOUT_MS = 10_000;
const cache = new Map<string, { pem: string; expiresAt: number }>();
const inflight = new Map<string, Promise<void>>();

function jwkToPem(jwk: Jwk): string {
  const key = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
  return key.export({ type: 'spki', format: 'pem' }) as string;
}

async function refresh(jwksUri: string): Promise<void> {
  const existing = inflight.get(jwksUri);
  if (existing) return existing;
  const p = (async () => {
    const res = await axios.get<{ keys: Jwk[] }>(jwksUri, { timeout: HTTP_TIMEOUT_MS });
    const keys = res.data?.keys ?? [];
    const expiresAt = Date.now() + JWKS_TTL_MS;
    for (const jwk of keys) {
      if (!jwk.kid) continue;
      try { cache.set(`${jwksUri}#${jwk.kid}`, { pem: jwkToPem(jwk), expiresAt }); } catch { /* skip unusable key */ }
    }
  })().finally(() => inflight.delete(jwksUri));
  inflight.set(jwksUri, p);
  return p;
}

/** Resolve the signing PEM for a `kid`, refreshing the JWKS on cache miss/expiry. */
export async function getSigningPem(jwksUri: string, kid: string): Promise<string | null> {
  const key = `${jwksUri}#${kid}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.pem;
  await refresh(jwksUri);
  return cache.get(key)?.pem ?? null;
}

/** Test helper: clear the JWKS cache. */
export function _clearJwksCache(): void {
  cache.clear();
  inflight.clear();
}
