import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getDataSource } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { User as UserEntity } from '@kuraykaraaslan/user/server/entities/user.entity';
import { UserSocialAccount as UserSocialAccountEntity } from '@kuraykaraaslan/user_social_account/server/entities/user_social_account.entity';
import UserService from '@kuraykaraaslan/user/server/user.service';
import UserSocialAccountService from '@kuraykaraaslan/user_social_account/server/user_social_account.service';
import UserProfileService from '@kuraykaraaslan/user_profile/server/user_profile.service';
import TenantMemberService from '@kuraykaraaslan/tenant_member/server/tenant_member.service';
import { UserConsent as UserConsentEntity } from '@kuraykaraaslan/auth/server/entities/user_consent.entity';
import Logger from '@kuraykaraaslan/logger';
import type { SafeUser } from '@kuraykaraaslan/user/server/user.types';
import { acsSocialProviderKey, type AcsProvider } from './auth_acs.enums';
import type { AcsProfile } from './auth_acs.types';
import AuthAcsConfigService from './auth_acs.config.service';
import AcsMessages from './auth_acs.messages';

/** Placeholder domain shared with auth_sso so SSOFlowService.isPlaceholderEmail recognises ACS users. */
const ACS_PLACEHOLDER_DOMAIN = 'noreply.invalid';

export interface AcsFlowContext {
  tenantId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export default class AuthAcsFlowService {

  /** Synthetic, recognisably-placeholder email for a national-id-only user. */
  static syntheticEmail(provider: AcsProvider, nationalIdHash: string): string {
    return `acs-${provider}-${nationalIdHash}@${ACS_PLACEHOLDER_DOMAIN}`;
  }

  private static fullName(profile: AcsProfile): string | null {
    const parts = [profile.firstName, profile.lastName].filter(Boolean) as string[];
    return parts.length ? parts.join(' ') : null;
  }

  /**
   * Resolve (or JIT-provision) the platform user for a national-identity profile.
   * Identity is keyed on sha256(nationalId) stored in user_social_account under
   * `acs:<provider>`. New users get a synthetic placeholder email (e-Devlet et al.
   * return no email) which the post-login complete-profile flow later upgrades.
   */
  static async resolveOrProvisionUser(
    profile: AcsProfile,
    ctx: AcsFlowContext = {},
  ): Promise<{ user: SafeUser; isNewUser: boolean }> {
    const provider = profile.provider;
    const providerKey = acsSocialProviderKey(provider);
    const config = AuthAcsConfigService.resolveConfig(provider);

    const existingUserId = await UserSocialAccountService.findUserIdByProvider(providerKey, profile.nationalIdHash);
    if (existingUserId) {
      const user = await UserService.getById(existingUserId);
      await AuthAcsFlowService.ensureMembership(ctx.tenantId, existingUserId);
      AuditLogService.log({
        tenantId: ctx.tenantId ?? null, actorId: existingUserId, actorType: 'USER',
        action: 'acs.login_success', resourceType: 'user', resourceId: existingUserId,
        metadata: { provider, country: profile.country, existing: true },
        ipAddress: ctx.ipAddress ?? undefined, userAgent: ctx.userAgent ?? undefined,
      }).catch(() => {});
      return { user, isNewUser: false };
    }

    if (!config.allowJit) throw new AppError(AcsMessages.JIT_DISABLED, 403, ErrorCode.FORBIDDEN);

    const email = AuthAcsFlowService.syntheticEmail(provider, profile.nationalIdHash);
    let userId: string;
    try {
      const ds = await getDataSource();
      userId = await ds.transaction(async (mgr) => {
        const userRepo = mgr.getRepository(UserEntity);
        const socialRepo = mgr.getRepository(UserSocialAccountEntity);

        const randomPwd = `acs_${crypto.randomBytes(24).toString('hex')}`;
        const passwordHash = await bcrypt.hash(randomPwd, 10);
        const createdUser = await userRepo.save(userRepo.create({
          email,
          password: passwordHash,
          userRole: 'USER',
          userStatus: 'ACTIVE',
          country: profile.country.slice(0, 2).toUpperCase(),
        }));

        // National identity link — keyed on the hash, unique on (provider, providerId).
        await socialRepo.save(socialRepo.create({
          userId: createdUser.userId,
          provider: providerKey,
          providerId: profile.nationalIdHash,
        }));

        return createdUser.userId;
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(AcsMessages.JIT_PROVISION_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }

    // Best-effort post-commit side effects (non-critical, idempotent).
    const name = AuthAcsFlowService.fullName(profile);
    if (name) await UserProfileService.upsert(userId, { name }).catch(() => {});
    await AuthAcsFlowService.recordConsent(userId, ctx);
    await AuthAcsFlowService.ensureMembership(ctx.tenantId, userId);
    await AuditLogService.log({
      tenantId: ctx.tenantId ?? null, actorType: 'SYSTEM',
      action: 'acs.jit_provisioned', resourceType: 'user', resourceId: userId,
      metadata: { provider, country: profile.country, emailSynthetic: true },
      ipAddress: ctx.ipAddress ?? undefined, userAgent: ctx.userAgent ?? undefined,
    }).catch(() => {});

    const user = await UserService.getById(userId);
    return { user, isNewUser: true };
  }

  /**
   * Record a verifiable consent row for a JIT-provisioned national-identity user
   * (GDPR Art. 7 / KVKK), matching the auth_sso behaviour. Append-only, best-effort.
   */
  private static async recordConsent(userId: string, ctx: AcsFlowContext): Promise<void> {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(UserConsentEntity);
      await repo.save(repo.create({
        userId,
        tenantId: ctx.tenantId ?? null,
        documentType: 'terms_of_service',
        documentVersion: 'acs-jit-v1',
        locale: null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      }));
    } catch (err) {
      Logger.warn(`auth_acs: consent record failed for ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Create an ACTIVE membership for the tenant if one does not already exist. */
  private static async ensureMembership(tenantId: string | null | undefined, userId: string): Promise<void> {
    if (!tenantId) return;
    const existing = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId })
      .catch(() => null);
    if (existing) return;
    await TenantMemberService
      .create({ tenantId, userId, memberRole: 'USER', memberStatus: 'ACTIVE' } as Parameters<typeof TenantMemberService.create>[0])
      .catch(() => {});
  }

  /**
   * Connected-accounts link flow: attach a national identity to an already
   * authenticated user. The (provider, providerId) unique constraint rejects an
   * identity already bound to a different user (ACCOUNT_ALREADY_LINKED).
   */
  static async linkToUser(userId: string, profile: AcsProfile): Promise<void> {
    await UserSocialAccountService.link(userId, acsSocialProviderKey(profile.provider), profile.nationalIdHash);
  }
}
