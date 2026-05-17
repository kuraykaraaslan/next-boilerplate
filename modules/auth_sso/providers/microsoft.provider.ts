import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';

export class MicrosoftProvider extends BaseSSOProvider {
  constructor() {
    super('microsoft');
  }

  generateAuthUrl(state?: string): string {
    const url = super.generateAuthUrl(state);
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
