import { env } from '@/libs/env';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProfile, SSOTokens, SSOProviderConfig, SSOProviderService } from '../auth_sso.types';
import { SSO_CONFIGS, getCallbackUrl } from '../auth_sso.config';
import SSOMessages from '../auth_sso.messages';

export class AppleProvider implements SSOProviderService {
  protected provider: SSOProvider = 'apple';
  protected config: SSOProviderConfig;

  private static APPLE_TEAM_ID = env.APPLE_TEAM_ID!;
  private static APPLE_KEY_ID = env.APPLE_KEY_ID!;
  private static APPLE_PRIVATE_KEY = env.APPLE_PRIVATE_KEY!;

  constructor() {
    this.config = SSO_CONFIGS[this.provider];
  }

  private generateClientSecret(): string {
    const payload = {
      iss: AppleProvider.APPLE_TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'https://appleid.apple.com',
      sub: this.config.clientId,
    };

    return jwt.sign(payload, AppleProvider.APPLE_PRIVATE_KEY, {
      algorithm: 'ES256',
      keyid: AppleProvider.APPLE_KEY_ID,
    });
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: getCallbackUrl(this.provider),
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      response_mode: 'form_post',
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async getTokens(code: string): Promise<SSOTokens> {
    try {
      const clientSecret = this.generateClientSecret();

      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: getCallbackUrl(this.provider),
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        accessToken: response.data.id_token,
        refreshToken: response.data.refresh_token,
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  async getUserInfo(accessToken: string): Promise<SSOProfile> {
    try {
      const decodedToken = jwt.decode(accessToken) as { email: string; sub: string };
      return {
        sub: decodedToken.sub,
        email: decodedToken.email,
        provider: 'apple' as SSOProvider
      };
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }
}
