import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';

export class LinkedInProvider extends BaseSSOProvider {
  constructor() {
    super('linkedin');
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.sub as string,
      email: data.email as string,
      name: data.name as string | undefined,
      picture: data.picture as string | undefined,
      provider: 'linkedin'
    };
  }
}
