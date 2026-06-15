import 'reflect-metadata';
import type { SafeUserSocialAccount, ConnectedAccount } from './user_social_account.types';
import type { SocialAccountProvider } from './user_social_account.enums';
import { type SocialLinkContext } from './user_social_account.helpers';
import {
  getByUserId, getByProviderAndProviderId, findUserIdByProvider,
  isProviderAllowed, availableProviders, listForTenant, listConnectedAccounts,
} from './user_social_account.read.service';
import {
  updateTokens, isTokenExpired, refreshIfNeeded, getRawTokens, batchTokenHealth,
} from './user_social_account.token.service';
import { link, unlink, isLastLoginMethod, eraseForUser } from './user_social_account.link.service';

export type { SocialLinkContext };

/**
 * User social-account service facade. The implementation is split across focused
 * modules (`user_social_account.read.service`, `.token.service`, `.link.service`,
 * plus the `user_social_account.helpers`); this class preserves the single
 * `UserSocialAccountService.*` entry point its callers depend on.
 */
export default class UserSocialAccountService {
  static getByUserId(userId: string): Promise<SafeUserSocialAccount[]> {
    return getByUserId(userId);
  }

  /** All of a user's linked identities, enriched for display (social/SAML/government). */
  static listConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return listConnectedAccounts(userId);
  }

  static getByProviderAndProviderId(provider: SocialAccountProvider, providerId: string): Promise<SafeUserSocialAccount | null> {
    return getByProviderAndProviderId(provider, providerId);
  }

  static availableProviders(tenantId: string | undefined, country: string | null | undefined): Promise<string[]> {
    return availableProviders(tenantId, country);
  }

  static isProviderAllowed(tenantId: string | undefined, provider: SocialAccountProvider): Promise<boolean> {
    return isProviderAllowed(tenantId, provider);
  }

  static link(
    userId: string,
    provider: SocialAccountProvider,
    providerId: string,
    accessToken?: string,
    refreshToken?: string,
    profilePicture?: string,
    ctx?: SocialLinkContext,
  ): Promise<SafeUserSocialAccount> {
    return link(userId, provider, providerId, accessToken, refreshToken, profilePicture, ctx);
  }

  static updateTokens(
    userSocialAccountId: string,
    accessToken: string,
    refreshToken?: string,
    opts?: { expiresAt?: Date | null; scopes?: string[] },
  ): Promise<void> {
    return updateTokens(userSocialAccountId, accessToken, refreshToken, opts);
  }

  static isTokenExpired(account: { accessTokenExpiresAt?: Date | null }, skewSeconds = 120): boolean {
    return isTokenExpired(account, skewSeconds);
  }

  static refreshIfNeeded(
    userSocialAccountId: string,
    refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date | null; scopes?: string[] } | null>,
    skewSeconds = 120,
  ): Promise<string | null> {
    return refreshIfNeeded(userSocialAccountId, refreshFn, skewSeconds);
  }

  static getRawTokens(userSocialAccountId: string): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    return getRawTokens(userSocialAccountId);
  }

  static unlink(userId: string, provider: SocialAccountProvider, ctx?: SocialLinkContext): Promise<void> {
    return unlink(userId, provider, ctx);
  }

  static isLastLoginMethod(userId: string, exceptAccountId: string): Promise<boolean> {
    return isLastLoginMethod(userId, exceptAccountId);
  }

  static findUserIdByProvider(provider: SocialAccountProvider, providerId: string): Promise<string | null> {
    return findUserIdByProvider(provider, providerId);
  }

  static eraseForUser(userId: string): Promise<number> {
    return eraseForUser(userId);
  }

  static batchTokenHealth(userSocialAccountIds: string[]): ReturnType<typeof batchTokenHealth> {
    return batchTokenHealth(userSocialAccountIds);
  }

  static listForTenant(tenantId: string): Promise<SafeUserSocialAccount[]> {
    return listForTenant(tenantId);
  }
}
