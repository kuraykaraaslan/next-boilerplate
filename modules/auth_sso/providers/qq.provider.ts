import axios from 'axios';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import SSOMessages from '../auth_sso.messages';

/**
 * Tencent QQ Connect (China). Multi-step OAuth: token (GET, `fmt=json`) →
 * `/oauth2.0/me` to resolve the openid → `/user/get_user_info`. No email is
 * returned; the openid (or unionid) is the stable subject.
 */
export class QQProvider extends BaseSSOProvider {
  constructor() { super('qq'); }

  override async getTokens(code: string): Promise<SSOTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.getCallbackUrl(),
      fmt: 'json',
    });
    const res = await axios.get(`${this.config.tokenUrl}?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (res.data?.error) {
      throw new Error(`${SSOMessages.TOKEN_EXCHANGE_FAILED}: ${res.data.error_description ?? res.data.error}`);
    }
    return this.normalizeTokens(res.data);
  }

  override async getUserInfo(accessToken: string): Promise<SSOProfile> {
    // Step 1: resolve the openid for this access token.
    const meRes = await axios.get('https://graph.qq.com/oauth2.0/me', { params: { access_token: accessToken, fmt: 'json' } });
    const openid = meRes.data?.openid as string | undefined;
    const unionid = meRes.data?.unionid as string | undefined;
    if (!openid) throw new Error(`${SSOMessages.USER_INFO_FAILED}: QQ did not return an openid`);

    // Step 2: fetch the profile.
    const res = await axios.get(this.config.userInfoUrl as string, {
      params: { access_token: accessToken, oauth_consumer_key: this.config.clientId, openid },
    });
    const d = res.data ?? {};
    if (typeof d.ret === 'number' && d.ret !== 0) throw new Error(`${SSOMessages.USER_INFO_FAILED}: ${d.msg ?? d.ret}`);
    return {
      sub: unionid || openid,
      email: null,
      name: (d.nickname as string | undefined) ?? null,
      picture: (d.figureurl_qq_2 as string | undefined) ?? (d.figureurl_qq_1 as string | undefined) ?? null,
      provider: 'qq',
    };
  }

  protected mapUserInfo(): SSOProfile {
    throw new Error('QQProvider.mapUserInfo is not used; see getUserInfo override.');
  }
}
