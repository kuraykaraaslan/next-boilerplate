import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '@/modules/env';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import OidcMessages from './auth_oidc.messages';

/**
 * Generic, config-driven OAuth2 / OIDC engine — the single home for the OAuth
 * protocol mechanics (authorize → token → userinfo, PKCE, refresh, `private_key_jwt`
 * and Basic confidential-client auth). NO coupling to any provider catalog.
 *
 * Consumers (the social SSO catalog `auth_sso`, the government catalog `auth_acs`,
 * and any custom/BYO OIDC IdP) subclass `BaseOidcProvider`, pass a plain
 * `OidcEngineConfig`, and map the raw token bundle / claims into their own profile.
 * OAuth2-only providers (GitHub, Facebook, …) are supported too — `id_token` is
 * simply absent.
 */
export interface OidcEngineConfig {
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  /** PEM private key for `private_key_jwt` client authentication (e.g. Login.gov). */
  privateKeyJwt?: string;
  redirectUri: string;
  scopes: string[];
  usesPkce?: boolean;
  /** Send credentials as HTTP Basic instead of in the token body (confidential clients). */
  useBasicAuth?: boolean;
  /** Salt that namespaces the deterministic PKCE verifier derived from `state`. */
  pkceSalt: string;
}

export interface OidcTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  scope: string | null;
  raw: Record<string, unknown>;
}

export interface OidcAuthUrlOptions {
  uiLocales?: string;
  loginHint?: string;
  extraParams?: Record<string, string>;
}

export abstract class BaseOidcProvider {
  protected constructor(protected oidcConfig: OidcEngineConfig) {}

  /** Build the authorize redirect URL (with PKCE + optional locale/hint params). */
  generateAuthUrl(state: string, options?: OidcAuthUrlOptions): string {
    const c = this.oidcConfig;
    const params = new URLSearchParams({
      client_id: c.clientId ?? '',
      redirect_uri: c.redirectUri,
      response_type: 'code',
      scope: (c.scopes ?? ['openid']).join(' '),
      state,
    });
    if (options?.uiLocales) params.set('ui_locales', options.uiLocales);
    if (options?.loginHint) params.set('login_hint', options.loginHint);
    for (const [k, v] of Object.entries(options?.extraParams ?? {})) params.set(k, v);
    if (c.usesPkce) {
      params.set('code_challenge', this.pkceChallenge(this.pkceVerifier(state)));
      params.set('code_challenge_method', 'S256');
    }
    return `${c.authUrl}?${params.toString()}`;
  }

  /** Exchange an authorization code for a normalized token bundle. */
  protected async requestToken(code: string, state?: string): Promise<OidcTokens> {
    const c = this.oidcConfig;
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.redirectUri,
      client_id: c.clientId ?? '',
    };
    if (c.usesPkce && state) body.code_verifier = this.pkceVerifier(state);
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    if (c.privateKeyJwt) {
      body.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
      body.client_assertion = this.buildClientAssertion();
    } else if (c.useBasicAuth) {
      headers.Authorization = this.basicAuthHeader();
    } else if (c.clientSecret) {
      body.client_secret = c.clientSecret;
    }
    try {
      const res = await axios.post(c.tokenUrl as string, new URLSearchParams(body), { headers });
      return this.normalizeOidcTokens(res.data as Record<string, unknown>);
    } catch {
      throw new AppError(OidcMessages.TOKEN_EXCHANGE_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** Fetch the userinfo document with a bearer access token. */
  protected async requestUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const c = this.oidcConfig;
    if (!c.userInfoUrl) throw new AppError(OidcMessages.USER_INFO_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    try {
      const res = await axios.get(c.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      return res.data as Record<string, unknown>;
    } catch {
      throw new AppError(OidcMessages.USER_INFO_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** Standard OAuth refresh-token grant. Returns null when refresh is impossible. */
  protected async refresh(refreshToken: string): Promise<OidcTokens | null> {
    const c = this.oidcConfig;
    if (!refreshToken) return null;
    const body: Record<string, string> = {
      grant_type: 'refresh_token', refresh_token: refreshToken, client_id: c.clientId ?? '',
    };
    if (c.clientSecret) body.client_secret = c.clientSecret;
    try {
      const res = await axios.post(c.tokenUrl as string, new URLSearchParams(body), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      });
      return this.normalizeOidcTokens(res.data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  /** Convenience: code → tokens → claims (userinfo, falling back to id_token). */
  protected async getClaims(code: string, state?: string): Promise<Record<string, unknown>> {
    const tokens = await this.requestToken(code, state);
    if (this.oidcConfig.userInfoUrl) return this.requestUserInfo(tokens.accessToken);
    if (tokens.idToken) {
      const decoded = jwt.decode(tokens.idToken);
      if (decoded && typeof decoded === 'object') return decoded as Record<string, unknown>;
    }
    throw new AppError(OidcMessages.USER_INFO_FAILED, 502, ErrorCode.INTERNAL_ERROR);
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  protected normalizeOidcTokens(data: Record<string, unknown>): OidcTokens {
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

  protected basicAuthHeader(): string {
    const c = this.oidcConfig;
    return `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`, 'utf8').toString('base64')}`;
  }

  protected buildClientAssertion(): string {
    const c = this.oidcConfig;
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      { iss: c.clientId, sub: c.clientId, aud: c.tokenUrl, jti: crypto.randomBytes(16).toString('hex'), iat: now, exp: now + 300 },
      c.privateKeyJwt as string,
      { algorithm: 'RS256' },
    );
  }

  protected pkceVerifier(state: string): string {
    if (!state) throw new Error('PKCE verifier requires a non-empty state');
    return crypto.createHmac('sha256', env.CSRF_SECRET).update(`${this.oidcConfig.pkceSalt}:${state}`).digest('base64url');
  }
  protected pkceChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}
