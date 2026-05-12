import 'reflect-metadata';
import { getSystemDataSource } from '@/modules/db';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import { UserProfile, UserProfileSchema, SocialLinkItem } from './user_profile.types';

export default class UserProfileService {

  static async getByUserId(userId: string): Promise<UserProfile | null> {
    const ds = await getSystemDataSource();
    const profile = await ds.getRepository(UserProfileEntity).findOne({ where: { userId } });
    return profile ? UserProfileSchema.parse(profile) : null;
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
  }

  static async addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    const socialLinks = [...(profile.socialLinks as SocialLinkItem[]), link];
    await repo.update({ userId }, { socialLinks });
    const updated = await repo.findOne({ where: { userId } });
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
    return UserProfileSchema.parse(updated!);
  }
}
