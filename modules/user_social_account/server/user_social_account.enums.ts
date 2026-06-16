import { z } from 'zod';
import { SSOProviderEnum } from '@nb/auth_sso/server/auth_sso.enums';

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

/**
 * Region-appropriate social providers per ISO country. Drives a localized
 * "connect account" UI — e.g. VK/Yandex in RU, WeChat/QQ/Weibo/Alipay in CN.
 * Global providers are always appended.
 */
const GLOBAL_PROVIDERS = ['google', 'apple', 'microsoft', 'github', 'facebook'] as const;
const REGIONAL_PROVIDERS: Record<string, string[]> = {
  RU: ['yandex', 'vk'],
  BY: ['yandex', 'vk'],
  KZ: ['yandex', 'vk'],
  CN: ['wechat', 'qq', 'weibo', 'alipay'],
  HK: ['wechat', 'alipay'],
  TW: ['wechat', 'linkedin'],
  TR: ['yandex'],
  US: ['linkedin', 'twitter', 'tiktok'],
  GB: ['linkedin', 'twitter'],
  IN: ['linkedin', 'tiktok'],
};

/** Recommended providers for a country (regional first, then global, de-duped). */
export function regionalProviderHints(country: string | null | undefined): string[] {
  const regional = (country && REGIONAL_PROVIDERS[country.toUpperCase()]) || [];
  return [...new Set([...regional, ...GLOBAL_PROVIDERS])];
}
