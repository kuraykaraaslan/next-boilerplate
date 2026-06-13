import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '@/modules/env';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import OidcMessages from './auth_oidc.messages';
import { discover } from './auth_oidc.discovery';
import { getSigningPem } from './auth_oidc.jwks';

/**
 * Generic, config-driven OAuth2 / OIDC engine — the single home for the OAuth
 * protocol mechanics (authorize → token → userinfo, PKCE, refresh, `private_key_jwt`
 * and Basic confidential-client auth) PLUS OIDC security: `.well-known` discovery,
 * JWKS-verified `id_token` signatures, and `iss`/`aud`/`exp`/`nonce` validation.
 * NO coupling to any provider catalog.
 *
 * Consumers (social SSO `auth_sso`, government `auth_acs`, custom/BYO OIDC)
 * subclass `BaseOidcProvider` and map the raw token bundle / claims into their
 * own profile. OAuth2-only providers (GitHub, Facebook, …) work too — `id_token`
 * is simply absent and verification is skipped.
 */
export interface OidcEngineConfig {
  /** OIDC issuer; when set, missing endpoints + jwks_uri are auto-discovered. */
  issuer?: string;
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  jwksUri?: string;
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
  /** Leeway (seconds) for id_token exp/nbf. Default 60. */
  clockToleranceSec?: number;
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
  /** OIDC nonce — bound into the id_token and verified on callback (replay defence). */
  nonce?: string;
  extraParams?: Record<string, string>;
}

const HTTP_TIMEOUT_MS = 10_000;

export abstract class BaseOidcProvider {
  protected constructor(protected oidcConfig: OidcEngineConfig) {}

  /** Resolve missing endpoints / jwks_uri from the issuer's discovery document. */
  protected async ensureEndpoints(): Promise<void> {
    const c = this.oidcConfig;
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

  /** Build the authorize redirect URL (with PKCE + optional nonce/locale params).
   *  Returns synchronously here; subclasses may override async (e.g. to run discovery first). */
  generateAuthUrl(state: string, options?: OidcAuthUrlOptions): string | Promise<string> {
    const c = this.oidcConfig;
    const params = new URLSearchParams({
      client_id: c.clientId ?? '',
      redirect_uri: c.redirectUri,
      response_type: 'code',
      scope: (c.scopes ?? ['openid']).join(' '),
      state,
    });
    if (options?.nonce) params.set('nonce', options.nonce);
    if (options?.uiLocales) params.set('ui_locales', options.uiLocales);
    if (options?.loginHint) params.set('login_hint', options.loginHint);
    for (const [k, v] of Object.entries(options?.extraParams ?? {})) params.set(k, v);
    if (c.usesPkce) {
      params.set('code_challenge', this.pkceChallenge(this.pkceVerifier(state)));
      params.set('code_challenge_method', 'S256');
    }
    // Extension point: providers that must SIGN the authorize request (Russia ESIA,
    // Alipay) add their signature/timestamp params here. Default no-op.
    this.decorateAuthorizeParams(params, state);
    return `${c.authUrl}?${params.toString()}`;
  }

  /** Exchange an authorization code for a normalized token bundle. */
  protected async requestToken(code: string, state?: string): Promise<OidcTokens> {
    await this.ensureEndpoints();
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
    // Extension point: providers that must SIGN the token request (ESIA, Alipay)
    // add/replace signature fields here. Default no-op.
    await this.decorateTokenBody(body);
    try {
      const res = await axios.post(c.tokenUrl as string, new URLSearchParams(body), { headers, timeout: HTTP_TIMEOUT_MS });
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
      const res = await axios.get(c.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: HTTP_TIMEOUT_MS });
      return res.data as Record<string, unknown>;
    } catch {
      throw new AppError(OidcMessages.USER_INFO_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Verify an id_token's signature against the issuer JWKS and validate
   * iss/aud/exp (+ nonce when provided). Refuses unverifiable tokens — NEVER
   * trusts an unsigned/undecoded id_token.
   */
  protected async verifyIdToken(idToken: string, nonce?: string): Promise<Record<string, unknown>> {
    await this.ensureEndpoints();
    const c = this.oidcConfig;
    if (!c.jwksUri) throw new AppError(OidcMessages.ID_TOKEN_UNVERIFIABLE, 400, ErrorCode.VALIDATION_ERROR);

    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
      throw new AppError(OidcMessages.ID_TOKEN_INVALID, 400, ErrorCode.VALIDATION_ERROR);
    }
    const pem = await getSigningPem(c.jwksUri, decoded.header.kid);
    if (!pem) throw new AppError(OidcMessages.ID_TOKEN_INVALID, 400, ErrorCode.VALIDATION_ERROR);

    let claims: Record<string, unknown>;
    try {
      claims = jwt.verify(idToken, pem, {
        algorithms: ['RS256', 'RS384', 'RS512', 'PS256', 'ES256', 'ES384'],
        issuer: c.issuer,
        audience: c.clientId,
        clockTolerance: c.clockToleranceSec ?? 60,
      }) as Record<string, unknown>;
    } catch {
      throw new AppError(OidcMessages.ID_TOKEN_INVALID, 400, ErrorCode.VALIDATION_ERROR);
    }
    if (nonce && claims.nonce !== nonce) {
      throw new AppError(OidcMessages.NONCE_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
    }
    return claims;
  }

  /**
   * Run code → tokens → claims. The id_token (when present) is JWKS-verified and
   * its nonce checked; userinfo (when available) is merged and its `sub` is
   * cross-checked against the verified id_token to prevent token substitution.
   */
  protected async getClaims(code: string, state?: string, opts?: { nonce?: string }): Promise<Record<string, unknown>> {
    const tokens = await this.requestToken(code, state);
    const verified = tokens.idToken ? await this.verifyIdToken(tokens.idToken, opts?.nonce) : null;

    if (this.oidcConfig.userInfoUrl) {
      const userinfo = await this.requestUserInfo(tokens.accessToken);
      if (verified && verified.sub && userinfo.sub && verified.sub !== userinfo.sub) {
        throw new AppError(OidcMessages.SUBJECT_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
      }
      return { ...(verified ?? {}), ...userinfo };
    }
    if (verified) return verified;
    throw new AppError(OidcMessages.USER_INFO_FAILED, 502, ErrorCode.INTERNAL_ERROR);
  }

  /** Standard OAuth refresh-token grant. Returns null when refresh is impossible. */
  protected async refresh(refreshToken: string): Promise<OidcTokens | null> {
    await this.ensureEndpoints();
    const c = this.oidcConfig;
    if (!refreshToken) return null;
    const body: Record<string, string> = {
      grant_type: 'refresh_token', refresh_token: refreshToken, client_id: c.clientId ?? '',
    };
    if (c.clientSecret) body.client_secret = c.clientSecret;
    try {
      const res = await axios.post(c.tokenUrl as string, new URLSearchParams(body), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, timeout: HTTP_TIMEOUT_MS,
      });
      return this.normalizeOidcTokens(res.data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  // ── signing extension points (default no-op) ────────────────────────────────
  /** Mutate authorize params to add a request signature/timestamp (ESIA, Alipay). */
  protected decorateAuthorizeParams(_params: URLSearchParams, _state: string): void {}
  /** Mutate the token-request body to add/replace a signature (ESIA, Alipay). */
  protected async decorateTokenBody(_body: Record<string, string>): Promise<void> {}

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
