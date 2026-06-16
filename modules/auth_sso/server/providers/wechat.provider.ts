import axios from 'axios';
import { BaseSSOProvider } from './base.provider';
import type { SSOProfile, SSOTokens } from '../auth_sso.types';
import SSOMessages from '../auth_sso.messages';

/**
 * WeChat Open Platform (qrconnect) OAuth.
 *
 * Diverges from standard OAuth 2.0 in several ways:
 *  - Authorize uses `appid` instead of `client_id`, `scope=snsapi_login`, and the
 *    URL must end with the `#wechat_redirect` fragment.
 *  - Token endpoint is a GET (not POST form) with `appid` + `secret` query params.
 *  - Error responses come back as HTTP 200 with `errcode` / `errmsg` in the JSON body.
 *  - The token response carries an `openid` that the userinfo call requires —
 *    we pass it through SSOTokens.openid (added to the schema for this case).
 *  - Userinfo authenticates by query string (`access_token` + `openid`), NOT Bearer.
 *  - No email is ever returned.
 */
export class WeChatProvider extends BaseSSOProvider {
  constructor() {
    super('wechat');
  }

  override generateAuthUrl(state?: string): string {
    // URLSearchParams encodes values automatically — do NOT pre-encode redirect_uri.
    const params = new URLSearchParams({
      appid: this.config.clientId,
      redirect_uri: this.getCallbackUrl(),
      response_type: 'code',
      scope: this.config.scopes.join(','),
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.config.authUrl}?${params.toString()}#wechat_redirect`;
  }

  override async getTokens(code: string, _state?: string): Promise<SSOTokens> {
    const params = new URLSearchParams({
      appid: this.config.clientId,
      secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    const response = await axios.get(`${this.config.tokenUrl}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    const data = response.data ?? {};

    if (data.errcode) {
      throw new Error(
        `${SSOMessages.TOKEN_EXCHANGE_FAILED}: WeChat errcode ${data.errcode} — ${data.errmsg ?? 'unknown error'}`
      );
    }

    const base = this.normalizeTokens(data);
    return {
      ...base,
      openid: typeof data.openid === 'string' ? data.openid : null,
    };
  }

  override async getUserInfo(accessToken: string, tokens?: SSOTokens): Promise<SSOProfile> {
    if (!this.config.userInfoUrl) {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }

    const openid = tokens?.openid;
    if (!openid) {
      throw new Error(
        `${SSOMessages.USER_INFO_FAILED}: WeChat userinfo requires openid from the token response`
      );
    }

    const params = new URLSearchParams({
      access_token: accessToken,
      openid,
      lang: 'en',
    });

    // WeChat does NOT accept Bearer auth — credentials must travel in the query string.
    const response = await axios.get(`${this.config.userInfoUrl}?${params.toString()}`);
    const data = response.data ?? {};

    if (data.errcode) {
      throw new Error(
        `${SSOMessages.USER_INFO_FAILED}: WeChat errcode ${data.errcode} — ${data.errmsg ?? 'unknown error'}`
      );
    }

    return {
      sub: (data.unionid as string | undefined) || (data.openid as string),
      name: (data.nickname as string | undefined) ?? null,
      picture: (data.headimgurl as string | undefined) ?? null,
      // WeChat's userinfo response does not include an email address.
      email: null,
      provider: 'wechat',
    };
  }

  protected mapUserInfo(_data: Record<string, unknown>): SSOProfile {
    // Not used — `getUserInfo` is overridden because WeChat's auth and field mapping
    // diverge enough from standard OAuth that the base flow doesn't apply.
    throw new Error('WeChatProvider.mapUserInfo is not used; see getUserInfo override.');
  }
}
