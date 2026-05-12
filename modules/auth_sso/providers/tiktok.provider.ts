import { env } from '@/modules/env';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import axios from 'axios';
import SSOMessages from '../auth_sso.messages';

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

  private getCallbackUrl(): string {
    const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';
    return `${APP_HOST}${this.config.callbackPath}`;
  }

  async getTokens(code: string): Promise<SSOTokens> {
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

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  async getUserInfo(accessToken: string): Promise<SSOProfile> {
    try {
      const response = await axios.get(this.config.userInfoUrl!, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data.data;
      return {
        sub: data.open_id,
        email: data.email || undefined,
        name: data.nickname || undefined,
        picture: data.avatar || undefined,
        provider: 'tiktok',
      };
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.open_id as string,
      email: (data.email as string),
      name: data.nickname as string | undefined,
      picture: data.avatar as string | undefined,
      provider: 'tiktok',
    };
  }
}
