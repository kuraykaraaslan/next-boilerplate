import 'reflect-metadata';
import { getSystemDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import { UserProfile, UserProfileSchema, SocialLinkItem } from './user_profile.types';

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
      const ds = await getSystemDataSource();
      const profile = await ds.getRepository(UserProfileEntity).findOne({ where: { userId } });
      const result = profile ? UserProfileSchema.parse(profile) : null;
      await redis.setex(cacheKey, jitter(USER_PROFILE_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  static async create(userId: string, data?: Partial<UserProfile>): Promise<UserProfile> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new Error('Profile already exists for this user');

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
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    await repo.update({ userId }, {
      name: data.name || undefined,
      biography: data.biography || undefined,
      profilePicture: data.profilePicture || undefined,
      headerImage: data.headerImage || undefined,
      socialLinks: data.socialLinks,
    });
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return UserProfileSchema.parse(updated!);
  }

  static async upsert(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      await repo.update({ userId }, {
        name: data.name || undefined,
        biography: data.biography || undefined,
        profilePicture: data.profilePicture || undefined,
        headerImage: data.headerImage || undefined,
        socialLinks: data.socialLinks,
      });
      const updated = await repo.findOne({ where: { userId } });
      await this.clearCache(userId);
      return UserProfileSchema.parse(updated!);
    }

    return this.create(userId, data);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');
    await repo.delete({ userId });
    await this.clearCache(userId);
  }

  static async addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    const socialLinks = [...(profile.socialLinks as SocialLinkItem[]), link];
    await repo.update({ userId }, { socialLinks });
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return UserProfileSchema.parse(updated!);
  }

  static async removeSocialLink(userId: string, linkId: string): Promise<UserProfile> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    const socialLinks = (profile.socialLinks as SocialLinkItem[]).filter((l) => l.id !== linkId);
    await repo.update({ userId }, { socialLinks });
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return UserProfileSchema.parse(updated!);
  }

  static async updateSocialLink(userId: string, linkId: string, data: Partial<SocialLinkItem>): Promise<UserProfile> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    const socialLinks = (profile.socialLinks as SocialLinkItem[]).map((l) =>
      l.id === linkId ? { ...l, ...data } : l
    );
    await repo.update({ userId }, { socialLinks });
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return UserProfileSchema.parse(updated!);
  }
}
