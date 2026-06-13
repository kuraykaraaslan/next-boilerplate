import { z } from 'zod';
import { SSOProviderEnum } from '../auth_sso/auth_sso.enums';

/**
 * Identifiers we can store in user_social_account.provider. This is the OAuth
 * SSO set, plus 'saml' (a linked per-tenant SAML identity), plus the national
 * identity providers stored as `acs:<provider>` (e.g. `acs:tr_edevlet`) — all
 * count as connected accounts manageable from one panel.
 */
export const SocialAccountProviderEnum = z.union([
  SSOProviderEnum,
  z.literal('saml'),
  z.string().regex(/^acs:[a-z0-9_]+$/),
]);

export type SocialAccountProvider = z.infer<typeof SocialAccountProviderEnum>;

/** True when the provider participates in the OAuth SSO flow (not SAML). */
export function isOAuthSSOProvider(p: string): p is z.infer<typeof SSOProviderEnum> {
  return SSOProviderEnum.options.includes(p as z.infer<typeof SSOProviderEnum>);
}
