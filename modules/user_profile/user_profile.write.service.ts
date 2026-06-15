import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import { UserProfile, UserProfileSchema } from './user_profile.types';
import { VerificationStatus } from './user_profile.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserProfileMessages from './user_profile.messages';
import { clearCache, sanitize, toEntityPatch } from './user_profile.helpers';

export async function create(userId: string, data?: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserProfileEntity);
  const existing = await repo.findOne({ where: { userId } });
  if (existing) throw new AppError(UserProfileMessages.PROFILE_EXISTS, 409, ErrorCode.CONFLICT);

  const clean = await sanitize(data ?? {}, tenantId);
  const profile = repo.create({ userId, ...toEntityPatch(clean) });
  const saved = await repo.save(profile);
  await clearCache(userId);
  return UserProfileSchema.parse(saved);
}

export async function update(userId: string, data: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserProfileEntity);
  const profile = await repo.findOne({ where: { userId } });
  if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const clean = await sanitize(data, tenantId);
  Object.assign(profile, toEntityPatch(clean));
  const saved = await repo.save(profile);
  await clearCache(userId);
  return UserProfileSchema.parse(saved);
}

export async function upsert(userId: string, data: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserProfileEntity);
  const existing = await repo.findOne({ where: { userId } });
  if (existing) return update(userId, data, tenantId);
  return create(userId, data, tenantId);
}

export async function setVerification(userId: string, status: VerificationStatus): Promise<UserProfile> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserProfileEntity);
  const profile = await repo.findOne({ where: { userId } });
  if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  profile.verificationStatus = status;
  profile.isVerified = status === 'VERIFIED';
  const saved = await repo.save(profile);
  await clearCache(userId);
  return UserProfileSchema.parse(saved);
}

/**
 * GDPR Art. 17 anonymization: replace PII with placeholders and keep the row
 * (so other modules' `userId` references don't dangle), instead of a hard
 * delete. Idempotent — re-anonymizing a row is a no-op write.
 */
export async function anonymize(userId: string): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserProfileEntity);
  const profile = await repo.findOne({ where: { userId } });
  if (!profile) return;
  Object.assign(profile, {
    name: '[deleted]', firstName: null, lastName: null, displayName: '[deleted]',
    pronouns: null, biography: null, profilePicture: null, headerImage: null,
    socialLinks: [], customFields: {}, visibility: 'PRIVATE',
    isVerified: false, verificationStatus: 'UNVERIFIED', anonymizedAt: new Date(),
  });
  await repo.save(profile);
  await clearCache(userId);
}

export async function remove(userId: string): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserProfileEntity);
  const profile = await repo.findOne({ where: { userId } });
  if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.delete({ userId });
  await clearCache(userId);
}
