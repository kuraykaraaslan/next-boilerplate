import redis from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import {
  UserProfile,
  SocialLinkItem,
  SocialLinkItemSchema,
} from './user_profile.types';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import UserProfileMessages from './user_profile.messages';

export const USER_PROFILE_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

// Globally reserved display names — never usable regardless of tenant config.
const RESERVED_DEFAULTS = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'staff',
  'moderator', 'mod', 'owner', 'superuser', 'security', 'billing', 'official',
  'null', 'undefined', 'anonymous', 'me', 'everyone', 'all',
]);

// Fields that count toward the completeness score (default weighting).
export const COMPLETENESS_FIELDS: (keyof UserProfile)[] = [
  'displayName', 'firstName', 'lastName', 'biography', 'profilePicture', 'pronouns',
];

export async function clearCache(userId: string): Promise<void> {
  await redis.del(`user_profile:user:${userId}`).catch(() => {});
}

// Lenient array-of-social-links validation used by partial updates.
function zArraySafe(value: unknown): { ok: true; value: SocialLinkItem[] } | { ok: false } {
  const result = SocialLinkItemSchema.array().safeParse(value);
  return result.success ? { ok: true, value: result.data } : { ok: false };
}

/** Reject reserved / blocked display names (global + per-tenant blocklist). */
export async function assertNameAllowed(name: string | null | undefined, tenantId?: string): Promise<void> {
  if (!name) return;
  const norm = name.trim().toLowerCase();
  if (RESERVED_DEFAULTS.has(norm)) {
    throw new AppError(UserProfileMessages.RESERVED_DISPLAY_NAME, 422, ErrorCode.VALIDATION_ERROR);
  }
  if (tenantId) {
    try {
      const s = await SettingService.getByKeys(tenantId, ['reservedDisplayNames']);
      const reserved = (s.reservedDisplayNames ?? '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
      if (reserved.includes(norm)) {
        throw new AppError(UserProfileMessages.RESERVED_DISPLAY_NAME, 422, ErrorCode.VALIDATION_ERROR);
      }
    } catch (e) {
      if (e instanceof AppError) throw e; // honour a real block; ignore settings read errors
    }
  }
}

/** Re-validate every social link item (URL + shape) before persistence. */
export function validateSocialLinks(links: unknown): SocialLinkItem[] | undefined {
  if (links === undefined) return undefined;
  const parsed = zArraySafe(links);
  if (!parsed.ok) throw new AppError(UserProfileMessages.INVALID_SOCIAL_LINK_URL, 422, ErrorCode.VALIDATION_ERROR);
  return parsed.value;
}

/** Restrict custom fields to the tenant's configured allowlist (if any). */
export async function filterCustomFields(
  tenantId: string | undefined,
  customFields: Record<string, unknown> | undefined,
): Promise<Record<string, unknown> | undefined> {
  if (!customFields || !tenantId) return customFields;
  try {
    const s = await SettingService.getByKeys(tenantId, ['profileCustomFields']);
    const allowed = (s.profileCustomFields ?? '').split(',').map((k) => k.trim()).filter(Boolean);
    if (allowed.length === 0) return customFields; // no allowlist configured
    const unknownKeys = Object.keys(customFields).filter((k) => !allowed.includes(k));
    if (unknownKeys.length > 0) {
      throw new AppError(UserProfileMessages.CUSTOM_FIELD_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR);
    }
    return customFields;
  } catch (e) {
    if (e instanceof AppError) throw e;
    return customFields;
  }
}

/** Compose a fallback `name` from structured fields when not explicitly set. */
function composeName(p: Partial<UserProfile>): string | undefined {
  if (p.name) return p.name;
  if (p.displayName) return p.displayName;
  if (p.firstName || p.lastName) {
    const parts = p.nameOrder === 'FAMILY_FIRST' ? [p.lastName, p.firstName] : [p.firstName, p.lastName];
    const joined = parts.filter(Boolean).join(' ').trim();
    return joined || undefined;
  }
  return undefined;
}

export async function sanitize(data: Partial<UserProfile>, tenantId?: string): Promise<Partial<UserProfile>> {
  await assertNameAllowed(data.displayName ?? data.name, tenantId);
  const socialLinks = validateSocialLinks(data.socialLinks);
  const customFields = await filterCustomFields(tenantId, data.customFields);
  const out: Partial<UserProfile> = { ...data };
  if (socialLinks !== undefined) out.socialLinks = socialLinks;
  if (customFields !== undefined) out.customFields = customFields;
  const name = composeName(data);
  if (name !== undefined) out.name = name;
  return out;
}

/** Map a validated partial onto entity columns, dropping undefined keys. */
export function toEntityPatch(clean: Partial<UserProfile>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(clean)) {
    if (v !== undefined) patch[k] = v;
  }
  return patch;
}
