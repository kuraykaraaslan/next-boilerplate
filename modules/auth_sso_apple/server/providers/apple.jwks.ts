import axios from 'axios';
import crypto from 'crypto';
import SSOMessages from '@kuraykaraaslan/auth_sso/server/auth_sso.messages';

export interface AppleJwksKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

export interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  nonce?: string;
  nonce_supported?: boolean;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  auth_time?: number;
}

export const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedKey {
  pem: string;
  expiresAt: number;
}

/** Module-level JWKS cache keyed by `kid`. Shared across all AppleProvider instances. */
const jwksCache: Map<string, CachedKey> = new Map();
let jwksInFlight: Promise<void> | null = null;

/** Convert a JWK RSA public key into a PEM-encoded SPKI string. */
function jwkToPem(jwk: AppleJwksKey): string {
  const key = crypto.createPublicKey({
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });
  return key.export({ format: 'pem', type: 'spki' }) as string;
}

/** Fetch Apple's JWKS and refresh the cache. Coalesces concurrent calls. */
async function refreshJwks(): Promise<void> {
  if (jwksInFlight) {
    return jwksInFlight;
  }

  jwksInFlight = (async () => {
    try {
      const response = await axios.get<{ keys: AppleJwksKey[] }>(APPLE_JWKS_URL, {
        timeout: 5000,
        headers: { Accept: 'application/json' },
      });
      const now = Date.now();
      for (const key of response.data.keys ?? []) {
        if (key.kty !== 'RSA' || !key.kid || !key.n || !key.e) continue;
        jwksCache.set(key.kid, {
          pem: jwkToPem(key),
          expiresAt: now + JWKS_TTL_MS,
        });
      }
    } finally {
      jwksInFlight = null;
    }
  })();

  return jwksInFlight;
}

/** Resolve a PEM for `kid`, refreshing the JWKS once on miss or expiry. */
export async function getApplePublicKey(kid: string): Promise<string> {
  const cached = jwksCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.pem;
  }

  await refreshJwks();

  const fresh = jwksCache.get(kid);
  if (!fresh) {
    throw new Error(SSOMessages.ID_TOKEN_INVALID);
  }
  return fresh.pem;
}
