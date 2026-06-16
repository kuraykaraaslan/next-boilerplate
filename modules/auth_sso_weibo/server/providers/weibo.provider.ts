import axios from 'axios';
import { BaseSSOProvider } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@nb/auth_sso/server/auth_sso.types';
import SSOMessages from '@nb/auth_sso/server/auth_sso.messages';

/**
 * Sina Weibo (China) — OAuth 2.0. The token response carries the `uid` required by
 * the `users/show` userinfo call; we pass it through SSOTokens.openid. No email.
 */
export class WeiboProvider extends BaseSSOProvider {
  constructor() { super('weibo'); }

  override async getTokens(code: string): Promise<SSOTokens> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getCallbackUrl(),
    });
    const res = await axios.post(this.config.tokenUrl, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    });
    if (res.data?.error) {
      throw new Error(`${SSOMessages.TOKEN_EXCHANGE_FAILED}: ${res.data.error_description ?? res.data.error}`);
    }
    const base = this.normalizeTokens(res.data);
    return { ...base, openid: res.data?.uid != null ? String(res.data.uid) : null };
  }

  override async getUserInfo(accessToken: string, tokens?: SSOTokens): Promise<SSOProfile> {
    const uid = tokens?.openid;
    if (!uid) throw new Error(`${SSOMessages.USER_INFO_FAILED}: Weibo userinfo requires uid from the token response`);
    const res = await axios.get(this.config.userInfoUrl as string, { params: { access_token: accessToken, uid } });
    const d = res.data ?? {};
    if (d.error) throw new Error(`${SSOMessages.USER_INFO_FAILED}: ${d.error}`);
    return {
      sub: String(d.id ?? uid),
      email: null,
      name: (d.screen_name as string | undefined) ?? (d.name as string | undefined) ?? null,
      picture: (d.avatar_large as string | undefined) ?? (d.profile_image_url as string | undefined) ?? null,
      provider: 'weibo',
    };
  }

  protected mapUserInfo(): SSOProfile {
    throw new Error('WeiboProvider.mapUserInfo is not used; see getUserInfo override.');
  }
}
