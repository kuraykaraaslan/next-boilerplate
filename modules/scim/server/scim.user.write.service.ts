import 'reflect-metadata';
import crypto from 'crypto';
import { IsNull } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@nb/tenant_member/server/entities/tenant_member.entity';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import bcrypt from 'bcrypt';
import { ErrorCode } from '@nb/common/server/app-error';
import { ScimError } from './scim.errors';
import { type ScimUser } from './scim.types';
import type { CreateScimUserInput, UpdateScimUserInput } from './scim.dto';
import ScimMessages from './scim.messages';
import ScimPolicyService from './scim.policy.service';
import { toScimUser } from './scim.user.serialize';
import { persistProfile, loadNames } from './scim.user.profile';

export async function createUser(tenantId: string, input: CreateScimUserInput): Promise<ScimUser> {
  const email = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName).toLowerCase();
  if (!email) throw new ScimError(ScimMessages.USERNAME_REQUIRED, 400, ErrorCode.VALIDATION_ERROR, 'invalidValue');
  const policy = await ScimPolicyService.get(tenantId);
  const sysDs = await getDataSource();
  const userRepo = sysDs.getRepository(UserEntity);

  let user = await userRepo.findOne({ where: { email } });
  const mintedNewUser = !user;
  if (!user) {
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(randomSecret, 10);
    const newUser = userRepo.create({ email, password: hashed, userRole: 'USER', userStatus: 'ACTIVE' });
    if (input.phoneNumbers?.length) newUser.phone = input.phoneNumbers.find((p) => p.primary)?.value ?? input.phoneNumbers[0].value;
    user = await userRepo.save(newUser);
    // Cross-tenant identity creation is its own auditable security event.
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.identity.created',
      severity: 'medium', resourceType: 'user', resourceId: user.userId,
      metadata: { email, source: 'scim' },
    }).catch(() => {});
  } else if (input.phoneNumbers?.length && !user.phone) {
    user.phone = input.phoneNumbers.find((p) => p.primary)?.value ?? input.phoneNumbers[0].value;
    await userRepo.save(user);
  }

  const tenantDs = await tenantDataSourceFor(tenantId);
  const memberRepo = tenantDs.getRepository(TenantMemberEntity);
  const existing = await memberRepo.findOne({ where: { tenantId, userId: user.userId, deletedAt: IsNull() } });
  if (existing) {
    // Idempotent create: an IdP retry where the member already exists with the
    // same externalId resolves to the existing resource instead of 409.
    if (input.externalId && existing.externalId === input.externalId) {
      await persistProfile(tenantId, user.userId, input, policy);
      return toScimUser(existing, user, await loadNames(tenantId, user.userId, policy));
    }
    throw new ScimError(ScimMessages.USER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT, 'uniqueness');
  }

  const member = memberRepo.create({
    tenantId, userId: user.userId, memberRole: policy.defaultRole,
    memberStatus: input.active === false ? 'INACTIVE' : 'ACTIVE',
    externalId: input.externalId ?? null,
  } as Partial<TenantMemberEntity>);
  const saved = await memberRepo.save(member);
  await persistProfile(tenantId, user.userId, input, policy);
  AuditLogService.log({
    tenantId, actorType: 'SYSTEM', action: 'scim.user.created',
    resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
    metadata: { externalId: input.externalId, userName: email, userId: user.userId, mintedNewUser, role: policy.defaultRole },
  }).catch(() => {});
  return toScimUser(saved, user, await loadNames(tenantId, user.userId, policy));
}

export async function updateUser(tenantId: string, tenantMemberId: string, input: UpdateScimUserInput): Promise<ScimUser> {
  const tenantDs = await tenantDataSourceFor(tenantId);
  const memberRepo = tenantDs.getRepository(TenantMemberEntity);
  const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
  if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const sysDs = await getDataSource();
  const userRepo = sysDs.getRepository(UserEntity);
  const user = await userRepo.findOne({ where: { userId: member.userId } });
  if (!user) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const newEmail = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName)?.toLowerCase();
  if (newEmail && newEmail !== user.email) {
    const collision = await userRepo.findOne({ where: { email: newEmail } });
    if (collision && collision.userId !== user.userId) throw new ScimError(ScimMessages.USER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT, 'uniqueness');
    user.email = newEmail;
    await userRepo.save(user);
  }
  if (input.externalId !== undefined) member.externalId = input.externalId ?? null;
  if (input.active !== undefined) member.memberStatus = input.active ? 'ACTIVE' : 'INACTIVE';
  const saved = await memberRepo.save(member);
  const policy = await ScimPolicyService.get(tenantId);
  await persistProfile(tenantId, user.userId, input, policy);
  AuditLogService.log({
    tenantId, actorType: 'SYSTEM', action: 'scim.user.updated',
    resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
    metadata: { externalId: saved.externalId, active: input.active },
  }).catch(() => {});
  return toScimUser(saved, user, await loadNames(tenantId, user.userId, policy));
}

export async function deleteUser(tenantId: string, tenantMemberId: string): Promise<void> {
  const tenantDs = await tenantDataSourceFor(tenantId);
  const memberRepo = tenantDs.getRepository(TenantMemberEntity);
  const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
  if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  member.memberStatus = 'INACTIVE';
  member.deletedAt = new Date();
  await memberRepo.save(member);
  AuditLogService.log({
    tenantId, actorType: 'SYSTEM', action: 'scim.user.deleted',
    resourceType: 'tenant_member', resourceId: tenantMemberId,
    metadata: { externalId: member.externalId },
  }).catch(() => {});
}
