import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '@/modules/env';
import { discover } from './auth_oidc.discovery';
import type { OidcEngineConfig, OidcTokens } from './auth_oidc.engine.types';

/** Resolve missing endpoints / jwks_uri from the issuer's discovery document. */
export async function ensureEndpoints(c: OidcEngineConfig): Promise<void> {
  if (!c.issuer) return;
  if (c.authUrl && c.tokenUrl && c.jwksUri) return;
  try {
    const doc = await discover(c.issuer);
    c.authUrl ??= doc.authorization_endpoint;
    c.tokenUrl ??= doc.token_endpoint;
    c.userInfoUrl ??= doc.userinfo_endpoint;
    c.jwksUri ??= doc.jwks_uri;
  } catch {
    // Discovery failure is non-fatal when endpoints were supplied explicitly.
  }
}

export function normalizeOidcTokens(data: Record<string, unknown>): OidcTokens {
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? null,
    idToken: (data.id_token as string | undefined) ?? null,
    tokenType: (data.token_type as string | undefined) ?? null,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : null,
    scope: (data.scope as string | undefined) ?? null,
    raw: data,
  };
}

export function basicAuthHeader(c: OidcEngineConfig): string {
  return `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`, 'utf8').toString('base64')}`;
}

export function buildClientAssertion(c: OidcEngineConfig): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: c.clientId, sub: c.clientId, aud: c.tokenUrl, jti: crypto.randomBytes(16).toString('hex'), iat: now, exp: now + 300 },
    c.privateKeyJwt as string,
    { algorithm: 'RS256' },
  );
}

export function pkceVerifier(pkceSalt: string, state: string): string {
  if (!state) throw new Error('PKCE verifier requires a non-empty state');
  return crypto.createHmac('sha256', env.CSRF_SECRET).update(`${pkceSalt}:${state}`).digest('base64url');
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
