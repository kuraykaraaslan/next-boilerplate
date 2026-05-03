import { env } from '@/libs/env';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import axios from 'axios';
import SSOMessages from '../auth_sso.messages';

export class SlackProvider extends BaseSSOProvider {
  constructor() {
    super('slack');
  }

  async getTokens(code: string): Promise<SSOTokens> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.getCallbackUrl(),
      });

      const response = await axios.post(this.config.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Slack token fetch failed');
      }

      return {
        accessToken: response.data.authed_user.access_token,
        refreshToken: null,
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  private getCallbackUrl(): string {
    const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';
    return `${APP_HOST}${this.config.callbackPath}`;
  }

  async getUserInfo(accessToken: string): Promise<SSOProfile> {
    try {
      const response = await axios.get(this.config.userInfoUrl!, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Slack user info fetch failed');
      }

      return {
        sub: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
        picture: response.data.user.image_192,
        provider: 'slack',
      };
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    const user = data.user as Record<string, unknown>;
    return {
      sub: user.id as string,
      email: user.email as string,
      name: user.name as string | undefined,
      picture: user.image_192 as string | undefined,
      provider: 'slack',
    };
  }
}
