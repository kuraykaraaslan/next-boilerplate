import 'reflect-metadata';
import { In } from 'typeorm';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { encryptFieldOpt, decryptFieldOpt } from '@/modules/common/field-encryption';
import Logger from '@/modules/logger';
import { UserSocialAccount as UserSocialAccountEntity } from './entities/user_social_account.entity';
import { SafeUserSocialAccount, SafeUserSocialAccountSchema } from './user_social_account.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserSocialAccountMessages from './user_social_account.messages';
import type { SocialAccountProvider } from './user_social_account.enums';

const SOCIAL_ACCOUNT_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

/** Optional context for tenant-scoped policy / audit / notification. */
export interface SocialLinkContext {
  tenantId?: string;
  expiresAt?: Date | null;
  scopes?: string[];
  notify?: boolean;
}

export default class UserSocialAccountService {

  private static async clearCache(opts: { userId?: string; provider?: SocialAccountProvider; providerId?: string }): Promise<void> {
    const ops: Promise<unknown>[] = [];
    if (opts.userId) ops.push(redis.del(`user_social_account:user:${opts.userId}`));
    if (opts.provider && opts.providerId) {
      ops.push(redis.del(`user_social_account:provider:${opts.provider}:${opts.providerId}`));
    }
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static async getByUserId(userId: string): Promise<SafeUserSocialAccount[]> {
    const cacheKey = `user_social_account:user:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached).map((a: unknown) => SafeUserSocialAccountSchema.parse(a)); }
      catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const accounts = await ds.getRepository(UserSocialAccountEntity).find({ where: { userId } });
      const parsed = accounts.map((a) => SafeUserSocialAccountSchema.parse(a));
      await redis.setex(cacheKey, jitter(SOCIAL_ACCOUNT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getByProviderAndProviderId(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<SafeUserSocialAccount | null> {
    const cacheKey = `user_social_account:provider:${provider}:${providerId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed === null ? null : SafeUserSocialAccountSchema.parse(parsed);
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const account = await ds.getRepository(UserSocialAccountEntity).findOne({
        where: { provider, providerId },
      });
      const result = account ? SafeUserSocialAccountSchema.parse(account) : null;
      await redis.setex(cacheKey, jitter(SOCIAL_ACCOUNT_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  /**
   * Region-aware, allowlist-filtered providers to offer a user: regional hints
   * for the country intersected with the tenant's enabled-provider allowlist.
   */
  static async availableProviders(tenantId: string | undefined, country: string | null | undefined): Promise<string[]> {
    const { regionalProviderHints } = await import('./user_social_account.enums');
    const hints = regionalProviderHints(country);
    const filtered: string[] = [];
    for (const p of hints) {
      if (await this.isProviderAllowed(tenantId, p as SocialAccountProvider)) filtered.push(p);
    }
    return filtered;
  }

  /** Per-tenant enabled-provider allowlist (`socialEnabledProviders` setting). */
  static async isProviderAllowed(tenantId: string | undefined, provider: SocialAccountProvider): Promise<boolean> {
    if (!tenantId) return true;
    try {
      const { default: SettingService } = await import('@/modules/setting/setting.service');
      const raw = await SettingService.getValue(tenantId, 'socialEnabledProviders').catch(() => null);
      if (!raw) return true;
      const allowed = raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
      return allowed.length === 0 || allowed.includes(String(provider).toLowerCase());
    } catch { return true; }
  }

  static async link(
    userId: string,
    provider: SocialAccountProvider,
    providerId: string,
    accessToken?: string,
    refreshToken?: string,
    profilePicture?: string,
    ctx?: SocialLinkContext,
  ): Promise<SafeUserSocialAccount> {
    if (ctx?.tenantId && !(await this.isProviderAllowed(ctx.tenantId, provider))) {
      throw new AppError(UserSocialAccountMessages.PROVIDER_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
    }
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSocialAccountEntity);
    const existing = await repo.findOne({ where: { provider, providerId } });

    if (existing && existing.userId !== userId) {
      throw new AppError(UserSocialAccountMessages.ACCOUNT_ALREADY_LINKED, 409, ErrorCode.CONFLICT);
    }

    if (existing) {
      await repo.update({ userSocialAccountId: existing.userSocialAccountId }, {
        accessToken: accessToken ? encryptFieldOpt(accessToken) : accessToken,
        refreshToken: refreshToken ? encryptFieldOpt(refreshToken) : refreshToken,
        accessTokenExpiresAt: ctx?.expiresAt ?? existing.accessTokenExpiresAt,
        scopes: ctx?.scopes ?? existing.scopes,
        profilePicture,
      });
      const updated = await repo.findOne({ where: { userSocialAccountId: existing.userSocialAccountId } });
      await this.clearCache({ userId, provider, providerId });
      return SafeUserSocialAccountSchema.parse(updated!);
    }

    const account = repo.create({
      userId, provider, providerId, profilePicture,
      accessToken: accessToken ? encryptFieldOpt(accessToken) : accessToken,
      refreshToken: refreshToken ? encryptFieldOpt(refreshToken) : refreshToken,
      accessTokenExpiresAt: ctx?.expiresAt ?? null,
      scopes: ctx?.scopes ?? null,
    });
    const saved = await repo.save(account);
    await this.clearCache({ userId, provider, providerId });

    // First-link side effects: audit, webhook, optional user notification.
    await this.emitLinkEvent('linked', userId, provider, ctx);
    if (ctx?.notify && ctx.tenantId) await this.notifyUser(userId, provider, 'linked', ctx.tenantId);
    return SafeUserSocialAccountSchema.parse(saved);
  }

  private static async emitLinkEvent(
    kind: 'linked' | 'unlinked', userId: string, provider: SocialAccountProvider, ctx?: SocialLinkContext,
  ): Promise<void> {
    try {
      const { default: AuditLogService } = await import('@/modules/audit_log/audit_log.service');
      await AuditLogService.log({
        tenantId: ctx?.tenantId ?? null, actorId: userId, actorType: 'USER',
        action: `social_account.${kind}`, severity: 'medium',
        resourceType: 'user_social_account', resourceId: userId, metadata: { provider },
      });
    } catch (e) { Logger.warn(`[social] audit failed: ${e instanceof Error ? e.message : e}`); }
    try {
      const { default: WebhookService } = await import('@/modules/webhook/webhook.service');
      await WebhookService.dispatchPlatformEvent(`social_account.${kind}` as never, { userId, provider });
    } catch (e) { Logger.warn(`[social] webhook failed: ${e instanceof Error ? e.message : e}`); }
  }

  private static async notifyUser(userId: string, provider: SocialAccountProvider, kind: 'linked' | 'unlinked', tenantId: string): Promise<void> {
    try {
      const { default: UserService } = await import('@/modules/user/user.service');
      const user = await UserService.getById(userId).catch(() => null);
      if (!user?.email) return;
      const { default: NotificationMailQueueService } = await import('@/modules/notification_mail/notification_mail.queue.service');
      const verb = kind === 'linked' ? 'linked to' : 'unlinked from';
      await NotificationMailQueueService.sendMail(
        tenantId, user.email,
        `A social account was ${verb} your account`,
        `<p>The <strong>${provider}</strong> provider was ${verb} your account. If this wasn't you, secure your account immediately.</p>`,
      );
    } catch (e) { Logger.warn(`[social] notify failed: ${e instanceof Error ? e.message : e}`); }
  }

  static async updateTokens(
    userSocialAccountId: string,
    accessToken: string,
    refreshToken?: string,
    opts?: { expiresAt?: Date | null; scopes?: string[] },
  ): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(UserSocialAccountEntity).update(
      { userSocialAccountId },
      {
        accessToken: encryptFieldOpt(accessToken),
        refreshToken: refreshToken ? encryptFieldOpt(refreshToken) : refreshToken,
        ...(opts?.expiresAt !== undefined ? { accessTokenExpiresAt: opts.expiresAt } : {}),
        ...(opts?.scopes !== undefined ? { scopes: opts.scopes } : {}),
        lastRefreshedAt: new Date(),
      }
    );
  }

  /** Whether an access token is expired or within `skewSeconds` of expiry. */
  static isTokenExpired(account: { accessTokenExpiresAt?: Date | null }, skewSeconds = 120): boolean {
    if (!account.accessTokenExpiresAt) return false;
    return new Date(account.accessTokenExpiresAt).getTime() - Date.now() <= skewSeconds * 1000;
  }

  /**
   * Proactively refresh a token when near expiry using a caller-supplied OAuth
   * refresh function (the provider call lives in the auth layer — no mock here).
   * Persists the new tokens + expiry/scopes and returns the fresh access token.
   */
  static async refreshIfNeeded(
    userSocialAccountId: string,
    refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date | null; scopes?: string[] } | null>,
    skewSeconds = 120,
  ): Promise<string | null> {
    const ds = await getDataSource();
    const row = await ds.getRepository(UserSocialAccountEntity).findOne({ where: { userSocialAccountId } });
    if (!row) return null;
    if (!this.isTokenExpired(row, skewSeconds)) {
      return decryptFieldOpt(row.accessToken) as string | null;
    }
    const refreshToken = decryptFieldOpt(row.refreshToken) as string | null;
    if (!refreshToken) return null;
    const refreshed = await refreshFn(refreshToken).catch(() => null);
    if (!refreshed?.accessToken) return null;
    await this.updateTokens(userSocialAccountId, refreshed.accessToken, refreshed.refreshToken, {
      expiresAt: refreshed.expiresAt ?? null, scopes: refreshed.scopes,
    });
    return refreshed.accessToken;
  }

  /** Return raw (decrypted) tokens for internal OAuth flows (token refresh, revocation). */
  static async getRawTokens(
    userSocialAccountId: string,
  ): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const ds = await getDataSource();
    const row = await ds.getRepository(UserSocialAccountEntity).findOne({
      where: { userSocialAccountId },
      select: ['accessToken', 'refreshToken'],
    });
    if (!row) return { accessToken: null, refreshToken: null };
    return {
      accessToken: decryptFieldOpt(row.accessToken) as string | null,
      refreshToken: decryptFieldOpt(row.refreshToken) as string | null,
    };
  }

  static async unlink(userId: string, provider: SocialAccountProvider, ctx?: SocialLinkContext): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSocialAccountEntity);
    const account = await repo.findOne({ where: { userId, provider } });
    if (!account) throw new AppError(UserSocialAccountMessages.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    // Safety: never strip a user's last remaining login method.
    if (await this.isLastLoginMethod(userId, account.userSocialAccountId)) {
      throw new AppError(UserSocialAccountMessages.CANNOT_UNLINK_ONLY_AUTH, 409, ErrorCode.CONFLICT);
    }

    await repo.delete({ userSocialAccountId: account.userSocialAccountId });
    await this.clearCache({ userId, provider, providerId: account.providerId });
    await this.emitLinkEvent('unlinked', userId, provider, ctx);
    if (ctx?.notify && ctx.tenantId) await this.notifyUser(userId, provider, 'unlinked', ctx.tenantId);
  }

  /**
   * True when removing `exceptAccountId` would leave the user with no way to log
   * in — i.e. they have no usable password and no other linked social account.
   */
  static async isLastLoginMethod(userId: string, exceptAccountId: string): Promise<boolean> {
    const ds = await getDataSource();
    const otherSocial = await ds.getRepository(UserSocialAccountEntity).count({ where: { userId } });
    if (otherSocial > 1) return false; // another social account remains
    // No other social account — check for a usable password on the User row.
    try {
      const { User } = await import('@/modules/user/entities/user.entity');
      const user = await ds.getRepository(User).findOne({ where: { userId }, select: ['userId', 'password'] });
      const hasPassword = Boolean(user?.password) && user!.password !== 'ERASED';
      return !hasPassword;
    } catch {
      // Conservative: if we can't verify a password, treat social as last method.
      return otherSocial <= 1;
    }
  }

  static async findUserIdByProvider(
    provider: SocialAccountProvider,
    providerId: string
  ): Promise<string | null> {
    const account = await this.getByProviderAndProviderId(provider, providerId);
    return account?.userId ?? null;
  }

  /** GDPR: delete all social accounts for a user (called on account deletion). */
  static async eraseForUser(userId: string): Promise<number> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSocialAccountEntity);
    const accounts = await repo.find({ where: { userId } });
    if (accounts.length === 0) return 0;
    await repo.delete({ userId });
    await this.clearCache({ userId });
    for (const a of accounts) await this.clearCache({ provider: a.provider as SocialAccountProvider, providerId: a.providerId });
    return accounts.length;
  }

  /**
   * Batch OAuth-token health check across accounts (proactive refresh planning):
   * which accounts are expired / expiring soon.
   */
  static async batchTokenHealth(userSocialAccountIds: string[]): Promise<Array<{ userSocialAccountId: string; provider: string; expired: boolean; expiresAt: Date | null }>> {
    if (userSocialAccountIds.length === 0) return [];
    const ds = await getDataSource();
    const rows = await ds.getRepository(UserSocialAccountEntity).find({ where: { userSocialAccountId: In(userSocialAccountIds) } });
    return rows.map((r) => ({
      userSocialAccountId: r.userSocialAccountId, provider: r.provider,
      expired: this.isTokenExpired(r), expiresAt: r.accessTokenExpiresAt ?? null,
    }));
  }

  /** Tenant-scoped listing: social accounts for every member of a tenant. */
  static async listForTenant(tenantId: string): Promise<SafeUserSocialAccount[]> {
    const ds = await getDataSource();
    const { TenantMember } = await import('@/modules/tenant_member/entities/tenant_member.entity');
    const members = await ds.getRepository(TenantMember).find({ where: { tenantId }, select: ['userId'] });
    const userIds = [...new Set(members.map((m) => m.userId))];
    if (userIds.length === 0) return [];
    const accounts = await ds.getRepository(UserSocialAccountEntity).find({ where: { userId: In(userIds) } });
    return accounts.map((a) => SafeUserSocialAccountSchema.parse(a));
  }
}
