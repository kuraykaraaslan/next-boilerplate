import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import { UserProfile, UserProfileSchema, SocialLinkItem } from './user_profile.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserProfileMessages from './user_profile.messages';

const USER_PROFILE_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

export default class UserProfileService {

  private static async clearCache(userId: string): Promise<void> {
    await redis.del(`user_profile:user:${userId}`).catch(() => {});
  }

  static async getByUserId(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user_profile:user:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed === null ? null : UserProfileSchema.parse(parsed);
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const profile = await ds.getRepository(UserProfileEntity).findOne({ where: { userId } });
      const result = profile ? UserProfileSchema.parse(profile) : null;
      await redis.setex(cacheKey, jitter(USER_PROFILE_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  static async create(userId: string, data?: Partial<UserProfile>): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new AppError(UserProfileMessages.PROFILE_EXISTS, 409, ErrorCode.CONFLICT);

    const profile = repo.create({
      userId,
      name: data?.name ?? undefined,
      biography: data?.biography ?? undefined,
      profilePicture: data?.profilePicture ?? undefined,
      headerImage: data?.headerImage ?? undefined,
      socialLinks: data?.socialLinks ?? [],
    });
    const saved = await repo.save(profile);
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  static async update(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    Object.assign(profile, {
      name: data.name || undefined,
      biography: data.biography || undefined,
      profilePicture: data.profilePicture || undefined,
      headerImage: data.headerImage || undefined,
      socialLinks: data.socialLinks,
    });
    const saved = await repo.save(profile);
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  static async upsert(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      Object.assign(existing, {
        name: data.name || undefined,
        biography: data.biography || undefined,
        profilePicture: data.profilePicture || undefined,
        headerImage: data.headerImage || undefined,
        socialLinks: data.socialLinks,
      });
      const saved = await repo.save(existing);
      await this.clearCache(userId);
      return UserProfileSchema.parse(saved);
    }

    return this.create(userId, data);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ userId });
    await this.clearCache(userId);
  }

  static async addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    const ds = await getDataSource();
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(UserProfileEntity);
      const profile = await repo.findOne({ where: { userId } });
      if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      profile.socialLinks = [...(profile.socialLinks as SocialLinkItem[]), link];
      return repo.save(profile);
    });
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  static async removeSocialLink(userId: string, linkId: string): Promise<UserProfile> {
    const ds = await getDataSource();
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(UserProfileEntity);
      const profile = await repo.findOne({ where: { userId } });
      if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      profile.socialLinks = (profile.socialLinks as SocialLinkItem[]).filter((l) => l.id !== linkId);
      return repo.save(profile);
    });
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  static async updateSocialLink(userId: string, linkId: string, data: Partial<SocialLinkItem>): Promise<UserProfile> {
    const ds = await getDataSource();
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(UserProfileEntity);
      const profile = await repo.findOne({ where: { userId } });
      if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      profile.socialLinks = (profile.socialLinks as SocialLinkItem[]).map((l) =>
        l.id === linkId ? { ...l, ...data } : l
      );
      return repo.save(profile);
    });
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }
}
