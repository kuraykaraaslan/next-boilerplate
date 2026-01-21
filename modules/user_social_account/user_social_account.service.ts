import AppDataSource from "@/libs/typeorm";
import { UserSocialAccountEntity } from "./user_social_account.entity";
import { SafeUserSocialAccount, SafeUserSocialAccountSchema } from "./user_social_account.types";
import UserSocialAccountMessages from "./user_social_account.messages";
import type { SocialAccountProvider } from "./user_social_account.enums";

export default class UserSocialAccountService {

  private static readonly repository = AppDataSource.getRepository(UserSocialAccountEntity);

  static async getByUserId(userId: string): Promise<SafeUserSocialAccount[]> {
    const accounts = await this.repository.find({
      where: { userId }
    });

    return accounts.map(account => SafeUserSocialAccountSchema.parse(account));
  }

  static async getByProviderAndProviderId(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<SafeUserSocialAccount | null> {
    const account = await this.repository.findOne({
      where: { provider, providerId }
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
    const existing = await this.repository.findOne({
      where: { provider, providerId }
    });

    if (existing && existing.userId !== userId) {
      throw new Error(UserSocialAccountMessages.ACCOUNT_ALREADY_LINKED);
    }

    if (existing) {
      await this.repository.update(
        { userSocialAccountId: existing.userSocialAccountId },
        { accessToken, refreshToken, profilePicture }
      );

      const updated = await this.repository.findOne({
        where: { userSocialAccountId: existing.userSocialAccountId }
      });

      return SafeUserSocialAccountSchema.parse(updated);
    }

    const account = this.repository.create({
      userId,
      provider,
      providerId,
      accessToken,
      refreshToken,
      profilePicture
    });

    const saved = await this.repository.save(account);
    return SafeUserSocialAccountSchema.parse(saved);
  }

  static async updateTokens(
    userSocialAccountId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    await this.repository.update(
      { userSocialAccountId },
      { accessToken, refreshToken }
    );
  }

  static async unlink(userId: string, provider: SocialAccountProvider): Promise<void> {
    const account = await this.repository.findOne({
      where: { userId, provider }
    });

    if (!account) {
      throw new Error(UserSocialAccountMessages.ACCOUNT_NOT_FOUND);
    }

    await this.repository.delete({ userSocialAccountId: account.userSocialAccountId });
  }

  static async findUserIdByProvider(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<string | null> {
    const account = await this.repository.findOne({
      where: { provider, providerId }
    });

    return account?.userId ?? null;
  }
}
