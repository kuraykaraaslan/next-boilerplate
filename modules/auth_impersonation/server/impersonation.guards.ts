import bcrypt from 'bcrypt';
import { getDataSource } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { UserSession as UserSessionEntity } from '@nb/user_session/server/entities/user_session.entity';
import { SafeUserSchema } from '@nb/user/server/user.types';
import TOTPService from '@nb/auth/server/auth.totp.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { UserRoleEnum } from '@nb/user/server/user.enums';
import ImpersonationMessages from './impersonation.messages';
import type { StepUpCredentialInput } from './impersonation.dto';
import {
  getMaxConcurrent,
  getStepUpRequired,
  isImpersonationDisabled,
} from './impersonation.settings.service';

const GLOBAL_ROLE_ORDER = Object.fromEntries(
  UserRoleEnum.options.map((role, i) => [role, i])
) as Record<string, number>;

export function assertReason(reason: string): void {
  if (!reason || reason.trim().length < 3) {
    throw new AppError(ImpersonationMessages.REASON_REQUIRED, 400, ErrorCode.VALIDATION_ERROR);
  }
}

export function assertNotSelf(impersonatorUserId: string, targetUserId: string): void {
  if (impersonatorUserId === targetUserId) {
    throw new AppError(ImpersonationMessages.CANNOT_IMPERSONATE_SELF, 403, ErrorCode.FORBIDDEN);
  }
}

export function assertGlobalRoleDominance(impersonatorRole: string, targetRole: string): void {
  const impersonatorIndex = GLOBAL_ROLE_ORDER[impersonatorRole] ?? 0;
  const targetIndex = GLOBAL_ROLE_ORDER[targetRole] ?? 0;
  if (impersonatorIndex <= targetIndex) {
    throw new AppError(ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE, 403, ErrorCode.FORBIDDEN);
  }
}

export async function assertTenantAllowsImpersonation(tenantId: string): Promise<void> {
  if (await isImpersonationDisabled(tenantId)) {
    throw new AppError(ImpersonationMessages.IMPERSONATION_DISABLED_FOR_TENANT, 403, ErrorCode.FORBIDDEN);
  }
}

/**
 * GOODTOHAVE #3 — verify a step-up credential when the target tenant requires
 * it. Password is verified locally against the stored bcrypt hash; TOTP is
 * delegated to the auth module's TOTP verifier. Throws when required but
 * missing/invalid.
 */
export async function enforceStepUp({
  impersonatorUser,
  tenantId,
  stepUp,
}: {
  impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
  tenantId: string;
  stepUp?: StepUpCredentialInput;
}): Promise<void> {
  if (!(await getStepUpRequired(tenantId))) return;

  if (!stepUp || (!stepUp.password && !stepUp.totp)) {
    throw new AppError(ImpersonationMessages.STEP_UP_REQUIRED, 401, ErrorCode.UNAUTHORIZED);
  }

  if (stepUp.password) {
    const sysDs = await getDataSource();
    const userRow = await sysDs.getRepository(UserEntity).findOne({ where: { userId: impersonatorUser.userId } });
    if (!userRow?.password) {
      throw new AppError(ImpersonationMessages.STEP_UP_METHOD_UNAVAILABLE, 400, ErrorCode.VALIDATION_ERROR);
    }
    const ok = await bcrypt.compare(stepUp.password, userRow.password);
    if (!ok) {
      throw new AppError(ImpersonationMessages.STEP_UP_INVALID_PASSWORD, 401, ErrorCode.INVALID_CREDENTIALS);
    }
    return;
  }

  // TOTP path — delegate to the auth module (read-only call; throws on invalid).
  try {
    await TOTPService.verifyAuthenticate({ user: impersonatorUser as any, otpToken: stepUp.totp! });
  } catch {
    throw new AppError(ImpersonationMessages.STEP_UP_INVALID_TOTP, 401, ErrorCode.INVALID_CREDENTIALS);
  }
}

/**
 * GOODTOHAVE #4 — cap concurrent active impersonation sessions per
 * impersonator for this tenant. Counts non-expired UserSession rows whose
 * metadata.impersonation.impersonatorUserId / tenantId match. 0 = unlimited.
 */
export async function assertConcurrencyBudget(impersonatorUserId: string, tenantId: string): Promise<void> {
  const max = await getMaxConcurrent(tenantId);
  if (max <= 0) return;

  const ds = await getDataSource();
  const repo = ds.getRepository(UserSessionEntity);
  // metadata is jsonb; filter in SQL on the nested impersonation fields.
  const active = await repo
    .createQueryBuilder('s')
    .where('s.sessionExpiry > :now', { now: new Date() })
    .andWhere(`s.metadata -> 'impersonation' ->> 'impersonatorUserId' = :uid`, { uid: impersonatorUserId })
    .andWhere(`s.metadata -> 'impersonation' ->> 'tenantId' = :tid`, { tid: tenantId })
    .getCount();

  if (active >= max) {
    throw new AppError(ImpersonationMessages.IMPERSONATION_CONCURRENCY_LIMIT_REACHED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  }
}
