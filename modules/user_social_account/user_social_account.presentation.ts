import { ACS_CATALOG } from '@/modules/auth_acs/auth_acs.config';
import type { AcsProvider } from '@/modules/auth_acs/auth_acs.enums';
import { isOAuthSSOProvider } from './user_social_account.enums';

/**
 * Presentation layer for linked identities. Every account a user holds lives in
 * one table keyed only by a `provider` string — an OAuth/OIDC social login
 * (`google`), an enterprise SAML link (`saml`), or a national/government identity
 * (`acs:<key>`). This classifies any such string into a kind + group + human
 * label so a single "connected accounts" panel can render them all uniformly,
 * regardless of protocol (OIDC vs SAML) or flow (SSO vs ACS/government).
 */

export type AccountKind = 'oauth' | 'saml' | 'acs';
export type AccountGroup = 'social' | 'enterprise' | 'government';

export interface ProviderDescriptor {
  kind: AccountKind;
  group: AccountGroup;
  /** Human label, e.g. "Google", "Enterprise SSO (SAML)", "e-Devlet ile Giriş". */
  displayName: string;
  /** Stable hint the UI maps to an icon, e.g. 'google' | 'saml' | 'acs:tr_edevlet'. */
  iconSlug: string;
  /** ISO country (ACS only). */
  country?: string;
  /** Underlying transport. OAuth providers speak OIDC; SAML speaks SAML; ACS varies. */
  protocol?: 'oidc' | 'saml';
}

/** Classify a stored `provider` string into its display descriptor. */
export function describeProvider(provider: string): ProviderDescriptor {
  if (provider === 'saml') {
    return {
      kind: 'saml',
      group: 'enterprise',
      displayName: 'Enterprise SSO (SAML)',
      iconSlug: 'saml',
      protocol: 'saml',
    };
  }

  if (provider.startsWith('acs:')) {
    const key = provider.slice('acs:'.length) as AcsProvider;
    const entry = ACS_CATALOG[key];
    return {
      kind: 'acs',
      group: 'government',
      displayName: entry?.label ?? key,
      iconSlug: provider,
      country: entry?.country,
      protocol: entry?.protocol,
    };
  }

  // Default: OAuth/OIDC social provider (validated set, or any unknown slug).
  return {
    kind: 'oauth',
    group: 'social',
    displayName: isOAuthSSOProvider(provider)
      ? provider.charAt(0).toUpperCase() + provider.slice(1)
      : provider,
    iconSlug: provider,
    protocol: 'oidc',
  };
}
