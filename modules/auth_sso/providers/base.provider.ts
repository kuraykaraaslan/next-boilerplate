import axios from 'axios';
import { BaseOidcProvider } from '@/modules/auth_oidc/auth_oidc.engine';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProfile, SSOTokens, SSOProviderConfig, SSOProviderService, SSOAuthUrlOptions } from '../auth_sso.types';
import { SSO_CONFIGS, getCallbackUrl } from '../auth_sso.config';
import SSOMessages from '../auth_sso.messages';

/**
 * Base OAuth 2.0 / OIDC provider for the SOCIAL login catalog. Builds on the
 * shared `auth_oidc` engine (PKCE, Basic confidential-client auth and client
 * assertions are inherited — one implementation, shared with auth_acs and custom
 * OIDC). Subclasses override `mapUserInfo` at minimum and may override
 * `generateAuthUrl` / `getTokens` / `getUserInfo` for vendor quirks.
 *
 * Generic flow: GET /authorize → POST x-www-form-urlencoded /token → GET /userinfo
 * with `Authorization: Bearer`. All standard OAuth 2.0 + OIDC fields (`id_token`,
 * `expires_in`, `token_type`, `scope`, `refresh_token`) are passed through.
 *
 * PKCE: providers that need it (X/Twitter) call the inherited `pkceVerifier(state)`
 * (HMAC(CSRF_SECRET, `pkce:<provider>:<state>`)) — deterministic, 256-bit, base64url.
 * Basic auth: providers needing Confidential-Client Basic auth (X, Autodesk) call
 * the inherited `basicAuthHeader()` and post without client_secret in the body.
 */
export type AuthUrlOptions = SSOAuthUrlOptions;

export abstract class BaseSSOProvider extends BaseOidcProvider implements SSOProviderService {
  protected provider: SSOProvider;
  protected config: SSOProviderConfig;

  /**
   * GOODTOHAVE (security): when true, the generic authorize/token flow attaches a
   * PKCE `code_challenge` (S256) and posts `code_verifier` on token exchange.
   * Default false to preserve providers with bespoke token flows; standard
   * authorization-code OIDC providers opt in. The verifier is derived
   * deterministically from `state` (HMAC) — same scheme as Twitter/X.
   */
  protected usesPkce = false;

  constructor(provider: SSOProvider) {
    const config = SSO_CONFIGS[provider];
    super({
      authUrl: config.authUrl,
      tokenUrl: config.tokenUrl,
      userInfoUrl: config.userInfoUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: getCallbackUrl(provider),
      scopes: config.scopes,
      // PKCE salt chosen so the inherited verifier matches the historical value exactly.
      pkceSalt: `pkce:${provider}`,
    });
    this.provider = provider;
    this.config = config;
  }

  generateAuthUrl(state?: string, options?: AuthUrlOptions): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: getCallbackUrl(this.provider),
      response_type: 'code',
      scope: this.config.scopes.join(' '),
    });

    if (state) {
      params.set('state', state);
    }

    // GOODTOHAVE (i18n): locale-aware consent screen.
    if (options?.uiLocales) params.set('ui_locales', options.uiLocales);
    if (options?.loginHint) params.set('login_hint', options.loginHint);

    // GOODTOHAVE (security): PKCE for all opted-in providers.
    if (this.usesPkce && state) {
      const verifier = this.pkceVerifier(state);
      params.set('code_challenge', this.pkceChallenge(verifier));
      params.set('code_challenge_method', 'S256');
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async getTokens(code: string, state?: string): Promise<SSOTokens> {
    try {
      const body: Record<string, string> = {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: getCallbackUrl(this.provider),
        grant_type: 'authorization_code',
      };
      // GOODTOHAVE (security): include the PKCE verifier on token exchange.
      if (this.usesPkce && state) {
        body.code_verifier = this.pkceVerifier(state);
      }

      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams(body),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      return this.normalizeTokens(response.data);
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  /**
   * GOODTOHAVE (security/compliance): revoke an OAuth grant at the provider on
   * unlink. Providers that expose an RFC 7009 revocation endpoint (or a vendor
   * equivalent) override this. Default is a no-op returning false (no endpoint).
   */
  async revokeToken(_token: string, _tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'): Promise<boolean> {
    return false;
  }

  /**
   * GOODTOHAVE (security): refresh-token rotation/revalidation for linked social
   * accounts. Standard OAuth `grant_type=refresh_token`. Providers without
   * refresh support (or with custom flows) override or rely on the default,
   * which returns null when no refresh is possible.
   */
  async refreshTokens(refreshToken: string): Promise<SSOTokens | null> {
    if (!refreshToken) return null;
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );
      return this.normalizeTokens(response.data);
    } catch {
      return null;
    }
  }

  async getUserInfo(accessToken: string, _tokens?: SSOTokens): Promise<SSOProfile> {
    if (!this.config.userInfoUrl) {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }

    try {
      const response = await axios.get(this.config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return this.mapUserInfo(response.data);
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected abstract mapUserInfo(data: Record<string, unknown>): SSOProfile;

  // ───── Helpers (called by subclass overrides) ──────────────────────────────

  /** Map a vendor's raw token-endpoint response to our normalised SSOTokens shape. */
  protected normalizeTokens(data: Record<string, unknown>): SSOTokens {
    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string | undefined) ?? null,
      idToken: (data.id_token as string | undefined) ?? null,
      tokenType: (data.token_type as string | undefined) ?? null,
      expiresIn: typeof data.expires_in === 'number' ? data.expires_in : null,
      scope: (data.scope as string | undefined) ?? null,
    };
  }

  // `basicAuthHeader()`, `pkceVerifier(state)` and `pkceChallenge(verifier)` are
  // inherited from the shared auth_oidc engine (BaseOidcProvider) — single
  // implementation, identical output (pkceSalt `pkce:<provider>` preserves the
  // historical verifier value).

  protected getCallbackUrl(): string {
    return getCallbackUrl(this.provider);
  }
}
