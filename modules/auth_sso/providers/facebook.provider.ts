import { env } from '@/libs/env';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';
import axios from 'axios';
import SSOMessages from '../auth_sso.messages';

export class FacebookProvider extends BaseSSOProvider {
  constructor() {
    super('facebook');
  }

  async getTokens(code: string) {
    try {
      const response = await axios.get(this.config.tokenUrl, {
        params: {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.getCallbackUrl(),
        },
      });

      return {
        accessToken: response.data.access_token,
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
        params: {
          fields: 'id,name,email,picture',
          access_token: accessToken,
        },
      });

      return this.mapUserInfo(response.data);
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.id as string,
      email: (data.email as string),
      name: data.name as string | undefined,
      picture: (data.picture as { data?: { url?: string } })?.data?.url,
      provider: 'facebook',
    };
  }
}
