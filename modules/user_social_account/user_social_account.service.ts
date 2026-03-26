import { systemPrisma } from "@/libs/prisma";
import { SafeUserSocialAccount, SafeUserSocialAccountSchema } from "./user_social_account.types";
import UserSocialAccountMessages from "./user_social_account.messages";
import type { SocialAccountProvider } from "./user_social_account.enums";

export default class UserSocialAccountService {

  static async getByUserId(userId: string): Promise<SafeUserSocialAccount[]> {
    const accounts = await systemPrisma.userSocialAccount.findMany({
      where: { userId }
    });

    return accounts.map(account => SafeUserSocialAccountSchema.parse(account));
  }

  static async getByProviderAndProviderId(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<SafeUserSocialAccount | null> {
    const account = await systemPrisma.userSocialAccount.findUnique({
      where: { provider_providerId: { provider, providerId } }
    });

    return account ? SafeUserSocialAccountSchema.parse(account) : null;
  }

  static async link(
    userId: string,
    provider: SocialAccountProvider,
    providerId: string,
    accessToken?: string,
    refreshToken?: string,
    profilePicture?: string
  ): Promise<SafeUserSocialAccount> {
    const existing = await systemPrisma.userSocialAccount.findUnique({
      where: { provider_providerId: { provider, providerId } }
    });

    if (existing && existing.userId !== userId) {
      throw new Error(UserSocialAccountMessages.ACCOUNT_ALREADY_LINKED);
    }

    if (existing) {
      const updated = await systemPrisma.userSocialAccount.update({
        where: { userSocialAccountId: existing.userSocialAccountId },
        data: { accessToken, refreshToken, profilePicture }
      });

      return SafeUserSocialAccountSchema.parse(updated);
    }

    const account = await systemPrisma.userSocialAccount.create({
      data: {
        userId,
        provider,
        providerId,
        accessToken,
        refreshToken,
        profilePicture
      }
    });

    return SafeUserSocialAccountSchema.parse(account);
  }

  static async updateTokens(
    userSocialAccountId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    await systemPrisma.userSocialAccount.update({
      where: { userSocialAccountId },
      data: { accessToken, refreshToken }
    });
  }

  static async unlink(userId: string, provider: SocialAccountProvider): Promise<void> {
    const account = await systemPrisma.userSocialAccount.findFirst({
      where: { userId, provider }
    });

    if (!account) {
      throw new Error(UserSocialAccountMessages.ACCOUNT_NOT_FOUND);
    }

    await systemPrisma.userSocialAccount.delete({
      where: { userSocialAccountId: account.userSocialAccountId }
    });
  }

  static async findUserIdByProvider(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<string | null> {
    const account = await systemPrisma.userSocialAccount.findUnique({
      where: { provider_providerId: { provider, providerId } }
    });

    return account?.userId ?? null;
  }
}
