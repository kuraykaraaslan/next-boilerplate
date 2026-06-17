import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import { User as UserEntity } from '@kuraykaraaslan/user/server/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@kuraykaraaslan/tenant_member/server/entities/tenant_member.entity';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { ScimError } from './scim.errors';
import { type ScimUser, type ScimPatchOperation } from './scim.types';
import ScimMessages from './scim.messages';
import ScimPolicyService from './scim.policy.service';
import { toScimUser } from './scim.user.serialize';
import { loadNames } from './scim.user.profile';

export async function patchUser(tenantId: string, tenantMemberId: string, ops: ScimPatchOperation[]): Promise<ScimUser> {
  const tenantDs = await tenantDataSourceFor(tenantId);
  const memberRepo = tenantDs.getRepository(TenantMemberEntity);
  const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
  if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const sysDs = await getDataSource();
  const userRepo = sysDs.getRepository(UserEntity);
  const user = await userRepo.findOne({ where: { userId: member.userId } });
  if (!user) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  // Collect name/profile changes to persist to user_profile after the loop.
  const profilePatch: Record<string, unknown> = {};
  for (const op of ops) {
    if (!op.path) {
      if (op.op === 'remove') continue;
      if (op.value && typeof op.value === 'object') {
        if ('active' in op.value) member.memberStatus = op.value.active ? 'ACTIVE' : 'INACTIVE';
        if ('userName' in op.value && typeof op.value.userName === 'string') user.email = op.value.userName.toLowerCase();
        if ('displayName' in op.value && typeof op.value.displayName === 'string') profilePatch.displayName = op.value.displayName;
        const nm = (op.value as Record<string, unknown>).name as Record<string, unknown> | undefined;
        if (nm?.givenName !== undefined) profilePatch.firstName = nm.givenName;
        if (nm?.familyName !== undefined) profilePatch.lastName = nm.familyName;
      }
      continue;
    }
    const lower = op.path.trim().toLowerCase();
    switch (lower) {
      case 'active':
        member.memberStatus = op.op === 'remove' ? 'INACTIVE' : (op.value ? 'ACTIVE' : 'INACTIVE');
        break;
      case 'username':
      case 'emails[primary eq true].value':
        if (op.op !== 'remove' && typeof op.value === 'string') user.email = op.value.toLowerCase();
        break;
      case 'externalid':
        member.externalId = op.op === 'remove' ? null : (typeof op.value === 'string' ? op.value : member.externalId);
        break;
      case 'phonenumbers[primary eq true].value':
      case 'phonenumbers':
        if (op.op !== 'remove' && typeof op.value === 'string') user.phone = op.value;
        break;
      case 'name.givenname':
        profilePatch.firstName = op.op === 'remove' ? null : op.value;
        break;
      case 'name.familyname':
        profilePatch.lastName = op.op === 'remove' ? null : op.value;
        break;
      case 'displayname':
        profilePatch.displayName = op.op === 'remove' ? null : op.value;
        break;
      default:
        throw new ScimError(`${ScimMessages.INVALID_PATCH_PATH}: ${op.path}`, 400, ErrorCode.VALIDATION_ERROR, 'invalidPath');
    }
  }
  await userRepo.save(user);
  const saved = await memberRepo.save(member);
  const policy = await ScimPolicyService.get(tenantId);
  if (policy.syncNames && Object.keys(profilePatch).length > 0) {
    try {
      const { default: UserProfileService } = await import('@kuraykaraaslan/user_profile/server/user_profile.service');
      await UserProfileService.upsert(user.userId, profilePatch as never, tenantId);
    } catch { /* best-effort */ }
  }
  AuditLogService.log({
    tenantId, actorType: 'SYSTEM', action: 'scim.user.patched',
    resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
    metadata: { ops: ops.map((o) => ({ op: o.op, path: o.path })) },
  }).catch(() => {});
  return toScimUser(saved, user, await loadNames(tenantId, user.userId, policy));
}
