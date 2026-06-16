import { z } from 'zod';
import { SocialAccountProviderEnum } from './user_social_account.enums';

export const UserSocialAccountSchema = z.object({
  userSocialAccountId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: SocialAccountProviderEnum,
  providerId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  profilePicture: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable()
});

export const SafeUserSocialAccountSchema = UserSocialAccountSchema.omit({
  accessToken: true,
  refreshToken: true
});

export type UserSocialAccount = z.infer<typeof UserSocialAccountSchema>;
export type SafeUserSocialAccount = z.infer<typeof SafeUserSocialAccountSchema>;

/**
 * A linked identity enriched for display: the safe row plus its presentation
 * descriptor (kind/group/label/icon, see `describeProvider`) and, for OAuth
 * accounts, token-health flags. Surfaced by `listConnectedAccounts` so one panel
 * can render social / enterprise / government identities uniformly.
 */
export const ConnectedAccountSchema = SafeUserSocialAccountSchema.extend({
  kind: z.enum(['oauth', 'saml', 'acs']),
  group: z.enum(['social', 'enterprise', 'government']),
  displayName: z.string(),
  iconSlug: z.string(),
  country: z.string().optional(),
  protocol: z.enum(['oidc', 'saml']).optional(),
  // OAuth-only token health (omitted for SAML/ACS, which store no tokens).
  tokenExpired: z.boolean().optional(),
  tokenExpiresAt: z.date().nullable().optional(),
});

export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
