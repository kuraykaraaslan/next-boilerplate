import { BaseSSOProvider } from './base.provider';
import type { SSOProfile } from '../auth_sso.types';

export class AutodeskProvider extends BaseSSOProvider {
  constructor() {
    super('autodesk');
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.userId as string,
      email: data.emailId as string,
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || undefined,
      picture: (data.profileImages as { sizeX48?: string })?.sizeX48,
      provider: 'autodesk',
    };
  }
}
