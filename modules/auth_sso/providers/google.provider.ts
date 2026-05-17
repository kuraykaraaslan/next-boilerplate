import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';

export class GoogleProvider extends BaseSSOProvider {
  constructor() {
    super('google');
  }

  generateAuthUrl(state?: string): string {
    const url = super.generateAuthUrl(state);
    const params = new URLSearchParams({
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${url}&${params.toString()}`;
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
