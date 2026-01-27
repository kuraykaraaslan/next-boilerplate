import type { SSOProvider } from './auth_sso.enums';
import type { SSOProfile, SSOTokens } from './auth_sso.types';
import { getProvider } from './providers';
import { getAllowedProviders, isProviderConfigured } from './auth_sso.config';
import SSOMessages from './auth_sso.messages';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import UserService from '../user/user.service';
import type { SafeUser } from '../user/user.types';

export default class SSOService {

  static getAllowedProviders(): SSOProvider[] {
    return getAllowedProviders();
  }

  static generateAuthUrl(provider: SSOProvider, state?: string): string {
    if (!isProviderConfigured(provider)) {
      throw new Error(SSOMessages.PROVIDER_NOT_CONFIGURED);
    }

    const providerService = getProvider(provider);
    return providerService.generateAuthUrl(state);
  }

  static isProviderEnabled(provider: string): boolean {
    const allowedProviders = this.getAllowedProviders();
    return allowedProviders.includes(provider as SSOProvider);
  }

  static async handleCallback(provider: SSOProvider, code: string): Promise<{
    profile: SSOProfile;
    tokens: SSOTokens;
  }> {
    if (!code) {
      throw new Error(SSOMessages.CODE_NOT_FOUND);
    }

    if (!isProviderConfigured(provider)) {
      throw new Error(SSOMessages.PROVIDER_NOT_CONFIGURED);
    }

    const providerService = getProvider(provider);

    const tokens = await providerService.getTokens(code);
    const profile = await providerService.getUserInfo(tokens.accessToken);

    return { profile, tokens };
  }

  static async authenticateOrRegister(
    provider: SSOProvider,
    code: string
  ): Promise<{ user: SafeUser; isNewUser: boolean }> {
    const { profile, tokens } = await this.handleCallback(provider, code);

    if (!profile.email) {
      throw new Error(SSOMessages.EMAIL_NOT_FOUND);
    }

    // Check if social account exists
    const existingUserId = await UserSocialAccountService.findUserIdByProvider(
      provider,
      profile.sub
    );

    if (existingUserId) {
      // Update tokens and return existing user
      const accounts = await UserSocialAccountService.getByUserId(existingUserId);
      const account = accounts.find(a => a.provider === provider);

      if (account) {
        await UserSocialAccountService.updateTokens(
          account.userSocialAccountId,
          tokens.accessToken,
          tokens.refreshToken ? tokens.refreshToken : undefined
        );
      }

      const user = await UserService.getById(existingUserId);
      return { user, isNewUser: false };
    }

    // Check if user with email exists
    const existingUser = await UserService.getByEmail(profile.email);

    if (existingUser) {
      // Link social account to existing user
      await UserSocialAccountService.link(
        existingUser.userId,
        provider,
        profile.sub,
        tokens.accessToken,
      );

      const user = await UserService.getById(existingUser.userId);
      return { user, isNewUser: false };
    }

    // Create new user
    const randomPassword = `${profile.sub}_${Date.now()}_${Math.random().toString(36)}`;

    const newUser = await UserService.create({
      email: profile.email,
      password: randomPassword,
      //name: profile.name || profile.email.split('@')[0]
    });

    // Link social account
    await UserSocialAccountService.link(
      newUser.userId,
      provider,
      profile.sub,
      tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined
    );

    return { user: newUser, isNewUser: true };
  }

  static async linkAccount(
    userId: string,
    provider: SSOProvider,
    code: string
  ): Promise<void> {
    const { profile, tokens } = await this.handleCallback(provider, code);

    await UserSocialAccountService.link(
      userId,
      provider,
      profile.sub,
      tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined
    );
  }

  static async unlinkAccount(userId: string, provider: SSOProvider): Promise<void> {
    await UserSocialAccountService.unlink(userId, provider);
  }

  static async getLinkedAccounts(userId: string) {
    return UserSocialAccountService.getByUserId(userId);
  }
}
