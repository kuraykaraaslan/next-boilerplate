import 'reflect-metadata';
import { env } from '@/modules/env';
import crypto from 'crypto';
import { MoreThan } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantInvitation as TenantInvitationEntity } from './entities/tenant_invitation.entity';
import { Tenant as TenantEntity } from '../tenant/entities/tenant.entity';
import { SafeTenantInvitation, SafeTenantInvitationSchema } from './tenant_invitation.types';
import { SendInvitationInput, GetInvitationsInput } from './tenant_invitation.dto';
import TenantInvitationMessages from './tenant_invitation.messages';
import TenantMemberService from '../tenant_member/tenant_member.service';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const INVITATION_TTL_SECONDS = env.INVITATION_TTL_SECONDS ?? (60 * 60 * 24 * 7);
const INVITATION_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
const NEGATIVE_CACHE_TTL = Math.min(60, INVITATION_CACHE_TTL);
const NEG = '__not_found__';

export default class TenantInvitationService {

  private static async clearCache(invitation: { invitationId: string; token?: string }) {
    const ops: Promise<unknown>[] = [redis.del(`tenant_invitation:id:${invitation.invitationId}`)];
    if (invitation.token) ops.push(redis.del(`tenant_invitation:token:${invitation.token}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  static generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async getByTenantId({ tenantId, page, pageSize, status }: GetInvitationsInput): Promise<{ invitations: SafeTenantInvitation[]; total: number }> {
    const where: FindOptionsWhere<TenantInvitationEntity> = { tenantId };
    if (status) where.status = status;

    const safePage = Math.max(1, page);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);

    const [rows, total] = await Promise.all([
      repo.find({ where, skip: (safePage - 1) * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where }),
    ]);

    return { invitations: rows.map((r) => SafeTenantInvitationSchema.parse(r)), total };
  }

  static async getById(invitationId: string, tenantId: string): Promise<SafeTenantInvitation> {
    const cacheKey = `tenant_invitation:id:${invitationId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = SafeTenantInvitationSchema.parse(JSON.parse(cached));
        if (parsed.tenantId !== tenantId) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
        return parsed;
      } catch (e) {
        if (e instanceof AppError) throw e;
        await redis.del(cacheKey).catch(() => {});
      }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { invitationId, tenantId } });
      if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      const parsed = SafeTenantInvitationSchema.parse(invitation);
      await redis.setex(cacheKey, jitter(INVITATION_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getByToken(rawToken: string): Promise<SafeTenantInvitation> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const cacheKey = `tenant_invitation:token:${hashed}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached === NEG) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
    if (cached) {
      try { return SafeTenantInvitationSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { token: hashed } });
      if (!invitation) {
        await redis.setex(cacheKey, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
        throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
      }

      const parsed = SafeTenantInvitationSchema.parse(invitation);
      await redis.setex(cacheKey, jitter(INVITATION_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  /** Per-tenant invitation TTL (`invitationTtlDays` setting); falls back to env. */
  private static async resolveTtlMs(tenantId: string): Promise<number> {
    const raw = await SettingService.getValue(tenantId, 'invitationTtlDays').catch(() => null);
    const days = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(days) && days > 0 ? days * 86_400_000 : INVITATION_TTL_SECONDS * 1000;
  }

  /**
   * A tenant can restrict which roles may be granted via invitation
   * (`invitationAllowedRoles`, CSV). OWNER can never be granted by invitation —
   * ownership transfer is an explicit, separate flow.
   */
  private static async assertRoleAllowed(tenantId: string, memberRole: string): Promise<void> {
    if (memberRole === 'OWNER') {
      throw new AppError(TenantInvitationMessages.INVITATION_ROLE_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR);
    }
    const raw = await SettingService.getValue(tenantId, 'invitationAllowedRoles').catch(() => null);
    if (raw) {
      const allowed = raw.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(memberRole.toUpperCase())) {
        throw new AppError(TenantInvitationMessages.INVITATION_ROLE_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR);
      }
    }
  }

  static async send(tenantId: string, invitedByUserId: string, { email, memberRole }: SendInvitationInput): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
    const normalizedEmail = email.toLowerCase();
    await TenantInvitationService.assertRoleAllowed(tenantId, memberRole);

    const sysDs = await getDataSource();
    const existingUser = await sysDs.getRepository(UserEntity).findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      const alreadyMember = await TenantMemberService.getByTenantAndUser({ tenantId, userId: existingUser.userId, tenantMemberId: null });
      if (alreadyMember) throw new AppError(TenantInvitationMessages.INVITATION_ALREADY_MEMBER, 409, ErrorCode.CONFLICT);
    }

    const ds = await tenantDataSourceFor(tenantId);
    const rawToken = TenantInvitationService.generateRawToken();
    const hashedToken = TenantInvitationService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + (await TenantInvitationService.resolveTtlMs(tenantId)));

    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(TenantInvitationEntity);
      const stalePending = await repo.find({ where: { tenantId, email: normalizedEmail, status: 'PENDING' } });
      if (stalePending.length > 0) {
        await repo.update({ tenantId, email: normalizedEmail, status: 'PENDING' }, { status: 'REVOKED' });
        await Promise.all(stalePending.map((inv) => this.clearCache({ invitationId: inv.invitationId, token: inv.token })));
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

  static async preview(tenantId: string, rawToken: string): Promise<{ invitation: SafeTenantInvitation; tenant: { tenantId: string; name: string } }> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const ds = await tenantDataSourceFor(tenantId);
    const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { token: hashed, tenantId } });
    if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
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
    if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
    if (invitation.email !== userEmail.toLowerCase()) throw new AppError(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
    TenantInvitationService.assertUsable(invitation);

    // Create member first (idempotent via UNIQUE constraint)
    await TenantMemberService.create({ tenantId, userId, memberRole: invitation.memberRole as TenantMemberRole, memberStatus: 'ACTIVE' });

    await repo.update({ invitationId: invitation.invitationId }, { status: 'ACCEPTED' });
    await this.clearCache({ invitationId: invitation.invitationId, token: invitation.token });
    await WebhookService.dispatchEvent(tenantId, 'invitation.accepted', {
      invitationId: invitation.invitationId,
      email: invitation.email,
      userId,
    });
  }

  static async decline(tenantId: string, userEmail: string, rawToken: string): Promise<void> {
    const hashed = TenantInvitationService.hashToken(rawToken);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);

    const invitation = await repo.findOne({ where: { token: hashed, tenantId } });
    if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
    if (invitation.email !== userEmail.toLowerCase()) throw new AppError(TenantInvitationMessages.INVITATION_EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
    TenantInvitationService.assertUsable(invitation);

    await repo.update({ invitationId: invitation.invitationId }, { status: 'DECLINED' });
    await this.clearCache({ invitationId: invitation.invitationId, token: invitation.token });
    await WebhookService.dispatchEvent(tenantId, 'invitation.declined', {
      invitationId: invitation.invitationId,
      email: invitation.email,
    });
  }

  static async revoke(invitationId: string, tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);
    const invitation = await repo.findOne({ where: { invitationId, tenantId } });
    if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invitation.status !== 'PENDING') throw new AppError(TenantInvitationMessages.INVITATION_ONLY_PENDING_CAN_BE_REVOKED, 409, ErrorCode.CONFLICT);
    await repo.update({ invitationId }, { status: 'REVOKED' });
    await this.clearCache({ invitationId, token: invitation.token });
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
  static async resend(invitationId: string, tenantId: string): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);
    const invitation = await repo.findOne({ where: { invitationId, tenantId } });
    if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (invitation.status !== 'PENDING') throw new AppError(TenantInvitationMessages.INVITATION_ONLY_PENDING_CAN_BE_RESENT, 409, ErrorCode.CONFLICT);

    const oldToken = invitation.token;
    const rawToken = TenantInvitationService.generateRawToken();
    invitation.token = TenantInvitationService.hashToken(rawToken);
    invitation.expiresAt = new Date(Date.now() + (await TenantInvitationService.resolveTtlMs(tenantId)));
    const saved = await repo.save(invitation);
    await this.clearCache({ invitationId, token: oldToken });

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
  static async sweepExpired(tenantId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantInvitationEntity);
    const stale = await repo.find({ where: { tenantId, status: 'PENDING' } });
    const now = new Date();
    const expired = stale.filter((i) => i.expiresAt < now);
    if (expired.length === 0) return 0;
    await Promise.all(expired.map(async (i) => {
      await repo.update({ invitationId: i.invitationId }, { status: 'EXPIRED' });
      await this.clearCache({ invitationId: i.invitationId, token: i.token });
    }));
    return expired.length;
  }

  static async autoAcceptForEmail(userId: string, email: string): Promise<void> {
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
        await this.clearCache({ invitationId: invitation.invitationId, token: invitation.token });
      } catch {}
    }
  }

  private static assertUsable(invitation: { status: string; expiresAt: Date }): void {
    if (invitation.status === 'ACCEPTED') throw new AppError(TenantInvitationMessages.INVITATION_ALREADY_ACCEPTED, 409, ErrorCode.CONFLICT);
    if (invitation.status === 'DECLINED') throw new AppError(TenantInvitationMessages.INVITATION_ALREADY_DECLINED, 409, ErrorCode.CONFLICT);
    if (invitation.status === 'REVOKED') throw new AppError(TenantInvitationMessages.INVITATION_REVOKED, 410, ErrorCode.VALIDATION_ERROR);
    if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) throw new AppError(TenantInvitationMessages.INVITATION_EXPIRED, 410, ErrorCode.VALIDATION_ERROR);
  }
}
