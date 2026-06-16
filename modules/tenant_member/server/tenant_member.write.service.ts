import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import redis from '@nb/redis';
import { TenantMember as TenantMemberEntity } from './entities/tenant_member.entity';
import { SafeTenantMember, SafeTenantMemberSchema } from './tenant_member.types';
import { CreateTenantMemberInput, UpdateTenantMemberInput } from './tenant_member.dto';
import TenantMemberMessages from './tenant_member.messages';
import type { TenantMemberRole } from './tenant_member.enums';
import WebhookService from '@nb/webhook/server/webhook.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { resolveDefaultRole } from './tenant_member.helpers';

export async function create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
  const ds = await tenantDataSourceFor(data.tenantId);
  const repo = ds.getRepository(TenantMemberEntity);
  const existing = await repo.findOne({ where: { tenantId: data.tenantId, userId: data.userId, deletedAt: IsNull() } });
  if (existing) throw new AppError(TenantMemberMessages.MEMBER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

  // Honour the tenant's defaultMemberRole when the caller did not pin a role.
  const memberRole = data.memberRole ?? (await resolveDefaultRole(data.tenantId));
  const member = repo.create({ ...data, memberRole } as Partial<TenantMemberEntity>);
  const saved = await repo.save(member);
  await WebhookService.dispatchEvent(saved.tenantId, 'member.created', {
    tenantMemberId: saved.tenantMemberId,
    userId: saved.userId,
    memberRole: saved.memberRole,
  });
  return SafeTenantMemberSchema.parse(saved);
}

export async function update(tenantMemberId: string, tenantId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantMemberEntity);
  const member = await repo.findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
  if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  if (member.memberRole === 'OWNER' && data.memberRole && data.memberRole !== 'OWNER') {
    const ownerCount = await repo.count({ where: { tenantId, memberRole: 'OWNER', deletedAt: IsNull() } });
    if (ownerCount <= 1) throw new AppError(TenantMemberMessages.CANNOT_DEMOTE_OWNER, 409, ErrorCode.CONFLICT);
  }

  const updateData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));
  await ds.transaction(async (mgr) => {
    const txRepo = mgr.getRepository(TenantMemberEntity);
    await txRepo.update({ tenantMemberId, tenantId }, updateData as Partial<TenantMemberEntity>);
    await txRepo.increment({ tenantMemberId, tenantId }, 'sessionVersion', 1);
  });
  await redis.del(`tenant:member:${member.userId}:${tenantId}`).catch(() => {});
  const updated = await repo.findOne({ where: { tenantMemberId, tenantId } });
  await WebhookService.dispatchEvent(tenantId, 'member.updated', {
    tenantMemberId,
    userId: updated!.userId,
    memberRole: updated!.memberRole,
  });
  return SafeTenantMemberSchema.parse(updated!);
}

/**
 * Suspend a member with a reason and optional auto-expiry. Bumps
 * sessionVersion so existing sessions are invalidated. OWNER cannot be
 * suspended (use ownership transfer first).
 */
export async function suspend(
  tenantMemberId: string,
  tenantId: string,
  opts: { reason: string; until?: Date | null } = { reason: '' },
): Promise<SafeTenantMember> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantMemberEntity);
  const member = await repo.findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
  if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (member.memberRole === 'OWNER') throw new AppError(TenantMemberMessages.CANNOT_DEMOTE_OWNER, 409, ErrorCode.CONFLICT);

  await ds.transaction(async (mgr) => {
    const txRepo = mgr.getRepository(TenantMemberEntity);
    await txRepo.update({ tenantMemberId, tenantId }, {
      memberStatus: 'SUSPENDED',
      suspensionReason: opts.reason || null,
      suspendedUntil: opts.until ?? null,
    });
    await txRepo.increment({ tenantMemberId, tenantId }, 'sessionVersion', 1);
  });
  await redis.del(`tenant:member:${member.userId}:${tenantId}`).catch(() => {});
  await WebhookService.dispatchEvent(tenantId, 'member.updated', {
    tenantMemberId, userId: member.userId, memberStatus: 'SUSPENDED', reason: opts.reason ?? null,
  }).catch(() => {});
  const updated = await repo.findOne({ where: { tenantMemberId, tenantId } });
  return SafeTenantMemberSchema.parse(updated!);
}

/** Lift a suspension (also auto-called when `suspendedUntil` has passed). */
export async function unsuspend(tenantMemberId: string, tenantId: string): Promise<SafeTenantMember> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantMemberEntity);
  const member = await repo.findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
  if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.update({ tenantMemberId, tenantId }, { memberStatus: 'ACTIVE', suspensionReason: null, suspendedUntil: null });
  await redis.del(`tenant:member:${member.userId}:${tenantId}`).catch(() => {});
  const updated = await repo.findOne({ where: { tenantMemberId, tenantId } });
  return SafeTenantMemberSchema.parse(updated!);
}

/** Record member activity (cheap, fire-and-forget friendly). */
export async function touchLastActive(tenantId: string, userId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.getRepository(TenantMemberEntity)
    .update({ tenantId, userId, deletedAt: IsNull() }, { lastActiveAt: new Date() })
    .catch(() => {});
}

/**
 * Transfer ownership: promote `toUserId` to OWNER and demote the current
 * OWNER(s) to ADMIN, atomically. Guards against leaving the tenant ownerless.
 */
export async function transferOwnership(tenantId: string, toUserId: string, demoteToRole: TenantMemberRole = 'ADMIN'): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(TenantMemberEntity);
    const target = await repo.findOne({ where: { tenantId, userId: toUserId, deletedAt: IsNull() } });
    if (!target) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.update({ tenantId, memberRole: 'OWNER', deletedAt: IsNull() }, { memberRole: demoteToRole });
    await repo.update({ tenantMemberId: target.tenantMemberId }, { memberRole: 'OWNER', memberStatus: 'ACTIVE' });
    await repo.increment({ tenantId }, 'sessionVersion', 1);
  });
  await redis.del(`tenant:member:${toUserId}:${tenantId}`).catch(() => {});
  await WebhookService.dispatchEvent(tenantId, 'member.updated', {
    userId: toUserId, memberRole: 'OWNER', ownershipTransfer: true,
  }).catch(() => {});
}

export async function remove(tenantMemberId: string, tenantId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantMemberEntity);
  const member = await repo.findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
  if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  if (member.memberRole === 'OWNER') {
    const ownerCount = await repo.count({ where: { tenantId, memberRole: 'OWNER', deletedAt: IsNull() } });
    if (ownerCount <= 1) throw new AppError(TenantMemberMessages.LAST_OWNER, 409, ErrorCode.CONFLICT);
  }

  await repo.update({ tenantMemberId, tenantId }, { deletedAt: new Date() });
  await WebhookService.dispatchEvent(tenantId, 'member.deleted', {
    tenantMemberId,
    userId: member.userId,
  });
}
