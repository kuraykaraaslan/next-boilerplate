import 'reflect-metadata';
import { getDataSource } from '@nb/db';
import { User as UserEntity } from './entities/user.entity';
import { SafeUser } from './user.types';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { invalidate, emitAuditLog } from './user.helpers';
import { getById } from './user.read.service';

/**
 * Enforce per-tenant password policy on user creation within a tenant context.
 * Reads `passwordMinLength` and `passwordRequireSpecialChar` from tenant settings.
 */
export async function enforcePasswordPolicy(tenantId: string, password: string): Promise<void> {
  try {
    const SettingService = (await import('@nb/setting/server/setting.service')).default;
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
export async function deactivateInactiveUsers(inactiveDays: number): Promise<number> {
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
    await emitAuditLog(null, 'user.bulk_deactivated_inactive', `${count} users`, null);
  }
  return count;
}

/**
 * Merge two user accounts — `sourceUserId` is absorbed into `targetUserId`.
 * Transfers tenant memberships and soft-deletes the source.
 * Only safe to call after verifying both accounts belong to the same person.
 */
export async function merge(targetUserId: string, sourceUserId: string, actorId?: string): Promise<SafeUser> {
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
  await invalidate({ userId: sourceUserId, email: source.email });

  await emitAuditLog(null, 'user.merged', targetUserId, actorId);
  return getById(targetUserId);
}
