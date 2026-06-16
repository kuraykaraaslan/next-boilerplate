import crypto from 'crypto';
import Logger from '@nb/logger';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProfile, SSOTokens, SSOAuthUrlOptions } from './auth_sso.types';
import { SSOProfileSchema, SSOTokensSchema } from './auth_sso.types';
import { getProvider } from './providers';
import SsoConfigService from './auth_sso.config.service';
import SSOMessages from './auth_sso.messages';
import UserSocialAccountService from '@nb/user_social_account/server/user_social_account.service';
import UserService from '@nb/user/server/user.service';
import type { SafeUser } from '@nb/user/server/user.types';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { AuditActions } from '@nb/audit_log/server/audit_log.enums';
import ObservabilityService from '@nb/observability';
import { getDataSource } from '@nb/db';
import { UserConsent as UserConsentEntity } from '@nb/auth/server/entities/user_consent.entity';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const SSO_PLACEHOLDER_DOMAIN = 'noreply.invalid';
/** Default ToS/Privacy version recorded for JIT social-login users when no tenant override exists. */
const DEFAULT_CONSENT_VERSION = 'sso-jit-v1';

export interface SSOFlowContext {
  /** Initiating tenant — gates providers + resolves BYO credentials + consent scope. */
  tenantId?: string;
  /** User locale / Accept-Language for the consent screen (ui_locales). */
  locale?: string;
  /** Known email to pre-fill the provider account selector (login_hint). */
  loginHint?: string;
  /** Request metadata recorded with the consent row. */
  ipAddress?: string;
  userAgent?: string;
}

export default class SSOFlowService {

  /** Effective allowed providers for a tenant (env-allowed narrowed by tenant policy). */
  static async getAllowedProviders(tenantId?: string): Promise<SSOProvider[]> {
    return SsoConfigService.getAllowedProviders(tenantId);
  }

  static async isProviderEnabled(provider: string, tenantId?: string): Promise<boolean> {
    return SsoConfigService.isProviderEnabled(provider as SSOProvider, tenantId);
  }

  /**
   * Build the provider redirect URL. Honours per-tenant gating (disableSocialLogin
   * / ssoAllowedProviders) and locale-aware consent params.
   */
  static async generateAuthUrl(provider: SSOProvider, state?: string, ctx: SSOFlowContext = {}): Promise<string> {
    const configured = await SsoConfigService.isProviderConfigured(provider, ctx.tenantId);
    if (!configured) {
      throw new AppError(SSOMessages.PROVIDER_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);
    }
    if (ctx.tenantId) {
      const enabled = await SsoConfigService.isProviderEnabled(provider, ctx.tenantId);
      if (!enabled) throw new AppError(SSOMessages.PROVIDER_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
    }
    const options: SSOAuthUrlOptions = {};
    if (ctx.locale) options.uiLocales = ctx.locale;
    if (ctx.loginHint) options.loginHint = ctx.loginHint;
    return (await getProvider(provider)).generateAuthUrl(state, options);
  }

  static async handleCallback(
    provider: SSOProvider, code: string, state?: string, tenantId?: string,
  ): Promise<{ profile: SSOProfile; tokens: SSOTokens }> {
    if (!code) throw new AppError(SSOMessages.CODE_NOT_FOUND, 400, ErrorCode.VALIDATION_ERROR);
    const configured = await SsoConfigService.isProviderConfigured(provider, tenantId);
    if (!configured) throw new AppError(SSOMessages.PROVIDER_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);

    const providerService = await getProvider(provider);
    const rawTokens = await providerService.getTokens(code, state);
    const rawProfile = await providerService.getUserInfo(rawTokens.accessToken, rawTokens);

    return { profile: SSOProfileSchema.parse(rawProfile), tokens: SSOTokensSchema.parse(rawTokens) };
  }

  static synthesizeSSOEmail(provider: SSOProvider, sub: string): string {
    const safeSub = String(sub).toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `${provider}-${safeSub}@${SSO_PLACEHOLDER_DOMAIN}`;
  }

  static isPlaceholderEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.toLowerCase().endsWith(`@${SSO_PLACEHOLDER_DOMAIN}`);
  }

  /**
   * GOODTOHAVE (security): cryptographically strong throwaway password for JIT
   * SSO users. Replaces `Math.random()` (PCI-DSS 6.2.4 / OWASP). 32 bytes of
   * CSPRNG entropy, hex-encoded.
   */
  private static generateRandomPassword(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static recordLoginMetric(
    provider: SSOProvider, tenantId: string | undefined, outcome: 'success' | 'failure', detail?: string,
  ): void {
    try {
      ObservabilityService.recordTenantUsage({
        tenantId: tenantId ?? ROOT_TENANT_ID,
        metric: `sso_login_${outcome}:${provider}${detail ? `:${detail}` : ''}`,
        value: 1,
      });
    } catch (err: unknown) {
      Logger.warn(`SSOFlow: metric emit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * GOODTOHAVE (compliance): record a verifiable consent row for a JIT-created
   * social-login user (GDPR Art. 7 / KVKK / LGPD). Reuses the auth module's
   * UserConsent entity — append-only. Best-effort; never blocks registration.
   */
  private static async recordSsoConsent(userId: string, ctx: SSOFlowContext): Promise<void> {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(UserConsentEntity);
      await repo.save(repo.create({
        userId,
        tenantId: ctx.tenantId ?? null,
        documentType: 'terms_of_service',
        documentVersion: DEFAULT_CONSENT_VERSION,
        locale: ctx.locale ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      }));
    } catch (err: unknown) {
      Logger.warn(`SSOFlow: consent record failed for ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  static async authenticateOrRegister(
    provider: SSOProvider, code: string, state?: string, ctx: SSOFlowContext = {},
  ): Promise<{ user: SafeUser; isNewUser: boolean }> {
    // Per-tenant gating: a tenant with disableSocialLogin / a restricted
    // allow-list cannot authenticate via this module.
    if (ctx.tenantId) {
      const enabled = await SsoConfigService.isProviderEnabled(provider, ctx.tenantId);
      if (!enabled) {
        SSOFlowService.recordLoginMetric(provider, ctx.tenantId, 'failure', 'not_allowed');
        throw new AppError(SSOMessages.PROVIDER_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
      }
    }

    let profile: SSOProfile;
    let tokens: SSOTokens;
    try {
      ({ profile, tokens } = await SSOFlowService.handleCallback(provider, code, state, ctx.tenantId));
    } catch (err) {
      SSOFlowService.recordLoginMetric(provider, ctx.tenantId, 'failure', 'callback');
      throw err;
    }

    const email = profile.email ?? SSOFlowService.synthesizeSSOEmail(provider, profile.sub);
    const emailIsSynthetic = !profile.email;

    const existingUserId = await UserSocialAccountService.findUserIdByProvider(provider, profile.sub);

    if (existingUserId) {
      const accounts = await UserSocialAccountService.getByUserId(existingUserId);
      const account = accounts.find((a) => a.provider === provider);
      if (account) {
        await UserSocialAccountService.updateTokens(
          account.userSocialAccountId, tokens.accessToken,
          tokens.refreshToken ? tokens.refreshToken : undefined,
        );
      }
      const user = await UserService.getById(existingUserId);
      AuditLogService.log({
        tenantId: ctx.tenantId ?? null, actorId: user.userId, actorType: 'USER',
        action: AuditActions.AUTH_LOGIN, metadata: { provider, method: 'sso' },
        ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
      }).catch(() => {});
      SSOFlowService.recordLoginMetric(provider, ctx.tenantId, 'success', 'existing');
      return { user, isNewUser: false };
    }

    if (!emailIsSynthetic) {
      const existingUser = await UserService.getByEmail(email);
      if (existingUser) {
        await UserSocialAccountService.link(existingUser.userId, provider, profile.sub, tokens.accessToken);
        const user = await UserService.getById(existingUser.userId);
        AuditLogService.log({
          tenantId: ctx.tenantId ?? null, actorId: user.userId, actorType: 'USER',
          action: AuditActions.AUTH_LOGIN, metadata: { provider, method: 'sso', emailLinked: true },
          ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
        }).catch(() => {});
        SSOFlowService.recordLoginMetric(provider, ctx.tenantId, 'success', 'email_linked');
        return { user, isNewUser: false };
      }
    }

    const randomPassword = SSOFlowService.generateRandomPassword();
    const newUser = await UserService.create({ email, password: randomPassword });
    await UserSocialAccountService.link(
      newUser.userId, provider, profile.sub, tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined,
    );
    // GOODTOHAVE (compliance): capture consent at JIT registration.
    await SSOFlowService.recordSsoConsent(newUser.userId, ctx);
    AuditLogService.log({
      tenantId: ctx.tenantId ?? null, actorId: newUser.userId, actorType: 'USER',
      action: AuditActions.AUTH_REGISTER, metadata: { provider, method: 'sso', emailIsSynthetic },
      ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
    }).catch(() => {});
    SSOFlowService.recordLoginMetric(provider, ctx.tenantId, 'success', 'registered');
    return { user: newUser, isNewUser: true };
  }

  /**
   * GOODTOHAVE (security): rotate/revalidate the stored refresh token for a
   * linked social account. Returns true when fresh tokens were obtained and
   * persisted; false when the grant is stale/revoked (caller may prompt re-link).
   */
  static async refreshLinkedAccount(userId: string, provider: SSOProvider): Promise<boolean> {
    const accounts = await UserSocialAccountService.getByUserId(userId);
    const account = accounts.find((a) => a.provider === provider);
    if (!account) return false;

    const { refreshToken } = await UserSocialAccountService.getRawTokens(account.userSocialAccountId);
    if (!refreshToken) return false;

    const providerService = await getProvider(provider);
    if (!providerService.refreshTokens) return false;

    const fresh = await providerService.refreshTokens(refreshToken);
    if (!fresh?.accessToken) {
      AuditLogService.log({
        tenantId: null, actorId: userId, actorType: 'SYSTEM',
        action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
        metadata: { provider, action: 'refresh_failed', stale: true },
      }).catch(() => {});
      return false;
    }

    await UserSocialAccountService.updateTokens(
      account.userSocialAccountId, fresh.accessToken,
      fresh.refreshToken ?? refreshToken,
    );
    return true;
  }
}
