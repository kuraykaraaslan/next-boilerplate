import 'reflect-metadata';
import { ILike, IsNull } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { User as UserEntity } from './entities/user.entity';
import { User, SafeUser, UpdateUser, SafeUserSchema, UserSchema } from './user.types';
import type { UserRole, UserStatus } from './user.enums';
import bcrypt from 'bcrypt';
import UserMessages from './user.messages';
import WebhookService from '@/modules/webhook/webhook.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { randomUUID } from 'node:crypto';

const USER_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);
const NEGATIVE_CACHE_TTL = Math.min(60, USER_CACHE_TTL);
const NEG = '__not_found__';

// ── HaveIBeenPwned k-anonymity check ────────────────────────────────────────
async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const { createHash } = await import('node:crypto');
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.split('\r\n').some((line) => line.startsWith(suffix));
  } catch {
    return false; // fail-open: don't block registration on network error
  }
}

export default class UserService {

  static async invalidate(user: { userId: string; email?: string }): Promise<void> {
    const ops: Promise<unknown>[] = [redis.del(`user:id:${user.userId}`)];
    if (user.email) ops.push(redis.del(`user:email:${user.email.toLowerCase()}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static async create({ email, password, phone, userRole, checkBreached = true }: {
    email: string;
    password: string;
    phone?: string;
    userRole?: UserRole;
    checkBreached?: boolean;
  }): Promise<SafeUser> {
    if (!email) throw new AppError(UserMessages.INVALID_EMAIL, 400, ErrorCode.VALIDATION_ERROR);

    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);

    const existingUser = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) throw new AppError(UserMessages.EMAIL_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);
    if (!password) throw new AppError(UserMessages.INVALID_PASSWORD, 400, ErrorCode.VALIDATION_ERROR);

    // Breach detection (HaveIBeenPwned k-anonymity)
    if (checkBreached && await isPasswordBreached(password)) {
      throw new AppError(
        'This password has appeared in a data breach. Please choose a different password.',
        400,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = repo.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      userRole: userRole ?? 'USER',
      userStatus: 'ACTIVE',
    });
    const saved = await repo.save(user);
    await redis.del(`user:email:${saved.email.toLowerCase()}`).catch(() => {});

    // Audit trail
    await this.emitAuditLog(null, 'user.created', saved.userId, null);

    await WebhookService.dispatchPlatformEvent('user.created', {
      userId: saved.userId,
      email: saved.email,
      userRole: saved.userRole,
    });
    return SafeUserSchema.parse(saved);
  }

  static async getAll({ page, pageSize, search, userId, tenantId, phone }: {
    page: number;
    pageSize: number;
    search?: string;
    userId?: string;
    tenantId?: string;
    phone?: string;
  }): Promise<{ users: SafeUser[]; total: number }> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);

    // Tenant-scoped search: join with tenant_members when tenantId provided
    if (tenantId) {
      const qb = ds.createQueryBuilder(UserEntity, 'u')
        .innerJoin('tenant_members', 'tm', 'tm."userId" = u."userId" AND tm."tenantId" = :tenantId', { tenantId })
        .skip(page * pageSize)
        .take(pageSize)
        .orderBy('u."createdAt"', 'DESC');

      if (search) {
        qb.where('u.email ILIKE :search', { search: `%${search}%` });
      }
      if (phone) {
        qb.andWhere('u.phone ILIKE :phone', { phone: `%${phone}%` });
      }

      const [users, total] = await qb.getManyAndCount();
      return { users: users.map((u) => SafeUserSchema.parse(u)), total };
    }

    const baseWhere: Record<string, unknown> = {};
    if (userId) baseWhere.userId = userId;
    if (phone) baseWhere.phone = ILike(`%${phone}%`);

    let whereConditions: Record<string, unknown>[];
    if (search) {
      whereConditions = [{ ...baseWhere, email: ILike(`%${search}%`) }];
    } else {
      whereConditions = [baseWhere];
    }

    const [users, total] = await Promise.all([
      repo.find({ where: whereConditions as any, skip: page * pageSize, take: pageSize }),
      repo.count({ where: whereConditions as any }),
    ]);

    return { users: users.map((u) => SafeUserSchema.parse(u)), total };
  }

  static async getById(userId: string): Promise<SafeUser> {
    const cacheKey = `user:id:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafeUserSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
      if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      const parsed = SafeUserSchema.parse(user);
      await redis.setex(cacheKey, jitter(USER_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async update({ userId, data }: { userId: string; data: UpdateUser }): Promise<SafeUser> {
    if (!userId) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    await repo.update({ userId }, {
      email: data.email || undefined,
      phone: data.phone || undefined,
      userRole: data.userRole as UserRole | undefined,
      userStatus: data.userStatus as UserStatus | undefined,
    });
    const updated = await repo.findOne({ where: { userId } });

    await this.invalidate({ userId, email: user.email });
    if (updated && updated.email !== user.email) {
      await this.invalidate({ userId, email: updated.email });
    }

    await WebhookService.dispatchPlatformEvent('user.updated', {
      userId,
      email: updated!.email,
      userRole: updated!.userRole,
      userStatus: updated!.userStatus,
    });
    if (updated!.userStatus === 'SUSPENDED' && user.userStatus !== 'SUSPENDED') {
      await WebhookService.dispatchPlatformEvent('user.suspended', {
        userId,
        email: updated!.email,
      });
    }

    return SafeUserSchema.parse(updated!);
  }

  /** Hard delete — used for non-GDPR scenarios. For GDPR use `erase()`. */
  static async delete(userId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ userId });
    await this.invalidate({ userId, email: user.email });
    await WebhookService.dispatchPlatformEvent('user.deleted', { userId, email: user.email });
  }

  /**
   * GDPR Art. 17 Right-to-Erasure: anonymize personal data instead of hard-deleting.
   * Replaces email, phone with an irreversible placeholder; password is zeroed.
   * The user row is kept (soft-delete) for referential integrity in audit logs and invoices.
   */
  static async erase(userId: string, requestedByUserId?: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const anon = `erased-${randomUUID()}@deleted.invalid`;
    await repo.update({ userId }, {
      email: anon,
      phone: null,
      password: 'ERASED',
      userStatus: 'DELETED',
      emailVerifiedAt: null,
      consentVersion: null,
      consentAcceptedAt: null,
      deletedAt: new Date(),
    } as any);

    await this.invalidate({ userId, email: user.email });
    await this.emitAuditLog(null, 'user.erased', userId, requestedByUserId);
    await WebhookService.dispatchPlatformEvent('user.erased', { userId });
  }

  /**
   * Enforce per-tenant password policy on user creation within a tenant context.
   * Reads `passwordMinLength` and `passwordRequireSpecialChar` from tenant settings.
   */
  static async enforcePasswordPolicy(tenantId: string, password: string): Promise<void> {
    try {
      const SettingService = (await import('@/modules/setting/setting.service')).default;
      const settings = await SettingService.getByKeys(tenantId, ['passwordMinLength', 'passwordRequireSpecialChar', 'passwordRequireUppercase']);

      const minLen = parseInt(settings.passwordMinLength ?? '8', 10);
      if (password.length < minLen) {
        throw new AppError(`Password must be at least ${minLen} characters long.`, 400, ErrorCode.VALIDATION_ERROR);
      }
      if (settings.passwordRequireSpecialChar === 'true' && !/[^a-zA-Z0-9]/.test(password)) {
        throw new AppError('Password must contain at least one special character.', 400, ErrorCode.VALIDATION_ERROR);
      }
      if (settings.passwordRequireUppercase === 'true' && !/[A-Z]/.test(password)) {
        throw new AppError('Password must contain at least one uppercase letter.', 400, ErrorCode.VALIDATION_ERROR);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Fail-open: if settings unavailable, apply no extra policy
    }
  }

  /**
   * Deactivate users who have not logged in for N days.
   * Called by a scheduled cron job. Only processes users with userStatus=ACTIVE.
   */
  static async deactivateInactiveUsers(inactiveDays: number): Promise<number> {
    if (inactiveDays <= 0) return 0;

    const ds = await getDataSource();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - inactiveDays);

    // Find users whose last session is older than cutoff (or who have never logged in and were created before cutoff)
    const result = await ds.query(`
      UPDATE users
      SET "userStatus" = 'INACTIVE', "updatedAt" = NOW()
      WHERE "userStatus" = 'ACTIVE'
        AND "deletedAt" IS NULL
        AND "userId" NOT IN (
          SELECT DISTINCT "userId" FROM user_sessions
          WHERE "createdAt" > $1
        )
        AND "createdAt" < $1
    `, [cutoff]);

    const count = result[1] ?? 0;
    if (count > 0) {
      await this.emitAuditLog(null, 'user.bulk_deactivated_inactive', `${count} users`, null);
    }
    return count;
  }

  /**
   * Merge two user accounts — `sourceUserId` is absorbed into `targetUserId`.
   * Transfers tenant memberships and soft-deletes the source.
   * Only safe to call after verifying both accounts belong to the same person.
   */
  static async merge(targetUserId: string, sourceUserId: string, actorId?: string): Promise<SafeUser> {
    if (targetUserId === sourceUserId) {
      throw new AppError('Cannot merge a user with itself', 400, ErrorCode.VALIDATION_ERROR);
    }
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const [target, source] = await Promise.all([
      repo.findOne({ where: { userId: targetUserId } }),
      repo.findOne({ where: { userId: sourceUserId } }),
    ]);
    if (!target) throw new AppError('Target user not found', 404, ErrorCode.NOT_FOUND);
    if (!source) throw new AppError('Source user not found', 404, ErrorCode.NOT_FOUND);

    // Re-assign tenant memberships from source to target (skip conflicts)
    await ds.query(`
      UPDATE tenant_members SET "userId" = $1
      WHERE "userId" = $2
        AND "tenantId" NOT IN (
          SELECT "tenantId" FROM tenant_members WHERE "userId" = $1
        )
    `, [targetUserId, sourceUserId]);

    // Soft-delete source
    await repo.update({ userId: sourceUserId }, { userStatus: 'DELETED', deletedAt: new Date() } as any);
    await this.invalidate({ userId: sourceUserId, email: source.email });

    await this.emitAuditLog(null, 'user.merged', targetUserId, actorId);
    return this.getById(targetUserId);
  }

  static async getByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const cacheKey = `user:email:${normalized}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached === NEG) return null;
    if (cached) {
      try { return UserSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const user = await ds.getRepository(UserEntity).findOne({ where: { email: normalized } });
      if (!user) {
        await redis.setex(cacheKey, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
        return null;
      }

      const parsed = UserSchema.parse(user);
      await redis.setex(cacheKey, jitter(USER_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  private static async emitAuditLog(
    tenantId: string | null,
    action: string,
    resourceId: string,
    actorId?: string | null,
  ): Promise<void> {
    try {
      const AuditLogService = (await import('@/modules/audit_log/audit_log.service')).default;
      await AuditLogService.log({
        tenantId: tenantId ?? undefined,
        actorId: actorId ?? undefined,
        actorType: actorId ? 'USER' : 'SYSTEM',
        action,
        resourceType: 'user',
        resourceId,
      });
    } catch { /* best-effort */ }
  }
}
