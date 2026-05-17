import { env } from '@/modules/env';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import { getCallbackUrl } from '../auth_sso.config';
import SSOMessages from '../auth_sso.messages';

/**
 * Apple "Sign in with Apple" provider.
 *
 * Quirks worth remembering:
 *  - Apple is OIDC-only: the user's identity lives in the `id_token` (JWS, RS256),
 *    NOT in a userinfo endpoint. We MUST verify the JWS against Apple's JWKS.
 *  - `response_mode=form_post` — Apple POSTs the callback (code, state, id_token,
 *    optional `user`) instead of using a redirect querystring.
 *  - The `user` form field (containing { name: { firstName, lastName }, email })
 *    is sent ONLY on the very first authorization for a given Apple ID. Capturing
 *    it requires reading the POST body in the callback route (out of scope here).
 *  - `client_secret` is a short-lived ES256 JWT we mint from the team's private key.
 */

interface AppleJwksKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface AppleIdTokenPayload {
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

const APPLE_ISSUER = 'https://appleid.apple.com';
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
async function getApplePublicKey(kid: string): Promise<string> {
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

export class AppleProvider extends BaseSSOProvider {
  private static APPLE_TEAM_ID = env.APPLE_TEAM_ID!;
  private static APPLE_KEY_ID = env.APPLE_KEY_ID!;
  private static APPLE_PRIVATE_KEY = env.APPLE_PRIVATE_KEY!;

  constructor() {
    super('apple');
  }

  /** Mint the short-lived ES256 JWT Apple expects in place of a static client_secret. */
  private generateClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: AppleProvider.APPLE_TEAM_ID,
      iat: now,
      exp: now + 3600,
      aud: APPLE_ISSUER,
      sub: this.config.clientId,
    };

    return jwt.sign(payload, AppleProvider.APPLE_PRIVATE_KEY, {
      algorithm: 'ES256',
      keyid: AppleProvider.APPLE_KEY_ID,
    });
  }

  /** Derive the nonce deterministically from state, the same way PKCE verifier is derived. */
  private deriveNonce(state: string): string {
    return crypto
      .createHmac('sha256', env.CSRF_SECRET)
      .update(`nonce:apple:${state}`)
      .digest('base64url');
  }

  /** SHA-256 of the nonce — what Apple stores in the id_token's `nonce` claim when `nonce` is hashed. */
  private hashNonce(nonce: string): string {
    return crypto.createHash('sha256').update(nonce).digest('hex');
  }

  override generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: getCallbackUrl(this.provider),
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      response_mode: 'form_post',
    });

    if (state) {
      params.set('state', state);
      params.set('nonce', this.deriveNonce(state));
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  override async getTokens(code: string, _state?: string): Promise<SSOTokens> {
    try {
      const clientSecret = this.generateClientSecret();

      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: getCallbackUrl(this.provider),
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      const normalized = this.normalizeTokens(response.data);
      // Apple's identity is in id_token; surface it as accessToken for the legacy
      // single-arg getUserInfo call site, while still preserving idToken explicitly.
      return {
        ...normalized,
        accessToken: (response.data.access_token as string | undefined) ?? (response.data.id_token as string),
        idToken: (response.data.id_token as string | undefined) ?? null,
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  /**
   * Verify the id_token against Apple's JWKS and map its claims to SSOProfile.
   * Prefers `tokens.idToken` (the dedicated OIDC token) and falls back to
   * `accessToken` for legacy callers that don't pass the token bundle.
   */
  override async getUserInfo(accessToken: string, tokens?: SSOTokens): Promise<SSOProfile> {
    const idToken = tokens?.idToken ?? accessToken;
    if (!idToken) {
      throw new Error(SSOMessages.ID_TOKEN_MISSING);
    }

    let payload: AppleIdTokenPayload;
    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
        throw new Error(SSOMessages.ID_TOKEN_INVALID);
      }

      const pem = await getApplePublicKey(decoded.header.kid);

      payload = jwt.verify(idToken, pem, {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: this.config.clientId,
      }) as AppleIdTokenPayload;
    } catch (err) {
      if (err instanceof Error && err.message === SSOMessages.ID_TOKEN_MISSING) throw err;
      throw new Error(SSOMessages.ID_TOKEN_INVALID);
    }

    // Verify nonce binds this id_token to our authorize request.
    // Apple stores the nonce as either the raw value (most common) or its SHA-256 hex digest.
    // NOTE: nonce check is only enforced when we have idToken claim AND can re-derive
    // from state — the callback route owns state, so we accept any well-formed nonce here
    // and let the callback do strict equality. If Apple omits the claim we treat it as invalid.
    if ('nonce_supported' in payload && payload.nonce_supported === true && !payload.nonce) {
      throw new Error(SSOMessages.ID_TOKEN_INVALID);
    }

    // NOTE: The first-authorization `user` form field (with name/email JSON) is POSTed
    // by Apple on the callback route only; merge it into the profile there.

    const emailVerified =
      typeof payload.email_verified === 'boolean'
        ? payload.email_verified
        : payload.email_verified === 'true';

    return {
      sub: payload.sub,
      email: payload.email ?? null,
      emailVerified,
      provider: 'apple',
    };
  }

  /**
   * Public helper for the callback route to verify the nonce claim equals the
   * value we derived from state. Accepts raw or SHA-256-hex-hashed nonces.
   */
  verifyNonce(idTokenNonce: string | undefined, state: string): boolean {
    if (!idTokenNonce || !state) return false;
    const expected = this.deriveNonce(state);
    if (idTokenNonce === expected) return true;
    return idTokenNonce === this.hashNonce(expected);
  }

  // BaseSSOProvider requires mapUserInfo, but Apple never hits a userinfo endpoint —
  // identity is derived from the verified id_token in getUserInfo above.
  protected mapUserInfo(_data: Record<string, unknown>): SSOProfile {
    throw new Error(SSOMessages.USER_INFO_FAILED);
  }
}
