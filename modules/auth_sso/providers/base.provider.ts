import axios from 'axios';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProfile, SSOTokens, SSOProviderConfig, SSOProviderService } from '../auth_sso.types';
import { SSO_CONFIGS, getCallbackUrl } from '../auth_sso.config';
import SSOMessages from '../auth_sso.messages';

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
      scope: this.config.scopes.join(' ')
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async getTokens(code: string): Promise<SSOTokens> {
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: getCallbackUrl(this.provider),
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  async getUserInfo(accessToken: string): Promise<SSOProfile> {
    if (!this.config.userInfoUrl) {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }

    try {
      const response = await axios.get(this.config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return this.mapUserInfo(response.data);
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected abstract mapUserInfo(data: Record<string, unknown>): SSOProfile;
}
