import axios from 'axios';
import crypto from 'crypto';
import { env } from '@/modules/env';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProfile, SSOTokens, SSOProviderConfig, SSOProviderService } from '../auth_sso.types';
import { SSO_CONFIGS, getCallbackUrl } from '../auth_sso.config';
import SSOMessages from '../auth_sso.messages';

/**
 * Base OAuth 2.0 / OIDC provider. Subclasses override `mapUserInfo` at minimum and
 * may override `generateAuthUrl` / `getTokens` / `getUserInfo` for vendor quirks.
 *
 * Generic flow: GET /authorize → POST x-www-form-urlencoded /token → GET /userinfo
 * with `Authorization: Bearer`. All standard OAuth 2.0 + OIDC fields (`id_token`,
 * `expires_in`, `token_type`, `scope`, `refresh_token`) are passed through.
 *
 * PKCE: providers that need it (X/Twitter) call `pkceVerifier(state)` to derive a
 * deterministic verifier from `state` via HMAC(CSRF_SECRET, state). Verifier is
 * 256-bit, base64url, unrecoverable without the secret — equivalent security to
 * a random verifier when state itself is high-entropy.
 *
 * Basic auth: providers that require Confidential Client Basic auth (X, Autodesk)
 * call `basicAuthHeader()` and post without client_secret in the body.
 */
export abstract class BaseSSOProvider implements SSOProviderService {
  protected provider: SSOProvider;
  protected config: SSOProviderConfig;

  constructor(provider: SSOProvider) {
    this.provider = provider;
    this.config = SSO_CONFIGS[provider];
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: getCallbackUrl(this.provider),
      response_type: 'code',
      scope: this.config.scopes.join(' '),
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async getTokens(code: string, _state?: string): Promise<SSOTokens> {
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
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

      return this.normalizeTokens(response.data);
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
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

  /** `Authorization: Basic base64(clientId:clientSecret)` for Confidential Client token calls. */
  protected basicAuthHeader(): string {
    const raw = `${this.config.clientId}:${this.config.clientSecret}`;
    return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
  }

  /** Derive a PKCE verifier deterministically from `state`. 256-bit, base64url, 43 chars. */
  protected pkceVerifier(state: string): string {
    if (!state) {
      throw new Error('PKCE verifier requires a non-empty state');
    }
    return crypto
      .createHmac('sha256', env.CSRF_SECRET)
      .update(`pkce:${this.provider}:${state}`)
      .digest('base64url');
  }

  /** S256 challenge = base64url(SHA256(verifier)). */
  protected pkceChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  protected getCallbackUrl(): string {
    return getCallbackUrl(this.provider);
  }
}
