import axios from 'axios';
import { BaseSSOProvider } from '@nb/auth_sso/server/providers/base.provider';
import type { SSOProfile, SSOTokens } from '@nb/auth_sso/server/auth_sso.types';
import SSOMessages from '@nb/auth_sso/server/auth_sso.messages';

/**
 * GitHub OAuth provider.
 *
 * Quirks vs. generic OAuth:
 * - `/user` returns `email: null` when the user's primary email is private. We
 *   fall back to `/user/emails` (requires `user:email` scope) and pick the
 *   primary + verified entry.
 * - Public emails on `/user` are user-chosen and not necessarily verified, so
 *   `emailVerified` is only set true for emails sourced from `/user/emails`
 *   where `verified === true`.
 * - GitHub recommends versioned headers: `Accept: application/vnd.github+json`
 *   and `X-GitHub-Api-Version: 2022-11-28`.
 */
export class GithubProvider extends BaseSSOProvider {
  constructor() {
    super('github');
  }

  async getUserInfo(accessToken: string, _tokens?: SSOTokens): Promise<SSOProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    try {
      const userResponse = await axios.get('https://api.github.com/user', { headers });
      const data: Record<string, unknown> = { ...userResponse.data };

      let emailVerified: boolean | undefined;

      if (data.email == null) {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', { headers });
        const emails = emailsResponse.data as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = Array.isArray(emails)
          ? emails.find((e) => e.primary === true && e.verified === true)
          : undefined;

        if (primary) {
          data.email = primary.email;
          emailVerified = true;
        }
      }

      const profile = this.mapUserInfo(data);
      if (emailVerified !== undefined) {
        profile.emailVerified = emailVerified;
      }
      return profile;
    } catch {
      throw new Error(SSOMessages.USER_INFO_FAILED);
    }
  }

  /** GitHub OAuth-app token revocation: DELETE /applications/{client_id}/token (Basic auth). */
  override async revokeToken(token: string): Promise<boolean> {
    if (!token || !this.config.clientId) return false;
    try {
      await axios.delete(`https://api.github.com/applications/${this.config.clientId}/token`, {
        headers: {
          Authorization: this.basicAuthHeader(),
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        data: { access_token: token },
      });
      return true;
    } catch {
      return false;
    }
  }

  protected mapUserInfo(data: Record<string, unknown>): SSOProfile {
    const name = typeof data.name === 'string' ? data.name : undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;

    if (name) {
      const idx = name.indexOf(' ');
      if (idx === -1) {
        firstName = name;
      } else {
        firstName = name.slice(0, idx);
        lastName = name.slice(idx + 1).trim() || undefined;
      }
    }

    return {
      sub: String(data.id),
      email: (data.email as string | null | undefined) ?? undefined,
      name: name ?? undefined,
      username: typeof data.login === 'string' ? data.login : undefined,
      firstName,
      lastName,
      picture: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
      provider: 'github',
    };
  }
}
