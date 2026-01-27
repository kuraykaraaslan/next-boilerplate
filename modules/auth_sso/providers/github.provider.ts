import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';

export class GithubProvider extends BaseSSOProvider {
  constructor() {
    super('github');
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: String(data.id),
      email: data.email as string,
      name: data.name as string,
      picture: data.avatar_url as string,
      provider: 'github'
    };
  }
}
