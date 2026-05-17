import { z } from 'zod';
import { SSOProviderEnum } from './auth_sso.enums';

export const SSOProfileSchema = z.object({
  sub: z.string(),
  email: z.string().email().nullable().optional(),
  emailVerified: z.boolean().optional(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  provider: SSOProviderEnum,
});

export const SSOTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().nullable().optional(),
  idToken: z.string().nullable().optional(),
  tokenType: z.string().nullable().optional(),
  expiresIn: z.number().nullable().optional(),
  scope: z.string().nullable().optional(),
  /** WeChat-only: returned alongside access_token, needed by userinfo. */
  openid: z.string().nullable().optional(),
});

export const SSOCallbackResultSchema = z.object({
  profile: SSOProfileSchema,
  tokens: SSOTokensSchema,
});

export type SSOProfile = z.infer<typeof SSOProfileSchema>;
export type SSOTokens = z.infer<typeof SSOTokensSchema>;
export type SSOCallbackResult = z.infer<typeof SSOCallbackResultSchema>;

export interface SSOProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackPath: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scopes: string[];
}

export interface SSOProviderService {
  /**
   * Build the redirect URL the user is sent to. `state` should be high-entropy and
   * round-tripped on the callback. Providers that use PKCE derive the verifier from it.
   */
  generateAuthUrl(state?: string): string;
  /**
   * Exchange the auth code for tokens. `state` must be the same value passed to
   * generateAuthUrl — providers that derive PKCE / nonce / verifier from state need it.
   */
  getTokens(code: string, state?: string): Promise<SSOTokens>;
  /**
   * Fetch the user profile. `tokens` is the full token bundle from getTokens — WeChat
   * needs `openid` from it, OIDC providers prefer the `idToken`, etc.
   */
  getUserInfo(accessToken: string, tokens?: SSOTokens): Promise<SSOProfile>;
}
