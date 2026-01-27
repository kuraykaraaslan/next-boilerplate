import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProfile, SSOTokens, SSOProviderConfig, SSOProviderService } from '../auth_sso.types';
import { SSO_CONFIGS, getCallbackUrl } from '../auth_sso.config';
import SSOMessages from '../auth_sso.messages';
import axios from 'axios';

export class WeChatProvider implements SSOProviderService {
  protected provider: SSOProvider = 'wechat';
  protected config: SSOProviderConfig;

  constructor() {
    this.config = SSO_CONFIGS[this.provider];
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      appid: this.config.clientId,
      redirect_uri: encodeURIComponent(getCallbackUrl(this.provider)),
      response_type: 'code',
      scope: this.config.scopes.join(','),
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.config.authUrl}?${params.toString()}#wechat_redirect`;
  }

  async getTokens(code: string): Promise<SSOTokens> {
    try {
      const url = `${this.config.tokenUrl}?appid=${this.config.clientId}&secret=${this.config.clientSecret}&code=${code}&grant_type=authorization_code`;

      const response = await axios.get(url);

      if (response.data.errcode) {
        throw new Error(response.data.errmsg);
      }

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        // Store openid for getUserInfo
        ...({ openid: response.data.openid } as any),
      };
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  async getUserInfo(accessToken: string, openid?: string): Promise<SSOProfile> {
    try {
      const url = `${this.config.userInfoUrl}?access_token=${accessToken}&openid=${openid}`;
      const response = await axios.get(url);

      if (response.data.errcode) {
        throw new Error(response.data.errmsg);
      }

      return {
        sub: response.data.unionid || response.data.openid,
        name: response.data.nickname,
        email: response.data.email,
        picture: response.data.headimgurl,
        provider: 'wechat',
      };
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }
}
