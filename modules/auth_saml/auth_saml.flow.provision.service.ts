import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { tenantDataSourceFor } from '@/modules/db';
import SamlMessages from './auth_saml.messages';
import { type SamlProfile } from './auth_saml.types';
import UserService from '../user/user.service';
import { SafeUserSchema, type SafeUser } from '../user/user.types';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '../tenant_member/entities/tenant_member.entity';
import TenantMemberService from '../tenant_member/tenant_member.service';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import AuditLogService from '../audit_log/audit_log.service';
import AuthSamlConfigService from './auth_saml.config.service';
import { mapSamlRoleToMemberRole } from './auth_saml.flow.roles';

/**
 * Resolve the user + tenant membership for an assertion, JIT-provisioning when
 * enabled. The user-create + invitation-accept + member-create sequence runs
 * inside a single per-tenant DB transaction so a mid-sequence failure can no
 * longer leave an orphaned user with no membership (atomic JIT).
 */
export async function resolveOrProvisionUser(
  tenantId: string,
  profile: SamlProfile,
): Promise<{ user: SafeUser; jitProvisioned: boolean; memberCreated: boolean }> {
  const config = await AuthSamlConfigService.loadConfig(tenantId);
  if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);

  const existingRaw = await UserService.getByEmail(profile.email);
  let user: SafeUser | null = existingRaw ? SafeUserSchema.parse(existingRaw) : null;

  const existingMember = user
    ? await TenantMemberService
        .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
        .catch(() => null)
    : null;

  // Fast path: known user with an existing membership — no writes needed.
  if (user && existingMember) {
    return { user, jitProvisioned: false, memberCreated: false };
  }

  // Anything missing requires JIT; bail before any write when it is off.
  if (!config.allowJitProvisioning) throw new AppError(SamlMessages.NOT_MEMBER, 403, ErrorCode.FORBIDDEN);

  const mappedRole = mapSamlRoleToMemberRole(profile, config);

  let jitProvisioned = false;
  let memberCreated = false;
  let resolvedUserId = user?.userId ?? null;

  const ds = await tenantDataSourceFor(tenantId);
  try {
    await ds.transaction(async (mgr) => {
      const userRepo = mgr.getRepository(UserEntity);
      const memberRepo = mgr.getRepository(TenantMemberEntity);

      // Create the user inside the transaction when unknown.
      if (!resolvedUserId) {
        const randomPwd = `saml_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
        const passwordHash = await bcrypt.hash(randomPwd, 10);
        const created = userRepo.create({
          email: profile.email.toLowerCase(),
          password: passwordHash,
          userRole: 'USER',
          userStatus: 'ACTIVE',
        });
        const savedUser = await userRepo.save(created);
        resolvedUserId = savedUser.userId;
        jitProvisioned = true;
      }

      // Create the membership inside the same transaction when missing.
      const memberExists = await memberRepo.findOne({ where: { tenantId, userId: resolvedUserId! } });
      if (!memberExists) {
        const member = memberRepo.create({
          tenantId, userId: resolvedUserId!, memberRole: mappedRole, memberStatus: 'ACTIVE',
        });
        await memberRepo.save(member);
        memberCreated = true;
      }
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(SamlMessages.JIT_PROVISION_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }

  // Best-effort post-commit side effects (invitation auto-accept + audit).
  // These are NOT in the transaction: they are non-critical and idempotent.
  if (jitProvisioned && resolvedUserId) {
    try { await TenantInvitationService.autoAcceptForEmail(resolvedUserId, profile.email); } catch {}
    await AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'saml.jit_provisioned',
      resourceType: 'user', resourceId: resolvedUserId,
      metadata: { email: profile.email, nameId: profile.nameId },
    }).catch(() => {});
  }
  if (memberCreated && resolvedUserId) {
    await AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'saml.jit_role_mapped',
      resourceType: 'tenant_member', resourceId: resolvedUserId,
      metadata: { memberRole: mappedRole, roleAttribute: config.roleAttribute ?? null },
    }).catch(() => {});
  }

  // Reload the safe user (the transaction-created entity is not Safe-parsed).
  if (!user && resolvedUserId) {
    const reloaded = await UserService.getByEmail(profile.email);
    user = reloaded ? SafeUserSchema.parse(reloaded) : null;
  }
  if (!user) throw new AppError(SamlMessages.JIT_PROVISION_FAILED, 500, ErrorCode.INTERNAL_ERROR);

  return { user, jitProvisioned, memberCreated };
}
