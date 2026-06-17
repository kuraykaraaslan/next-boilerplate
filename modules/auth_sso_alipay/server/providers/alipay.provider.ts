import crypto from 'crypto';
import axios from 'axios';
import { env } from '@kuraykaraaslan/env';
import { BaseSSOProvider } from '@kuraykaraaslan/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@kuraykaraaslan/auth_sso/server/auth_sso.types';
import SSOMessages from '@kuraykaraaslan/auth_sso/server/auth_sso.messages';

/**
 * Alipay (China) open-platform login. The confidential client authenticates by
 * RSA2-signing every gateway request (no static client_secret): the params are
 * sorted, joined `k=v&…`, and signed RSA-SHA256 with the app private key
 * (ALIPAY_PRIVATE_KEY, PKCS#8 PEM or bare base64). Identity is the `user_id`;
 * Alipay does not return an email.
 *
 * NOTE (verify against live): response-signature verification with
 * ALIPAY_PUBLIC_KEY is left as a follow-up; configure it before production.
 */
export class AlipayProvider extends BaseSSOProvider {
  constructor() { super('alipay'); }

  override generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      app_id: this.config.clientId,
      scope: this.config.scopes.join(','),
      redirect_uri: this.getCallbackUrl(),
    });
    if (state) params.set('state', state);
    return `${this.config.authUrl}?${params.toString()}`;
  }

  override async getTokens(code: string): Promise<SSOTokens> {
    const data = await this.gateway('alipay.system.oauth.token', { grant_type: 'authorization_code', code });
    const resp = data['alipay_system_oauth_token_response'] as Record<string, unknown> | undefined;
    if (!resp?.access_token) {
      const err = (data['error_response'] as Record<string, unknown> | undefined) ?? resp;
      throw new Error(`${SSOMessages.TOKEN_EXCHANGE_FAILED}: ${err?.['sub_msg'] ?? err?.['msg'] ?? 'Alipay token error'}`);
    }
    return {
      accessToken: resp.access_token as string,
      refreshToken: (resp.refresh_token as string | undefined) ?? null,
      idToken: null,
      tokenType: null,
      expiresIn: resp.expires_in ? Number(resp.expires_in) : null,
      scope: null,
      // Carry the Alipay user_id for the userinfo call.
      openid: (resp.user_id as string | undefined) ?? (resp.alipay_user_id as string | undefined) ?? null,
    };
  }

  override async getUserInfo(accessToken: string): Promise<SSOProfile> {
    const data = await this.gateway('alipay.user.info.share', {}, { auth_token: accessToken });
    const resp = data['alipay_user_info_share_response'] as Record<string, unknown> | undefined;
    if (!resp || (resp.code && resp.code !== '10000')) {
      throw new Error(`${SSOMessages.USER_INFO_FAILED}: ${resp?.['sub_msg'] ?? resp?.['msg'] ?? 'Alipay userinfo error'}`);
    }
    return {
      sub: String(resp.user_id ?? resp.open_id),
      email: null,
      name: (resp.nick_name as string | undefined) ?? null,
      picture: (resp.avatar as string | undefined) ?? null,
      provider: 'alipay',
    };
  }

  // ── Alipay gateway + RSA2 signing ──────────────────────────────────────────
  private async gateway(method: string, bizContent: Record<string, string>, extraSystem: Record<string, string> = {}): Promise<Record<string, unknown>> {
    const sys: Record<string, string> = {
      app_id: this.config.clientId,
      method,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: AlipayProvider.timestamp(),
      version: '1.0',
      ...extraSystem,
    };
    if (Object.keys(bizContent).length) Object.assign(sys, bizContent);
    sys.sign = this.sign(sys);
    const res = await axios.post(this.config.tokenUrl, new URLSearchParams(sys), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    });
    return res.data as Record<string, unknown>;
  }

  private sign(params: Record<string, string>): string {
    const key = env.ALIPAY_PRIVATE_KEY;
    if (!key) throw new Error(`${SSOMessages.TOKEN_EXCHANGE_FAILED}: ALIPAY_PRIVATE_KEY is not configured`);
    const base = Object.keys(params)
      .filter((k) => k !== 'sign' && params[k] !== '' && params[k] != null)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return crypto.sign('RSA-SHA256', Buffer.from(base, 'utf8'), AlipayProvider.toPem(key)).toString('base64');
  }

  private static toPem(raw: string): string {
    if (raw.includes('BEGIN')) return raw.replace(/\\n/g, '\n');
    return `-----BEGIN PRIVATE KEY-----\n${raw}\n-----END PRIVATE KEY-----`;
  }

  /** Alipay expects `yyyy-MM-dd HH:mm:ss` in Beijing time (GMT+8). */
  private static timestamp(): string {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date()).replace('T', ' ');
  }

  protected mapUserInfo(): SSOProfile {
    throw new Error('AlipayProvider.mapUserInfo is not used; see getUserInfo override.');
  }
}
