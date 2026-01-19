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
      picture: data.id ? `https://graph.microsoft.com/v1.0/users/${data.id}/photo/$value` : undefined,
      provider: 'microsoft'
    };
  }
}
