import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { UserSocialAccount as UserSocialAccountEntity } from './entities/user_social_account.entity';
import { SafeUserSocialAccount, SafeUserSocialAccountSchema } from './user_social_account.types';
import UserSocialAccountMessages from './user_social_account.messages';
import type { SocialAccountProvider } from './user_social_account.enums';

const SOCIAL_ACCOUNT_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

export default class UserSocialAccountService {

  private static async clearCache(opts: { userId?: string; provider?: SocialAccountProvider; providerId?: string }): Promise<void> {
    const ops: Promise<unknown>[] = [];
    if (opts.userId) ops.push(redis.del(`user_social_account:user:${opts.userId}`));
    if (opts.provider && opts.providerId) {
      ops.push(redis.del(`user_social_account:provider:${opts.provider}:${opts.providerId}`));
    }
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static async getByUserId(userId: string): Promise<SafeUserSocialAccount[]> {
    const cacheKey = `user_social_account:user:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached).map((a: unknown) => SafeUserSocialAccountSchema.parse(a)); }
      catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const accounts = await ds.getRepository(UserSocialAccountEntity).find({ where: { userId } });
      const parsed = accounts.map((a) => SafeUserSocialAccountSchema.parse(a));
      await redis.setex(cacheKey, jitter(SOCIAL_ACCOUNT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getByProviderAndProviderId(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<SafeUserSocialAccount | null> {
    const cacheKey = `user_social_account:provider:${provider}:${providerId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed === null ? null : SafeUserSocialAccountSchema.parse(parsed);
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const account = await ds.getRepository(UserSocialAccountEntity).findOne({
        where: { provider, providerId },
      });
      const result = account ? SafeUserSocialAccountSchema.parse(account) : null;
      await redis.setex(cacheKey, jitter(SOCIAL_ACCOUNT_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  static async link(
    userId: string,
    provider: SocialAccountProvider,
    providerId: string,
    accessToken?: string,
    refreshToken?: string,
    profilePicture?: string
  ): Promise<SafeUserSocialAccount> {
    const ds = await getDataSource();
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
      await this.clearCache({ userId, provider, providerId });
      return SafeUserSocialAccountSchema.parse(updated!);
    }

    const account = repo.create({ userId, provider, providerId, accessToken, refreshToken, profilePicture });
    const saved = await repo.save(account);
    await this.clearCache({ userId, provider, providerId });
    return SafeUserSocialAccountSchema.parse(saved);
  }

  static async updateTokens(
    userSocialAccountId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(UserSocialAccountEntity).update(
      { userSocialAccountId },
      { accessToken, refreshToken }
    );
  }

  static async unlink(userId: string, provider: SocialAccountProvider): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSocialAccountEntity);
    const account = await repo.findOne({ where: { userId, provider } });
    if (!account) throw new Error(UserSocialAccountMessages.ACCOUNT_NOT_FOUND);
    await repo.delete({ userSocialAccountId: account.userSocialAccountId });
    await this.clearCache({ userId, provider, providerId: account.providerId });
  }

  static async findUserIdByProvider(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<string | null> {
    const account = await this.getByProviderAndProviderId(provider, providerId);
    return account?.userId ?? null;
  }
}
