import axios from 'axios';
import { BaseSSOProvider, type AuthUrlOptions } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile } from '@nb/auth_sso/server/auth_sso.types';

export class GoogleProvider extends BaseSSOProvider {
  protected override usesPkce = true;

  constructor() {
    super('google');
  }

  override generateAuthUrl(state?: string, options?: AuthUrlOptions): string {
    const url = super.generateAuthUrl(state, options);
    const params = new URLSearchParams({
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${url}&${params.toString()}`;
  }

  /** Google RFC 7009 revocation endpoint. */
  override async revokeToken(token: string): Promise<boolean> {
    if (!token) return false;
    try {
      await axios.post(
        'https://oauth2.googleapis.com/revoke',
        new URLSearchParams({ token }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return true;
    } catch {
      return false;
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.sub as string,
      email: data.email as string,
      emailVerified: data.email_verified as boolean | undefined,
      name: data.name as string | undefined,
      firstName: data.given_name as string | undefined,
      lastName: data.family_name as string | undefined,
      picture: data.picture as string | undefined,
      locale: data.locale as string | undefined,
      provider: 'google',
    };
  }
}
