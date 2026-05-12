import 'reflect-metadata';
import { getSystemDataSource } from '@/modules/db';
import { UserSocialAccount as UserSocialAccountEntity } from './entities/user_social_account.entity';
import { SafeUserSocialAccount, SafeUserSocialAccountSchema } from './user_social_account.types';
import UserSocialAccountMessages from './user_social_account.messages';
import type { SocialAccountProvider } from './user_social_account.enums';

export default class UserSocialAccountService {

  static async getByUserId(userId: string): Promise<SafeUserSocialAccount[]> {
    const ds = await getSystemDataSource();
    const accounts = await ds.getRepository(UserSocialAccountEntity).find({ where: { userId } });
    return accounts.map((a) => SafeUserSocialAccountSchema.parse(a));
  }

  static async getByProviderAndProviderId(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<SafeUserSocialAccount | null> {
    const ds = await getSystemDataSource();
    const account = await ds.getRepository(UserSocialAccountEntity).findOne({
      where: { provider, providerId },
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
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSocialAccountEntity);
    const existing = await repo.findOne({ where: { provider, providerId } });

    if (existing && existing.userId !== userId) {
      throw new Error(UserSocialAccountMessages.ACCOUNT_ALREADY_LINKED);
    }

    if (existing) {
      await repo.update({ userSocialAccountId: existing.userSocialAccountId }, {
        accessToken, refreshToken, profilePicture,
      });
      const updated = await repo.findOne({ where: { userSocialAccountId: existing.userSocialAccountId } });
      return SafeUserSocialAccountSchema.parse(updated!);
    }

    const account = repo.create({ userId, provider, providerId, accessToken, refreshToken, profilePicture });
    const saved = await repo.save(account);
    return SafeUserSocialAccountSchema.parse(saved);
  }

  static async updateTokens(
    userSocialAccountId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    const ds = await getSystemDataSource();
    await ds.getRepository(UserSocialAccountEntity).update(
      { userSocialAccountId },
      { accessToken, refreshToken }
    );
  }

  static async unlink(userId: string, provider: SocialAccountProvider): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSocialAccountEntity);
    const account = await repo.findOne({ where: { userId, provider } });
    if (!account) throw new Error(UserSocialAccountMessages.ACCOUNT_NOT_FOUND);
    await repo.delete({ userSocialAccountId: account.userSocialAccountId });
  }

  static async findUserIdByProvider(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<string | null> {
    const ds = await getSystemDataSource();
    const account = await ds.getRepository(UserSocialAccountEntity).findOne({
      where: { provider, providerId },
    });
    return account?.userId ?? null;
  }
}
