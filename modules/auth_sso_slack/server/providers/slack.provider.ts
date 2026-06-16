import axios from 'axios';
import { BaseSSOProvider } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@nb/auth_sso/server/auth_sso.types';
import SSOMessages from '@nb/auth_sso/server/auth_sso.messages';

/**
 * Slack Sign in with Slack (OIDC).
 *
 * Uses Slack's OpenID Connect endpoints:
 *   - https://slack.com/openid/connect/authorize
 *   - https://slack.com/api/openid.connect.token
 *   - https://slack.com/api/openid.connect.userInfo
 *
 * Quirks vs vanilla OIDC:
 *   - Both the token and userinfo endpoints wrap their response with `{ ok: boolean, error?: string, ... }`.
 *     A non-2xx is not the only failure mode — `ok: false` with HTTP 200 is also possible — so we
 *     explicitly assert `ok` and surface `error` for debuggability.
 *   - Apart from the `ok`/`error` envelope, payloads are otherwise standard OIDC (flat `sub`, `email`,
 *     `given_name`, `family_name`, `picture`, `locale`, plus Slack-specific
 *     `https://slack.com/team_id` / `https://slack.com/user_id` claims we don't currently consume).
 */
export class SlackProvider extends BaseSSOProvider {
  constructor() {
    super('slack');
  }

  async getTokens(code: string, _state?: string): Promise<SSOTokens> {
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
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

      if (!response.data?.ok) {
        const slackError = response.data?.error ?? 'unknown_error';
        throw new Error(`${SSOMessages.TOKEN_EXCHANGE_FAILED}: ${slackError}`);
      }

      return this.normalizeTokens(response.data);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith(SSOMessages.TOKEN_EXCHANGE_FAILED)) {
        throw err;
      }
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

      if (!response.data?.ok) {
        const slackError = response.data?.error ?? 'unknown_error';
        throw new Error(`${SSOMessages.USER_INFO_FAILED}: ${slackError}`);
      }

      return this.mapUserInfo(response.data);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith(SSOMessages.USER_INFO_FAILED)) {
        throw err;
      }
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.sub as string,
      email: data.email as string | undefined,
      emailVerified: data.email_verified as boolean | undefined,
      name: data.name as string | undefined,
      firstName: data.given_name as string | undefined,
      lastName: data.family_name as string | undefined,
      picture: data.picture as string | undefined,
      locale: data.locale as string | undefined,
      provider: 'slack',
    };
  }
}
