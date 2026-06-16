import 'reflect-metadata';
import { getDataSource } from '@nb/db';
import redis from '@nb/redis';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import SSOService from '@nb/auth_sso/server/auth_sso.service';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { UserSocialAccount as UserSocialAccountEntity } from './entities/user_social_account.entity';
import { TenantMember as TenantMemberEntity } from '@nb/tenant_member/server/entities/tenant_member.entity';
import UserSocialAccountMessages from './user_social_account.messages';

/**
 * Merges a synthetic (placeholder-email) federated account INTO a real target
 * account. Used by the no-email completion flow: a user who just logged in via a
 * provider that returns no email (national identity / e-Devlet, Twitter, WeChat …)
 * chooses "I already have an account" and proves ownership of the target.
 *
 * SECURITY: this is account-takeover sensitive. The CALLER MUST have verified
 * ownership of `targetUserId` (e.g. via AuthCredentialService.login) before
 * calling. As a second guardrail we refuse to merge unless the SOURCE account is
 * a synthetic placeholder — so a real account can never be silently absorbed.
 */
export default class SocialIdentityMergeService {
  static async mergeInto(
    targetUserId: string,
    placeholderUserId: string,
    ctx: { tenantId?: string | null; ipAddress?: string | null; userAgent?: string | null } = {},
  ): Promise<void> {
    if (targetUserId === placeholderUserId) {
      throw new AppError(UserSocialAccountMessages.MERGE_SAME_USER, 400, ErrorCode.VALIDATION_ERROR);
    }

    const ds = await getDataSource();
    const placeholder = await ds.getRepository(UserEntity).findOne({ where: { userId: placeholderUserId } });
    const target = await ds.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
    if (!placeholder || !target) {
      throw new AppError(UserSocialAccountMessages.MERGE_USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    }
    // Guardrail: only a synthetic placeholder may be the merge SOURCE.
    if (!SSOService.isPlaceholderEmail(placeholder.email)) {
      throw new AppError(UserSocialAccountMessages.MERGE_SOURCE_NOT_PLACEHOLDER, 400, ErrorCode.VALIDATION_ERROR);
    }

    await ds.transaction(async (mgr) => {
      const socialRepo = mgr.getRepository(UserSocialAccountEntity);
      const memberRepo = mgr.getRepository(TenantMemberEntity);

      // ── Social accounts — move, dropping duplicates the target already has ──
      const [srcAccounts, dstAccounts] = await Promise.all([
        socialRepo.find({ where: { userId: placeholderUserId } }),
        socialRepo.find({ where: { userId: targetUserId } }),
      ]);
      const dstKey = new Set(dstAccounts.map((a) => `${a.provider}:${a.providerId}`));
      for (const acc of srcAccounts) {
        if (dstKey.has(`${acc.provider}:${acc.providerId}`)) {
          await socialRepo.delete({ userSocialAccountId: acc.userSocialAccountId });
        } else {
          await socialRepo.update({ userSocialAccountId: acc.userSocialAccountId }, { userId: targetUserId });
        }
      }

      // ── Tenant memberships — reassign, dropping tenants the target already has ─
      const [srcMembers, dstMembers] = await Promise.all([
        memberRepo.find({ where: { userId: placeholderUserId } }),
        memberRepo.find({ where: { userId: targetUserId } }),
      ]);
      const dstTenants = new Set(dstMembers.map((m) => m.tenantId));
      for (const m of srcMembers) {
        if (dstTenants.has(m.tenantId)) {
          await memberRepo.delete({ tenantMemberId: m.tenantMemberId });
        } else {
          await memberRepo.update({ tenantMemberId: m.tenantMemberId }, { userId: targetUserId });
        }
      }

      // ── Retire the placeholder user ─────────────────────────────────────────
      await mgr.getRepository(UserEntity).softDelete({ userId: placeholderUserId });
    });

    // Invalidate caches touched by the move.
    await Promise.all([
      redis.del(`user:id:${targetUserId}`),
      redis.del(`user:id:${placeholderUserId}`),
      redis.del(`user_social_account:user:${targetUserId}`),
      redis.del(`user_social_account:user:${placeholderUserId}`),
      redis.del(`user:email:${placeholder.email.toLowerCase()}`),
    ].map((p) => p.catch(() => {})));

    await AuditLogService.log({
      tenantId: ctx.tenantId ?? null, actorType: 'USER', actorId: targetUserId,
      action: 'social_identity.merged', resourceType: 'user', resourceId: targetUserId,
      metadata: { mergedFrom: placeholderUserId, mergedFromEmail: placeholder.email },
      ipAddress: ctx.ipAddress ?? undefined, userAgent: ctx.userAgent ?? undefined,
    }).catch((err) => Logger.warn(`social merge audit failed: ${err instanceof Error ? err.message : String(err)}`));
  }
}
