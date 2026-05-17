import axios from 'axios';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import SSOMessages from '../auth_sso.messages';

/**
 * TikTok Login Kit (v2).
 *
 * Quirks vs. generic OAuth 2.0:
 * - Uses `client_key` instead of `client_id` on both /authorize and /token.
 * - Scopes are comma-separated (not space-separated).
 * - Token response is FLAT (not wrapped in `data`): `{ access_token, refresh_token,
 *   expires_in, refresh_expires_in, open_id, scope, token_type }`. We capture
 *   `open_id` into the shared `openid` field on SSOTokens (reused from WeChat).
 * - /user/info/ requires a `?fields=` query — without it the response is empty.
 *   Response shape: `{ data: { user: {...} }, error: { code, message, log_id } }`.
 * - Login Kit does not expose email.
 */
export class TikTokProvider extends BaseSSOProvider {
  constructor() {
    super('tiktok');
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_key: this.config.clientId,
      redirect_uri: this.getCallbackUrl(),
      response_type: 'code',
      scope: this.config.scopes.join(','),
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
          client_key: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.getCallbackUrl(),
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      const tokens = this.normalizeTokens(response.data);
      const openId = response.data?.open_id;
      return {
        ...tokens,
        openid: typeof openId === 'string' ? openId : null,
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  async getUserInfo(accessToken: string, _tokens?: SSOTokens): Promise<SSOProfile> {
    if (!this.config.userInfoUrl) {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }

    try {
      const fields = 'open_id,union_id,avatar_url,display_name';
      const url = `${this.config.userInfoUrl}?fields=${fields}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const error = response.data?.error;
      if (error && error.code && error.code !== 'ok') {
        throw new Error(
          `${SSOMessages.USER_INFO_FAILED}: ${error.message ?? error.code}`
        );
      }

      const user = response.data?.data?.user;
      if (!user) {
        throw new Error(SSOMessages.USER_INFO_FAILED);
      }

      return {
        sub: (user.union_id as string | undefined) ?? (user.open_id as string),
        email: null,
        name: (user.display_name as string | undefined) ?? null,
        picture: (user.avatar_url as string | undefined) ?? null,
        provider: 'tiktok',
      };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith(SSOMessages.USER_INFO_FAILED)) {
        throw err;
      }
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(_data: Record<string, unknown>): SSOProfile {
    throw new Error('TikTokProvider.mapUserInfo is unused; getUserInfo handles unwrapping.');
  }
}
