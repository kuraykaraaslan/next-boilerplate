import { BaseSSOProvider } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile } from '@nb/auth_sso/server/auth_sso.types';

export class LinkedInProvider extends BaseSSOProvider {
  protected override usesPkce = true;

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
