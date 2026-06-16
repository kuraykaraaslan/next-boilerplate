import { BaseSSOProvider, type AuthUrlOptions } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile } from '@nb/auth_sso/server/auth_sso.types';

export class MicrosoftProvider extends BaseSSOProvider {
  protected override usesPkce = true;

  constructor() {
    super('microsoft');
  }

  override generateAuthUrl(state?: string, options?: AuthUrlOptions): string {
    const url = super.generateAuthUrl(state, options);
    return `${url}&prompt=consent`;
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.id as string,
      email: (data.mail || data.userPrincipalName) as string,
      name: data.displayName as string | undefined,
      firstName: data.givenName as string | undefined,
      lastName: data.surname as string | undefined,
      locale: data.preferredLanguage as string | undefined,
      // Picture omitted: Graph /me/photo/$value requires a Bearer token and cannot be used as a plain <img src>; downstream code can lazily fetch and convert to a data URL if needed.
      picture: undefined,
      provider: 'microsoft',
    };
  }
}
