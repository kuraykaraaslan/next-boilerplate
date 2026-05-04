import 'reflect-metadata';
import { env } from '@/libs/env';
import crypto from 'crypto';
import { IsNull, LessThan, MoreThan } from 'typeorm';
import { getSystemDataSource, tenantDataSourceFor, getDefaultTenantDataSource } from '@/libs/typeorm';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantInvitation as TenantInvitationEntity } from './entities/tenant_invitation.entity';
import { Tenant as TenantEntity } from '../tenant/entities/tenant.entity';
import { SafeTenantInvitation, SafeTenantInvitationSchema } from './tenant_invitation.types';
import { SendInvitationInput, GetInvitationsInput } from './tenant_invitation.dto';
import TenantInvitationMessages from './tenant_invitation.messages';
import TenantMemberService from '../tenant_member/tenant_member.service';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';

const INVITATION_TTL_SECONDS = env.INVITATION_TTL_SECONDS ?? (60 * 60 * 24 * 7);

export default class TenantInvitationService {

  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  static generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async getByTenantId({ tenantId, page, pageSize, status }: GetInvitationsInput): Promise<{ invitations: SafeTenantInvitation[]; total: number }> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const safePage = Math.max(1, page);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);

    const [rows, total] = await Promise.all([
      repo.find({ where: where as any, skip: (safePage - 1) * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: where as any }),
    ]);

    return { invitations: rows.map((r) => SafeTenantInvitationSchema.parse(r)), total };
  }

  static async getById(invitationId: string): Promise<SafeTenantInvitation> {
    const ds = await getDefaultTenantDataSource();
    const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { invitationId } });
    if (!invitation) throw new Error(TenantInvitationMessages.INVITATION_NOT_FOUND);
    return SafeTenantInvitationSchema.parse(invitation);
  }

  static async getByToken(rawToken: string): Promise<SafeTenantInvitation> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const ds = await getDefaultTenantDataSource();
    const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { token: hashed } });
    if (!invitation) throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    return SafeTenantInvitationSchema.parse(invitation);
  }

  static async send(tenantId: string, invitedByUserId: string, { email, memberRole }: SendInvitationInput): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
    const normalizedEmail = email.toLowerCase();

    const sysDs = await getSystemDataSource();
    const existingUser = await sysDs.getRepository(UserEntity).findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      const alreadyMember = await TenantMemberService.getByTenantAndUser({ tenantId, userId: existingUser.userId, tenantMemberId: null });
      if (alreadyMember) throw new Error(TenantInvitationMessages.INVITATION_ALREADY_MEMBER);
    }

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);

    await repo.update({ tenantId, email: normalizedEmail, status: 'PENDING' }, { status: 'REVOKED' });

    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_SECONDS * 1000);

    const invitation = repo.create({ tenantId, email: normalizedEmail, invitedByUserId, memberRole, token: hashedToken, status: 'PENDING', expiresAt });
    const saved = await repo.save(invitation);

    return { invitation: SafeTenantInvitationSchema.parse(saved), rawToken };
  }

  static async preview(tenantId: string, rawToken: string): Promise<{ invitation: SafeTenantInvitation; tenant: { tenantId: string; name: string } }> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const ds = await tenantDataSourceFor(tenantId);
    const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { token: hashed, tenantId } });
    if (!invitation) throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    TenantInvitationService.assertUsable(invitation);

    const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId } });
    return {
      invitation: SafeTenantInvitationSchema.parse(invitation),
      tenant: { tenantId: tenantId, name: tenant?.name ?? '' },
    };
  }

  static async accept(tenantId: string, userId: string, userEmail: string, rawToken: string): Promise<void> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);

    const invitation = await repo.findOne({ where: { token: hashed, tenantId } });
    if (!invitation) throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    if (invitation.email !== userEmail.toLowerCase()) throw new Error(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH);
    TenantInvitationService.assertUsable(invitation);

    await TenantMemberService.create({ tenantId, userId, memberRole: invitation.memberRole as TenantMemberRole, memberStatus: 'ACTIVE' });
    await repo.update({ invitationId: invitation.invitationId }, { status: 'ACCEPTED' });
  }

  static async decline(tenantId: string, userEmail: string, rawToken: string): Promise<void> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);

    const invitation = await repo.findOne({ where: { token: hashed, tenantId } });
    if (!invitation) throw new Error(TenantInvitationMessages.INVITATION_INVALID_TOKEN);
    if (invitation.email !== userEmail.toLowerCase()) throw new Error(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH);
    TenantInvitationService.assertUsable(invitation);

    await repo.update({ invitationId: invitation.invitationId }, { status: 'DECLINED' });
  }

  static async revoke(invitationId: string, tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);
    const invitation = await repo.findOne({ where: { invitationId, tenantId } });
    if (!invitation) throw new Error(TenantInvitationMessages.INVITATION_NOT_FOUND);
    if (invitation.status !== 'PENDING') throw new Error(TenantInvitationMessages.INVITATION_NOT_FOUND);
    await repo.update({ invitationId }, { status: 'REVOKED' });
  }

  static async autoAcceptForEmail(userId: string, email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const now = new Date();

    const ds = await getDefaultTenantDataSource();
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
      } catch {}
    }
  }

  private static assertUsable(invitation: { status: string; expiresAt: Date }): void {
    if (invitation.status === 'ACCEPTED') throw new Error(TenantInvitationMessages.INVITATION_ALREADY_ACCEPTED);
    if (invitation.status === 'DECLINED') throw new Error(TenantInvitationMessages.INVITATION_ALREADY_DECLINED);
    if (invitation.status === 'REVOKED') throw new Error(TenantInvitationMessages.INVITATION_REVOKED);
    if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) throw new Error(TenantInvitationMessages.INVITATION_EXPIRED);
  }
}
