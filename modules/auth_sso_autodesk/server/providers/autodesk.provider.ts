import axios from 'axios';
import { BaseSSOProvider } from '@kuraykaraaslan/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@kuraykaraaslan/auth_sso/server/auth_sso.types';
import SSOMessages from '@kuraykaraaslan/auth_sso/server/auth_sso.messages';

/**
 * Autodesk Platform Services (APS) OAuth 2.0 / OIDC provider.
 *
 * Quirks handled here:
 * - APS v2 token endpoint requires Confidential Client HTTP Basic auth
 *   (`Authorization: Basic base64(clientId:clientSecret)`). client_id /
 *   client_secret MUST NOT be sent in the body.
 * - The v2 token endpoint requires the `scope` param on the POST body
 *   (in addition to the standard `grant_type`, `code`, `redirect_uri`).
 * - The OIDC userinfo endpoint
 *   (`https://api.userprofile.autodesk.com/userinfo`) returns standard
 *   OIDC claims (`sub`, `email`, `name`, `given_name`, `family_name`,
 *   `picture`, `locale`, `email_verified`) — NOT the legacy
 *   `/userprofile/v1/users/@me` shape (`userId`, `emailId`, etc.).
 */
export class AutodeskProvider extends BaseSSOProvider {
  constructor() {
    super('autodesk');
  }

  async getTokens(code: string, _state?: string): Promise<SSOTokens> {
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.getCallbackUrl(),
          scope: this.config.scopes.join(' '),
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            Authorization: this.basicAuthHeader(),
          },
        }
      );

      return this.normalizeTokens(response.data);
    } catch {
      throw new Error(SSOMessages.TOKEN_EXCHANGE_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    return {
      sub: data.sub as string,
      email: (data.email as string | undefined) ?? null,
      emailVerified: (data.email_verified as boolean | undefined) ?? undefined,
      name: (data.name as string | undefined) ?? null,
      firstName: (data.given_name as string | undefined) ?? null,
      lastName: (data.family_name as string | undefined) ?? null,
      picture: (data.picture as string | undefined) ?? null,
      locale: (data.locale as string | undefined) ?? null,
      provider: 'autodesk',
    };
  }
}
