import 'reflect-metadata';
import { getDataSource } from '@kuraykaraaslan/db';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import { UserProfile, UserProfileSchema } from './user_profile.types';
import { ProfileVisibility } from './user_profile.enums';
import { USER_PROFILE_CACHE_TTL, COMPLETENESS_FIELDS } from './user_profile.helpers';

export async function getByUserId(userId: string): Promise<UserProfile | null> {
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

/**
 * Public-facing projection of a profile honouring visibility controls. Fields
 * marked PRIVATE are dropped; TENANT-scoped fields are dropped unless the
 * viewer is in the same tenant. An overall PRIVATE profile returns only the
 * display identity.
 */
export function toPublicView(profile: UserProfile, opts?: { sameTenant?: boolean }): Partial<UserProfile> {
  const sameTenant = opts?.sameTenant === true;
  const visibleTo = (v: ProfileVisibility): boolean =>
    v === 'PUBLIC' || (v === 'TENANT' && sameTenant);

  if (!visibleTo(profile.visibility)) {
    return { displayName: profile.displayName ?? profile.name, isVerified: profile.isVerified, visibility: profile.visibility };
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(profile)) {
    const fieldVis = profile.fieldVisibility?.[key] as ProfileVisibility | undefined;
    if (fieldVis && !visibleTo(fieldVis)) continue;
    out[key] = value;
  }
  return out as Partial<UserProfile>;
}

/** Compute a 0–100 completeness score over the weighted profile fields. */
export function completenessScore(profile: UserProfile, requiredFields?: (keyof UserProfile)[]): number {
  const fields = requiredFields && requiredFields.length > 0 ? requiredFields : COMPLETENESS_FIELDS;
  let filled = 0;
  for (const f of fields) {
    const v = profile[f];
    if (v !== null && v !== undefined && v !== '') filled++;
  }
  return Math.round((filled / fields.length) * 100);
}

export async function getCompleteness(userId: string, requiredFields?: (keyof UserProfile)[]): Promise<number> {
  const profile = await getByUserId(userId);
  if (!profile) return 0;
  return completenessScore(profile, requiredFields);
}
