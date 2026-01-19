import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';

export class GoogleProvider extends BaseSSOProvider {
  constructor() {
    super('google');
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.sub as string,
      email: data.email as string,
      name: data.name as string,
      picture: data.picture as string,
      provider: 'google'
    };
  }
}
