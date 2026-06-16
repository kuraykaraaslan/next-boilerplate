import 'reflect-metadata';
import { getDataSource } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { UserConsent as UserConsentEntity } from './entities/user_consent.entity';
import bcrypt from 'bcrypt';
import Logger from '@nb/logger';
import UserService from '@nb/user/server/user.service';
import TenantService from '@nb/tenant/server/tenant.service';
import TenantInvitationService from '@nb/tenant_invitation/server/tenant_invitation.service';
import UserSecurityService from '@nb/user_security/server/user_security.service';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { AuditActions } from '@nb/audit_log/server/audit_log.enums';
import { SafeUser, SafeUserSchema } from '@nb/user/server/user.types';
import AuthMessages from './auth.messages';
import AuthPolicyService from './auth.policy.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { hashPassword } from './auth.credential.helpers';

export async function register({ email, password, phone, tenantId, consentVersion }: {
  email: string; password: string; phone?: string; tenantId?: string; consentVersion?: string;
}): Promise<{ user: SafeUser }> {
  // GTH-1 / GTH-12: honour the tenant's self-registration posture. Invite-only
  // tenants set `allowRegistration=false`; the only path in is an invitation.
  const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
  if (!accessPolicy.allowRegistration) {
    throw new AppError(AuthMessages.REGISTRATION_DISABLED, 403, ErrorCode.FORBIDDEN);
  }

  const existingUser = await UserService.getByEmail(email);
  if (existingUser) throw new AppError(AuthMessages.EMAIL_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

  const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
  const policyError = AuthPolicyService.validatePassword(password, policy, { email });
  if (policyError) throw new AppError(policyError, 422, ErrorCode.VALIDATION_ERROR);

  const ds = await getDataSource();
  const hashed = await hashPassword(password, tenantId);
  const parsedUser = await ds.transaction(async (manager) => {
    const now = new Date();
    const newUser = manager.getRepository(UserEntity).create({
      phone,
      email: email.toLowerCase(),
      password: hashed,
      ...(consentVersion ? { consentVersion, consentAcceptedAt: now } : {}),
    });
    const saved = await manager.getRepository(UserEntity).save(newUser);
    // GTH-7: persist a verifiable, versioned consent record (GDPR Art. 7 /
    // KVKK / LGPD). Append-only — one row per consent event.
    if (consentVersion) {
      await manager.getRepository(UserConsentEntity).save(
        manager.getRepository(UserConsentEntity).create({
          userId: saved.userId,
          tenantId: tenantId ?? null,
          documentType: 'terms_of_service',
          documentVersion: consentVersion,
        }),
      );
    }
    return SafeUserSchema.parse(saved);
  });

  await UserSecurityService.pushPasswordHistory(parsedUser.userId, hashed, policy.historyCount).catch(
    (err: unknown) => Logger.warn(`AuthCredentialService.register: seed history failed: ${err instanceof Error ? err.message : String(err)}`),
  );
  await TenantService.provisionPersonal(parsedUser.userId, parsedUser.email);
  await TenantInvitationService.autoAcceptForEmail(parsedUser.userId, parsedUser.email);
  return { user: parsedUser };
}

export async function changePassword({ userId, newPassword, tenantId }: {
  userId: string; newPassword: string; tenantId?: string;
}): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);
  const user = await repo.findOne({ where: { userId } });
  if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
  const policyError = AuthPolicyService.validatePassword(newPassword, policy, { email: user.email });
  if (policyError) throw new AppError(policyError, 422, ErrorCode.VALIDATION_ERROR);

  // GTH-9: minimum password age — block changing the password again until it
  // has aged `minAgeDays` (prevents history-cycling to revert to a banned one).
  if (policy.minAgeDays > 0) {
    const changedAt = await UserSecurityService.getPasswordChangedAt(userId).catch(() => null);
    if (changedAt) {
      const ageMs = Date.now() - changedAt.getTime();
      if (ageMs < policy.minAgeDays * 24 * 60 * 60 * 1000) {
        throw new AppError(AuthMessages.PASSWORD_CHANGED_TOO_RECENTLY, 422, ErrorCode.VALIDATION_ERROR);
      }
    }
  }

  const history = await UserSecurityService.getPasswordHistory(userId);
  for (const oldHash of history) {
    if (await bcrypt.compare(newPassword, oldHash)) throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);
  }
  if (await bcrypt.compare(newPassword, user.password)) throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);

  const newHash = await hashPassword(newPassword, tenantId);
  await ds.transaction(async (manager) => {
    await manager.getRepository(UserEntity).update({ userId }, { password: newHash });
    await UserSecurityService.pushPasswordHistory(userId, newHash, policy.historyCount);
  });
  await UserService.invalidate({ userId, email: user.email });
  AuditLogService.log({
    tenantId: tenantId ?? null, actorId: userId, actorType: 'USER',
    action: AuditActions.AUTH_PASSWORD_CHANGED, metadata: { userId },
  }).catch(() => {});
}
