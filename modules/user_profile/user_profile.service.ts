import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import StorageService from '@/modules/storage/storage.service';
import SettingService from '@/modules/setting/setting.service';
import { UserProfile as UserProfileEntity } from './entities/user_profile.entity';
import {
  UserProfile,
  UserProfileSchema,
  SocialLinkItem,
  SocialLinkItemSchema,
} from './user_profile.types';
import { ProfileVisibility, VerificationStatus } from './user_profile.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserProfileMessages from './user_profile.messages';

const USER_PROFILE_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

// Globally reserved display names — never usable regardless of tenant config.
const RESERVED_DEFAULTS = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'staff',
  'moderator', 'mod', 'owner', 'superuser', 'security', 'billing', 'official',
  'null', 'undefined', 'anonymous', 'me', 'everyone', 'all',
]);

// Fields that count toward the completeness score (default weighting).
const COMPLETENESS_FIELDS: (keyof UserProfile)[] = [
  'displayName', 'firstName', 'lastName', 'biography', 'profilePicture', 'pronouns',
];

export default class UserProfileService {

  private static async clearCache(userId: string): Promise<void> {
    await redis.del(`user_profile:user:${userId}`).catch(() => {});
  }

  // ── Validation helpers ─────────────────────────────────────────────────────

  /** Reject reserved / blocked display names (global + per-tenant blocklist). */
  static async assertNameAllowed(name: string | null | undefined, tenantId?: string): Promise<void> {
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
  static validateSocialLinks(links: unknown): SocialLinkItem[] | undefined {
    if (links === undefined) return undefined;
    const parsed = z_array_safe(links);
    if (!parsed.ok) throw new AppError(UserProfileMessages.INVALID_SOCIAL_LINK_URL, 422, ErrorCode.VALIDATION_ERROR);
    return parsed.value;
  }

  /** Restrict custom fields to the tenant's configured allowlist (if any). */
  static async filterCustomFields(
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

  // ── Reads ──────────────────────────────────────────────────────────────────

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

  /**
   * Public-facing projection of a profile honouring visibility controls. Fields
   * marked PRIVATE are dropped; TENANT-scoped fields are dropped unless the
   * viewer is in the same tenant. An overall PRIVATE profile returns only the
   * display identity.
   */
  static toPublicView(profile: UserProfile, opts?: { sameTenant?: boolean }): Partial<UserProfile> {
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
  static completenessScore(profile: UserProfile, requiredFields?: (keyof UserProfile)[]): number {
    const fields = requiredFields && requiredFields.length > 0 ? requiredFields : COMPLETENESS_FIELDS;
    let filled = 0;
    for (const f of fields) {
      const v = profile[f];
      if (v !== null && v !== undefined && v !== '') filled++;
    }
    return Math.round((filled / fields.length) * 100);
  }

  static async getCompleteness(userId: string, requiredFields?: (keyof UserProfile)[]): Promise<number> {
    const profile = await this.getByUserId(userId);
    if (!profile) return 0;
    return this.completenessScore(profile, requiredFields);
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /** Compose a fallback `name` from structured fields when not explicitly set. */
  private static composeName(p: Partial<UserProfile>): string | undefined {
    if (p.name) return p.name;
    if (p.displayName) return p.displayName;
    if (p.firstName || p.lastName) {
      const parts = p.nameOrder === 'FAMILY_FIRST' ? [p.lastName, p.firstName] : [p.firstName, p.lastName];
      const joined = parts.filter(Boolean).join(' ').trim();
      return joined || undefined;
    }
    return undefined;
  }

  private static async sanitize(data: Partial<UserProfile>, tenantId?: string): Promise<Partial<UserProfile>> {
    await this.assertNameAllowed(data.displayName ?? data.name, tenantId);
    const socialLinks = this.validateSocialLinks(data.socialLinks);
    const customFields = await this.filterCustomFields(tenantId, data.customFields);
    const out: Partial<UserProfile> = { ...data };
    if (socialLinks !== undefined) out.socialLinks = socialLinks;
    if (customFields !== undefined) out.customFields = customFields;
    const name = this.composeName(data);
    if (name !== undefined) out.name = name;
    return out;
  }

  static async create(userId: string, data?: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new AppError(UserProfileMessages.PROFILE_EXISTS, 409, ErrorCode.CONFLICT);

    const clean = await this.sanitize(data ?? {}, tenantId);
    const profile = repo.create({ userId, ...this.toEntityPatch(clean) });
    const saved = await repo.save(profile);
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  static async update(userId: string, data: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const clean = await this.sanitize(data, tenantId);
    Object.assign(profile, this.toEntityPatch(clean));
    const saved = await repo.save(profile);
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  static async upsert(userId: string, data: Partial<UserProfile>, tenantId?: string): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) return this.update(userId, data, tenantId);
    return this.create(userId, data, tenantId);
  }

  /** Map a validated partial onto entity columns, dropping undefined keys. */
  private static toEntityPatch(clean: Partial<UserProfile>): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(clean)) {
      if (v !== undefined) patch[k] = v;
    }
    return patch;
  }

  // ── Avatar / header image via managed storage ──────────────────────────────

  /**
   * Upload an avatar through the tenant's configured storage (S3) and set it as
   * the profile picture. Replaces hot-linking to arbitrary external URLs with a
   * managed object the platform controls (residency, lifecycle, validation).
   */
  static async uploadAvatar(tenantId: string, userId: string, file: File): Promise<UserProfile> {
    const result = await StorageService.uploadFile(tenantId, { file, folder: `avatars/${userId}` });
    return this.update(userId, { profilePicture: result.url }, tenantId);
  }

  static async uploadHeaderImage(tenantId: string, userId: string, file: File): Promise<UserProfile> {
    const result = await StorageService.uploadFile(tenantId, { file, folder: `headers/${userId}` });
    return this.update(userId, { headerImage: result.url }, tenantId);
  }

  /**
   * Pull an external image URL into the tenant's own bucket and set it as the
   * avatar — protects against third-party hosts going offline / serving
   * malicious content and enforces data residency.
   */
  static async setAvatarFromUrl(tenantId: string, userId: string, url: string): Promise<UserProfile> {
    const result = await StorageService.uploadFromUrl(tenantId, { url, folder: `avatars/${userId}` });
    return this.update(userId, { profilePicture: result.url }, tenantId);
  }

  // ── Verification ───────────────────────────────────────────────────────────

  static async setVerification(userId: string, status: VerificationStatus): Promise<UserProfile> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    profile.verificationStatus = status;
    profile.isVerified = status === 'VERIFIED';
    const saved = await repo.save(profile);
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }

  // ── GDPR ───────────────────────────────────────────────────────────────────

  /**
   * GDPR Art. 17 anonymization: replace PII with placeholders and keep the row
   * (so other modules' `userId` references don't dangle), instead of a hard
   * delete. Idempotent — re-anonymizing a row is a no-op write.
   */
  static async anonymize(userId: string): Promise<void> {
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
    await this.clearCache(userId);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserProfileEntity);
    const profile = await repo.findOne({ where: { userId } });
    if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ userId });
    await this.clearCache(userId);
  }

  // ── Social links ───────────────────────────────────────────────────────────

  static async addSocialLink(userId: string, link: SocialLinkItem): Promise<UserProfile> {
    const validated = SocialLinkItemSchema.parse(link);
    const ds = await getDataSource();
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(UserProfileEntity);
      const profile = await repo.findOne({ where: { userId } });
      if (!profile) throw new AppError(UserProfileMessages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      profile.socialLinks = [...(profile.socialLinks as SocialLinkItem[]), validated];
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
        l.id === linkId ? SocialLinkItemSchema.parse({ ...l, ...data }) : l
      );
      return repo.save(profile);
    });
    await this.clearCache(userId);
    return UserProfileSchema.parse(saved);
  }
}

// Lenient array-of-social-links validation used by partial updates.
function z_array_safe(value: unknown): { ok: true; value: SocialLinkItem[] } | { ok: false } {
  const result = SocialLinkItemSchema.array().safeParse(value);
  return result.success ? { ok: true, value: result.data } : { ok: false };
}
