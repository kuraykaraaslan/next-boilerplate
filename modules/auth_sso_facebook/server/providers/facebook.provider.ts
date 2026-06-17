import crypto from 'crypto';
import axios from 'axios';
import { BaseSSOProvider } from '@kuraykaraaslan/auth_sso/server/providers/base.provider';
import type { SSOProfile } from '@kuraykaraaslan/auth_sso/server/auth_sso.types';
import SSOMessages from '@kuraykaraaslan/auth_sso/server/auth_sso.messages';

/**
 * Facebook (Meta) Login provider.
 *
 * Token exchange uses the canonical base implementation: POST with
 * `application/x-www-form-urlencoded` body to `tokenUrl` (v22.0). Meta's
 * Graph v22 token endpoint accepts both GET-with-query and POST-form-encoded;
 * POST is preferred and avoids leaking `client_secret` into access logs.
 *
 * The userinfo call signs the request with `appsecret_proof`
 * (HMAC-SHA256 of `access_token` keyed by `clientSecret`, hex-encoded) which
 * is required when "Require App Secret" is enabled on the Meta App. The
 * access token is sent as a query param rather than a Bearer header — this is
 * what Meta documents and expects.
 */
export class FacebookProvider extends BaseSSOProvider {
  constructor() {
    super('facebook');
  }

  // getTokens: inherited from BaseSSOProvider (POST x-www-form-urlencoded).

  async getUserInfo(accessToken: string): Promise<SSOProfile> {
    if (!this.config.userInfoUrl) {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }

    try {
      const appsecretProof = crypto
        .createHmac('sha256', this.config.clientSecret)
        .update(accessToken)
        .digest('hex');

      const response = await axios.get(this.config.userInfoUrl, {
        params: {
          fields: 'id,name,email,first_name,last_name,picture',
          access_token: accessToken,
          appsecret_proof: appsecretProof,
        },
      });

      return this.mapUserInfo(response.data);
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    const picture = (data.picture as { data?: { url?: string } } | undefined)?.data?.url;

    return {
      sub: data.id as string,
      email: (data.email as string | undefined) ?? null,
      name: (data.name as string | undefined) ?? null,
      firstName: (data.first_name as string | undefined) ?? null,
      lastName: (data.last_name as string | undefined) ?? null,
      picture: picture ?? null,
      provider: 'facebook',
    };
  }
}
