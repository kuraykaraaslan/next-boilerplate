import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import { UserPreferences as UserPreferencesEntity } from './entities/user_preferences.entity';
import {
  UserPreferences,
  UserPreferencesDefault,
  UserPreferencesSchema,
  PREFERENCES_SCHEMA_VERSION,
  TenantPreferenceDefaults,
} from './user_preferences.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserPreferencesMessages from './user_preferences.messages';

const USER_PREFERENCES_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

// Notification channels that can be disabled tenant-wide (a tenant without SMS
// infrastructure shouldn't expose live SMS toggles).
const CHANNEL_FIELDS: Record<string, keyof UserPreferences> = {
  email: 'emailNotifications',
  sms: 'smsNotifications',
  push: 'pushNotifications',
};

// Marketing-consent fields tracked for GDPR consent-evidence timestamps.
const MARKETING_FIELDS: (keyof UserPreferences)[] = ['productUpdates', 'promotionalOffers'];

export default class UserPreferencesService {

  private static async clearCache(userId: string): Promise<void> {
    await redis.del(`user_preferences:user:${userId}`).catch(() => {});
  }

  /**
   * Read a tenant's configured preference defaults from settings. A Japanese
   * tenant can default new users to `ja` / `Asia/Tokyo` / `JPY` instead of the
   * global `en` / `UTC` / `USD`.
   */
  static async getTenantDefaults(tenantId: string): Promise<TenantPreferenceDefaults> {
    try {
      const s = await SettingService.getByKeys(tenantId, [
        'defaultLanguage', 'defaultTimezone', 'defaultCurrency',
        'defaultTheme', 'defaultNumberFormat', 'defaultMeasurementSystem',
      ]);
      const out: Record<string, unknown> = {
        language: s.defaultLanguage || undefined,
        timezone: s.defaultTimezone || undefined,
        currency: s.defaultCurrency || undefined,
        theme: s.defaultTheme || undefined,
        numberFormat: s.defaultNumberFormat || undefined,
        measurementSystem: s.defaultMeasurementSystem || undefined,
      };
      // Validate against the schema; drop any invalid configured default rather
      // than letting a bad setting poison a new user's row.
      const parsed = UserPreferencesSchema.partial().safeParse(out);
      return parsed.success ? (parsed.data as TenantPreferenceDefaults) : {};
    } catch {
      return {};
    }
  }

  /**
   * Force-disable any notification channels the tenant has turned off platform-
   * wide (setting `disabledNotificationChannels`, e.g. `sms,push`). Returns a
   * shallow copy with restricted channels coerced to `false`.
   */
  static async applyChannelRestrictions(
    tenantId: string,
    data: Partial<UserPreferences>,
  ): Promise<Partial<UserPreferences>> {
    try {
      const s = await SettingService.getByKeys(tenantId, ['disabledNotificationChannels']);
      const disabled = (s.disabledNotificationChannels ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
      if (disabled.length === 0) return data;
      const out = { ...data };
      for (const ch of disabled) {
        const field = CHANNEL_FIELDS[ch];
        if (field) (out as Record<string, unknown>)[field] = false;
      }
      return out;
    } catch {
      return data;
    }
  }

  /**
   * Stamp consent-evidence timestamps when a marketing-related field is granted
   * in this update. Only sets a timestamp when the value transitions to `true`.
   */
  private static stampConsent(data: Partial<UserPreferences>): Partial<UserPreferences> {
    const now = new Date();
    const out = { ...data };
    if (data.newsletter === true) out.newsletterConsentAt = now;
    if (MARKETING_FIELDS.some((f) => data[f] === true)) out.marketingConsentAt = now;
    return out;
  }

  /** Migrate a stale row forward (fill new-field defaults, bump version). */
  private static async migrateIfStale(entity: UserPreferencesEntity): Promise<UserPreferences> {
    const parsed = UserPreferencesSchema.parse(entity);
    if ((entity.schemaVersion ?? 1) < PREFERENCES_SCHEMA_VERSION) {
      const ds = await getDataSource();
      const repo = ds.getRepository(UserPreferencesEntity);
      Object.assign(entity, parsed, { schemaVersion: PREFERENCES_SCHEMA_VERSION });
      await repo.save(entity).catch((e: unknown) =>
        Logger.warn(`[user_preferences] schema migrate failed: ${e instanceof Error ? e.message : e}`));
    }
    return parsed;
  }

  static async getByUserId(userId: string): Promise<UserPreferences | null> {
    const cacheKey = `user_preferences:user:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Ignore cache entries written under an older schema version.
        if (parsed === null) return null;
        if (parsed?.schemaVersion === PREFERENCES_SCHEMA_VERSION) return UserPreferencesSchema.parse(parsed);
        await redis.del(cacheKey).catch(() => {});
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const prefs = await ds.getRepository(UserPreferencesEntity).findOne({ where: { userId } });
      const result = prefs ? await this.migrateIfStale(prefs) : null;
      await redis.setex(cacheKey, jitter(USER_PREFERENCES_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  static async create(userId: string, data?: Partial<UserPreferences>, tenantId?: string): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new AppError(UserPreferencesMessages.PREFERENCES_ALREADY_EXIST, 409, ErrorCode.CONFLICT);

    // Layer: global defaults ← tenant defaults ← explicit data.
    const tenantDefaults = tenantId ? await this.getTenantDefaults(tenantId) : {};
    const merged = { ...UserPreferencesDefault, ...tenantDefaults, ...data };
    const prefs = repo.create({ userId, ...merged, schemaVersion: PREFERENCES_SCHEMA_VERSION });
    const saved = await repo.save(prefs);
    await this.clearCache(userId);
    return UserPreferencesSchema.parse(saved);
  }

  static async update(
    userId: string,
    data: Partial<UserPreferences>,
    opts?: { tenantId?: string; actorId?: string },
  ): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const prefs = await repo.findOne({ where: { userId } });
    if (!prefs) throw new AppError(UserPreferencesMessages.PREFERENCES_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const before = UserPreferencesSchema.parse(prefs);
    let patch = data;
    if (opts?.tenantId) patch = await this.applyChannelRestrictions(opts.tenantId, patch);
    patch = this.stampConsent(patch);

    const validated = UserPreferencesSchema.partial().parse(patch);
    Object.assign(prefs, validated, { schemaVersion: PREFERENCES_SCHEMA_VERSION });
    const saved = await repo.save(prefs);
    await this.clearCache(userId);

    const after = UserPreferencesSchema.parse(saved);
    await this.auditChange(userId, before, after, opts);
    return after;
  }

  /** Emit a change-history audit entry capturing only the changed fields. */
  private static async auditChange(
    userId: string,
    before: UserPreferences,
    after: UserPreferences,
    opts?: { tenantId?: string; actorId?: string },
  ): Promise<void> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(after) as (keyof UserPreferences)[]) {
      const a = before[key] instanceof Date ? (before[key] as Date)?.toISOString() : before[key];
      const b = after[key] instanceof Date ? (after[key] as Date)?.toISOString() : after[key];
      if (a !== b) changes[key] = { from: a, to: b };
    }
    if (Object.keys(changes).length === 0) return;
    await AuditLogService.log({
      tenantId: opts?.tenantId ?? null,
      actorId: opts?.actorId ?? userId,
      actorType: 'USER',
      action: 'user_preferences.updated',
      severity: 'low',
      resourceType: 'user_preferences',
      resourceId: userId,
      metadata: { changes },
    }).catch((e: unknown) => Logger.warn(`[user_preferences] audit failed: ${e instanceof Error ? e.message : e}`));
  }

  static async upsert(userId: string, data: Partial<UserPreferences>, tenantId?: string): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      return this.update(userId, data, { tenantId });
    }
    return this.create(userId, data, tenantId);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const prefs = await repo.findOne({ where: { userId } });
    if (!prefs) throw new AppError(UserPreferencesMessages.PREFERENCES_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ userId });
    await this.clearCache(userId);
  }

  static async getOrCreateDefault(userId: string, tenantId?: string): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) return this.migrateIfStale(existing);
    return this.create(userId, undefined, tenantId);
  }
}
