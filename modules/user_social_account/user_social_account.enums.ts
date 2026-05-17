import { z } from 'zod';
import { SSOProviderEnum } from '../auth_sso/auth_sso.enums';

/**
 * Identifiers we can store in user_social_account.provider. This is the OAuth
 * SSO set plus 'saml' — a linked SAML identity counts as a connected account so
 * users can manage all federated logins from one panel.
 */
export const SocialAccountProviderEnum = z.union([
  SSOProviderEnum,
  z.literal('saml'),
]);

export type SocialAccountProvider = z.infer<typeof SocialAccountProviderEnum>;

/** True when the provider participates in the OAuth SSO flow (not SAML). */
export function isOAuthSSOProvider(p: string): p is z.infer<typeof SSOProviderEnum> {
  return SSOProviderEnum.options.includes(p as z.infer<typeof SSOProviderEnum>);
}
