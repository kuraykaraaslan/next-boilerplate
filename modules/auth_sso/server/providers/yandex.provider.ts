import axios from 'axios';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';
import SSOMessages from '../auth_sso.messages';

/**
 * Yandex ID (Russia) — standard OAuth 2.0 (PKCE supported). Userinfo at
 * login.yandex.ru/info authenticates with the `OAuth <token>` scheme (not Bearer).
 */
export class YandexProvider extends BaseSSOProvider {
  protected override usesPkce = true;

  constructor() { super('yandex'); }

  override async getUserInfo(accessToken: string): Promise<SSOProfile> {
    try {
      const res = await axios.get('https://login.yandex.ru/info', {
        params: { format: 'json' },
        headers: { Authorization: `OAuth ${accessToken}` },
      });
      return this.mapUserInfo(res.data);
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    const avatarId = data.default_avatar_id as string | undefined;
    return {
      sub: String(data.id),
      email: (data.default_email as string | undefined) ?? null,
      name: (data.real_name as string | undefined) ?? (data.display_name as string | undefined) ?? null,
      firstName: (data.first_name as string | undefined) ?? null,
      lastName: (data.last_name as string | undefined) ?? null,
      picture: avatarId ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200` : null,
      provider: 'yandex',
    };
  }
}
