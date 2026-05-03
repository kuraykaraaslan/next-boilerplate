import { env } from '@/libs/env';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import axios from 'axios';
import SSOMessages from '../auth_sso.messages';

export class TwitterProvider extends BaseSSOProvider {
  constructor() {
    super('twitter');
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.getCallbackUrl(),
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
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
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.getCallbackUrl(),
          grant_type: 'authorization_code',
          code_verifier: 'challenge',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
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

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.id as string,
      email: (data.email as string),
      name: data.name as string | undefined,
      picture: data.profile_image_url as string | undefined,
      provider: 'twitter',
    };
  }
}
