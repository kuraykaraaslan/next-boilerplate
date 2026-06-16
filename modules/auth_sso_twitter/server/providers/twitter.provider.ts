import axios from 'axios';
import { BaseSSOProvider } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@nb/auth_sso/server/auth_sso.types';
import SSOMessages from '@nb/auth_sso/server/auth_sso.messages';

/**
 * X / Twitter OAuth 2.0 provider.
 *
 * Quirks handled here:
 * - PKCE is REQUIRED. Verifier is derived from `state` via HMAC(CSRF_SECRET, state)
 *   so the verifier can be reconstructed on the callback without server-side storage.
 *   Challenge is S256.
 * - Confidential client auth uses HTTP Basic (`Authorization: Basic ...`); client_secret
 *   MUST NOT be sent in the body. `client_id` IS still sent in the body (X quirk).
 * - `/2/users/me` wraps the user in `{ data: { ... } }` — we unwrap before mapping.
 * - X does not return an email, so `email` is always null.
 */
export class TwitterProvider extends BaseSSOProvider {
  constructor() {
    super('twitter');
  }

  generateAuthUrl(state?: string): string {
    if (!state) {
      throw new Error('Twitter SSO requires a non-empty state for PKCE');
    }

    const verifier = this.pkceVerifier(state);
    const challenge = this.pkceChallenge(verifier);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.getCallbackUrl(),
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async getTokens(code: string, state?: string): Promise<SSOTokens> {
    if (!state) {
      throw new Error('Twitter SSO token exchange requires the original state for PKCE');
    }

    const verifier = this.pkceVerifier(state);

    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.getCallbackUrl(),
          code_verifier: verifier,
          client_id: this.config.clientId,
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

  async getUserInfo(accessToken: string): Promise<SSOProfile> {
    if (!this.config.userInfoUrl) {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }

    try {
      const response = await axios.get(
        `${this.config.userInfoUrl}?user.fields=profile_image_url`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const u = response.data?.data as
        | { id: string; name?: string; username?: string; profile_image_url?: string }
        | undefined;

      if (!u?.id) {
        throw new Error(SSOMessages.USER_INFO_FAILED);
      }

      return {
        sub: u.id,
        name: u.name ?? null,
        username: u.username ?? null,
        picture: u.profile_image_url ?? null,
        email: null,
        provider: 'twitter',
      };
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  protected mapUserInfo(_data: Record<string, unknown>): SSOProfile {
    // X requires unwrapping `response.data.data` and is handled inline in getUserInfo above.
    throw new Error('TwitterProvider.mapUserInfo is not used; getUserInfo unwraps directly.');
  }
}
