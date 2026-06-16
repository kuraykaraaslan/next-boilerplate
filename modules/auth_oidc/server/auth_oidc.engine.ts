import axios from 'axios';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import OidcMessages from './auth_oidc.messages';
import { getSigningPem } from './auth_oidc.jwks';
import {
  HTTP_TIMEOUT_MS,
  type OidcEngineConfig, type OidcTokens, type OidcAuthUrlOptions,
} from './auth_oidc.engine.types';
import {
  ensureEndpoints, normalizeOidcTokens, basicAuthHeader, buildClientAssertion,
  pkceVerifier, pkceChallenge,
} from './auth_oidc.engine.helpers';

// Re-exported so existing `auth_oidc.engine` import sites keep working.
export type { OidcEngineConfig, OidcTokens, OidcAuthUrlOptions } from './auth_oidc.engine.types';

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
 *
 * Pure protocol helpers (token normalisation, PKCE, client assertions, endpoint
 * discovery) live in `auth_oidc.engine.helpers`; this class wraps them with the
 * instance config and owns the HTTP protocol flow.
 */
export abstract class BaseOidcProvider {
  protected constructor(protected oidcConfig: OidcEngineConfig) {}

  /** Resolve missing endpoints / jwks_uri from the issuer's discovery document. */
  protected ensureEndpoints(): Promise<void> {
    return ensureEndpoints(this.oidcConfig);
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
      body.client_assertion = buildClientAssertion(c);
    } else if (c.useBasicAuth) {
      headers.Authorization = this.basicAuthHeader();
    } else if (c.clientSecret) {
      body.client_secret = c.clientSecret;
    }
    // Extension point: providers that must SIGN the token request (ESIA, Alipay)
    // add/replace signature fields here. Default no-op.
    await this.decorateTokenBody(body, state);
    try {
      const res = await axios.post(c.tokenUrl as string, new URLSearchParams(body), { headers, timeout: HTTP_TIMEOUT_MS });
      return normalizeOidcTokens(res.data as Record<string, unknown>);
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
      return normalizeOidcTokens(res.data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  // ── signing extension points (default no-op) ────────────────────────────────
  /** Mutate authorize params to add a request signature/timestamp (ESIA, Alipay). */
  protected decorateAuthorizeParams(_params: URLSearchParams, _state: string): void {}
  /** Mutate the token-request body to add/replace a signature (ESIA, Alipay). `state` is the relay state. */
  protected async decorateTokenBody(_body: Record<string, string>, _state?: string): Promise<void> {}

  // ── helper wrappers (implementations in auth_oidc.engine.helpers) ────────────
  protected basicAuthHeader(): string {
    return basicAuthHeader(this.oidcConfig);
  }
  protected pkceVerifier(state: string): string {
    return pkceVerifier(this.oidcConfig.pkceSalt, state);
  }
  protected pkceChallenge(verifier: string): string {
    return pkceChallenge(verifier);
  }
}
