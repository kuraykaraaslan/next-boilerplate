import axios from 'axios';
import { BaseSSOProvider } from '@kuraykaraaslan/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@kuraykaraaslan/auth_sso/server/auth_sso.types';
import SSOMessages from '@kuraykaraaslan/auth_sso/server/auth_sso.messages';

/**
 * VK (Russia) — classic VK OAuth (oauth.vk.com). Token endpoint is a GET; userinfo
 * via the VK API `users.get`. VK only returns email in the token response (not via
 * the API), so we do not surface it here — the user completes their email after
 * login (synthetic-email flow). VK ID (id.vk.com) migration needs a `device_id`
 * from the callback that the generic SSO callback does not yet plumb through.
 */
export class VkProvider extends BaseSSOProvider {
  constructor() { super('vk'); }

  override async getTokens(code: string): Promise<SSOTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.getCallbackUrl(),
      code,
    });
    const res = await axios.get(`${this.config.tokenUrl}?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (res.data?.error) {
      throw new Error(`${SSOMessages.TOKEN_EXCHANGE_FAILED}: ${res.data.error_description ?? res.data.error}`);
    }
    return this.normalizeTokens(res.data);
  }

  override async getUserInfo(accessToken: string): Promise<SSOProfile> {
    const res = await axios.get(this.config.userInfoUrl as string, {
      params: { fields: 'photo_200,screen_name', access_token: accessToken, v: '5.131' },
    });
    if (res.data?.error) throw new Error(SSOMessages.USER_INFO_FAILED);
    const u = res.data?.response?.[0];
    if (!u) throw new Error(SSOMessages.USER_INFO_FAILED);
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.screen_name as string | undefined) || null;
    return {
      sub: String(u.id),
      email: null,
      name,
      firstName: (u.first_name as string | undefined) ?? null,
      lastName: (u.last_name as string | undefined) ?? null,
      picture: (u.photo_200 as string | undefined) ?? null,
      provider: 'vk',
    };
  }

  protected mapUserInfo(): SSOProfile {
    throw new Error('VkProvider.mapUserInfo is not used; see getUserInfo override.');
  }
}
