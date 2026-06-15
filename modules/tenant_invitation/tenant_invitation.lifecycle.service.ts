import 'reflect-metadata';
import { MoreThan } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantInvitation as TenantInvitationEntity } from './entities/tenant_invitation.entity';
import { SafeTenantInvitation, SafeTenantInvitationSchema } from './tenant_invitation.types';
import { SendInvitationInput } from './tenant_invitation.dto';
import TenantInvitationMessages from './tenant_invitation.messages';
import TenantMemberService from '../tenant_member/tenant_member.service';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';
import WebhookService from '@/modules/webhook/webhook.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import {
  clearCache, hashToken, generateRawToken, resolveTtlMs, assertRoleAllowed, assertUsable,
} from './tenant_invitation.helpers';

export async function send(tenantId: string, invitedByUserId: string, { email, memberRole }: SendInvitationInput): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
  const normalizedEmail = email.toLowerCase();
  await assertRoleAllowed(tenantId, memberRole);

  const sysDs = await getDataSource();
  const existingUser = await sysDs.getRepository(UserEntity).findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    const alreadyMember = await TenantMemberService.getByTenantAndUser({ tenantId, userId: existingUser.userId, tenantMemberId: null });
    if (alreadyMember) throw new AppError(TenantInvitationMessages.INVITATION_ALREADY_MEMBER, 409, ErrorCode.CONFLICT);
  }

  const ds = await tenantDataSourceFor(tenantId);
  const rawToken = generateRawToken();
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + (await resolveTtlMs(tenantId)));

  const saved = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(TenantInvitationEntity);
    const stalePending = await repo.find({ where: { tenantId, email: normalizedEmail, status: 'PENDING' } });
    if (stalePending.length > 0) {
      await repo.update({ tenantId, email: normalizedEmail, status: 'PENDING' }, { status: 'REVOKED' });
      await Promise.all(stalePending.map((inv) => clearCache({ invitationId: inv.invitationId, token: inv.token })));
    }
    const invitation = repo.create({ tenantId, email: normalizedEmail, invitedByUserId, memberRole, token: hashedToken, status: 'PENDING', expiresAt });
    return repo.save(invitation);
  });

  await redis.del(`tenant_invitation:token:${hashedToken}`).catch(() => {});
  await WebhookService.dispatchEvent(tenantId, 'invitation.sent', {
    invitationId: saved.invitationId,
    email: saved.email,
    memberRole: saved.memberRole,
  });

  return { invitation: SafeTenantInvitationSchema.parse(saved), rawToken };
}

export async function accept(tenantId: string, userId: string, userEmail: string, rawToken: string): Promise<void> {
  const hashed = hashToken(rawToken);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantInvitationEntity);

  const invitation = await repo.findOne({ where: { token: hashed, tenantId } });
  if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
  if (invitation.email !== userEmail.toLowerCase()) throw new AppError(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
  assertUsable(invitation);

  // Create member first (idempotent via UNIQUE constraint)
  await TenantMemberService.create({ tenantId, userId, memberRole: invitation.memberRole as TenantMemberRole, memberStatus: 'ACTIVE' });

  await repo.update({ invitationId: invitation.invitationId }, { status: 'ACCEPTED' });
  await clearCache({ invitationId: invitation.invitationId, token: invitation.token });
  await WebhookService.dispatchEvent(tenantId, 'invitation.accepted', {
    invitationId: invitation.invitationId,
    email: invitation.email,
    userId,
  });
}

export async function decline(tenantId: string, userEmail: string, rawToken: string): Promise<void> {
  const hashed = hashToken(rawToken);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantInvitationEntity);

  const invitation = await repo.findOne({ where: { token: hashed, tenantId } });
  if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
  if (invitation.email !== userEmail.toLowerCase()) throw new AppError(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
  assertUsable(invitation);

  await repo.update({ invitationId: invitation.invitationId }, { status: 'DECLINED' });
  await clearCache({ invitationId: invitation.invitationId, token: invitation.token });
  await WebhookService.dispatchEvent(tenantId, 'invitation.declined', {
    invitationId: invitation.invitationId,
    email: invitation.email,
  });
}

export async function revoke(invitationId: string, tenantId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantInvitationEntity);
  const invitation = await repo.findOne({ where: { invitationId, tenantId } });
  if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (invitation.status !== 'PENDING') throw new AppError(TenantInvitationMessages.INVITATION_ONLY_PENDING_CAN_BE_REVOKED, 409, ErrorCode.CONFLICT);
  await repo.update({ invitationId }, { status: 'REVOKED' });
  await clearCache({ invitationId, token: invitation.token });
  await WebhookService.dispatchEvent(tenantId, 'invitation.revoked', {
    invitationId,
    email: invitation.email,
  });
}

/**
 * Resend a PENDING invitation: rotates the token and extends the expiry
 * (per-tenant TTL) without revoking + re-creating, so existing tracking holds.
 * Returns the new raw token to email out.
 */
export async function resend(invitationId: string, tenantId: string): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantInvitationEntity);
  const invitation = await repo.findOne({ where: { invitationId, tenantId } });
  if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (invitation.status !== 'PENDING') throw new AppError(TenantInvitationMessages.INVITATION_ONLY_PENDING_CAN_BE_RESENT, 409, ErrorCode.CONFLICT);

  const oldToken = invitation.token;
  const rawToken = generateRawToken();
  invitation.token = hashToken(rawToken);
  invitation.expiresAt = new Date(Date.now() + (await resolveTtlMs(tenantId)));
  const saved = await repo.save(invitation);
  await clearCache({ invitationId, token: oldToken });

  await WebhookService.dispatchEvent(tenantId, 'invitation.sent', {
    invitationId: saved.invitationId, email: saved.email, memberRole: saved.memberRole, resent: true,
  });
  return { invitation: SafeTenantInvitationSchema.parse(saved), rawToken };
}

/**
 * Mark PENDING invitations past their expiry as EXPIRED. Meant for a
 * scheduled per-tenant sweep; `accept` already rejects expired tokens, so this
 * is state hygiene. Returns the number expired.
 */
export async function sweepExpired(tenantId: string): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantInvitationEntity);
  const stale = await repo.find({ where: { tenantId, status: 'PENDING' } });
  const now = new Date();
  const expired = stale.filter((i) => i.expiresAt < now);
  if (expired.length === 0) return 0;
  await Promise.all(expired.map(async (i) => {
    await repo.update({ invitationId: i.invitationId }, { status: 'EXPIRED' });
    await clearCache({ invitationId: i.invitationId, token: i.token });
  }));
  return expired.length;
}

export async function autoAcceptForEmail(userId: string, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  const ds = await getDataSource();
  const pending = await ds.getRepository(TenantInvitationEntity).find({
    where: { email: normalizedEmail, status: 'PENDING', expiresAt: MoreThan(now) },
  });

  for (const invitation of pending) {
    try {
      const alreadyMember = await TenantMemberService.getByTenantAndUser({ tenantId: invitation.tenantId, userId, tenantMemberId: null });
      if (!alreadyMember) {
        await TenantMemberService.create({ tenantId: invitation.tenantId, userId, memberRole: invitation.memberRole as TenantMemberRole, memberStatus: 'ACTIVE' });
      }
      const invDs = await tenantDataSourceFor(invitation.tenantId);
      await invDs.getRepository(TenantInvitationEntity).update({ invitationId: invitation.invitationId }, { status: 'ACCEPTED' });
      await clearCache({ invitationId: invitation.invitationId, token: invitation.token });
    } catch {}
  }
}
