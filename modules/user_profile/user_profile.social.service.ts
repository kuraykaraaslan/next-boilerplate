import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import { UserProfile, UserProfileSchema, SocialLinkItem, SocialLinkItemSchema } from './user_profile.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserProfileMessages from './user_profile.messages';
import { clearCache } from './user_profile.helpers';

export async function addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
  const validated = SocialLinkItemSchema.parse(link);
  const ds = await getDataSource();
  const saved = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    profile.socialLinks = [...(profile.socialLinks as SocialLinkItem[]), validated];
    return repo.save(profile);
  });
  await clearCache(userId);
  return UserProfileSchema.parse(saved);
}

export async function removeSocialLink(userId: string, linkId: string): Promise<UserProfile> {
  const ds = await getDataSource();
  const saved = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    profile.socialLinks = (profile.socialLinks as SocialLinkItem[]).filter((l) => l.id !== linkId);
    return repo.save(profile);
  });
  await clearCache(userId);
  return UserProfileSchema.parse(saved);
}

export async function updateSocialLink(userId: string, linkId: string, data: Partial<SocialLinkItem>): Promise<UserProfile> {
  const ds = await getDataSource();
  const saved = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    profile.socialLinks = (profile.socialLinks as SocialLinkItem[]).map((l) =>
      l.id === linkId ? SocialLinkItemSchema.parse({ ...l, ...data }) : l
    );
    return repo.save(profile);
  });
  await clearCache(userId);
  return UserProfileSchema.parse(saved);
}
