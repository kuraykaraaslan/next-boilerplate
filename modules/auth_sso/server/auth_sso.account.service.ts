import jwt from 'jsonwebtoken';
import { env } from '@nb/env';
import Logger from '@nb/logger';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProfile } from './auth_sso.types';
import SSOMessages from './auth_sso.messages';
import UserSocialAccountService from '@nb/user_social_account/server/user_social_account.service';
import SettingService from '@nb/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { AuditActions } from '@nb/audit_log/server/audit_log.enums';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import SSOFlowService, { type SSOFlowContext } from './auth_sso.flow.service';
import { getProvider } from './providers';
import { AUTH_SSO_SETTING_KEYS } from './auth_sso.setting.keys';

const LINK_STATE_TTL_SECONDS = 600;

interface SSOLinkStatePayload {
  a: 'link';
  uid: string;
  em: string;
  r?: string;
  /** Initiating tenant — drives the tenant-scoped safeReturnPath fallback. */
  t?: string;
}

export default class SSOAccountService {

  static async linkAccount(userId: string, provider: SSOProvider, code: string, ctx: SSOFlowContext = {}): Promise<void> {
    const { profile, tokens } = await SSOFlowService.handleCallback(provider, code, undefined, ctx.tenantId);
    await UserSocialAccountService.link(
      userId, provider, profile.sub, tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined,
    );
    AuditLogService.log({
      tenantId: ctx.tenantId ?? null, actorId: userId, actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
      metadata: { provider, action: 'link' },
    }).catch(() => {});
  }

  static signLinkState(userId: string, email: string, returnPath?: string, tenantId?: string): string {
    const payload: SSOLinkStatePayload = {
      a: 'link', uid: userId, em: email.toLowerCase(),
      ...(returnPath ? { r: returnPath } : {}),
      ...(tenantId ? { t: tenantId } : {}),
    };
    return jwt.sign(payload, env.CSRF_SECRET, { expiresIn: LINK_STATE_TTL_SECONDS });
  }

  static parseLinkState(state: string | null | undefined): SSOLinkStatePayload | null {
    if (!state) return null;
    try {
      const decoded = jwt.verify(state, env.CSRF_SECRET, { algorithms: ['HS256'] }) as Partial<SSOLinkStatePayload> | string;
      if (typeof decoded === 'string') return null;
      if (decoded.a !== 'link' || !decoded.uid || !decoded.em) return null;
      return decoded as SSOLinkStatePayload;
    } catch {
      return null;
    }
  }

  /**
   * Open-redirect guard. App-relative paths only. The fallback is now
   * tenant-scoped (GOODTOHAVE): `/tenant/<tenantId>/admin/me` for the initiating
   * tenant, not the root tenant — so a link-state expiry keeps the user inside
   * their own tenant UI.
   */
  static safeReturnPath(input: string | undefined | null, tenantId?: string): string {
    const fallback = `/tenant/${tenantId ?? ROOT_TENANT_ID}/admin/me`;
    if (!input || typeof input !== 'string') return fallback;
    if (!input.startsWith('/') || input.startsWith('//')) return fallback;
    return input;
  }

  /**
   * Async variant that additionally consults the tenant's `ssoTenantReturnPath`
   * setting as the fallback before defaulting to `/tenant/<tenantId>/admin/me`.
   */
  static async safeReturnPathForTenant(input: string | undefined | null, tenantId?: string): Promise<string> {
    if (input && typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) return input;
    if (tenantId) {
      const configured = await SettingService.getValue(tenantId, AUTH_SSO_SETTING_KEYS.TENANT_RETURN_PATH).catch(() => null);
      if (configured && configured.startsWith('/') && !configured.startsWith('//')) {
        return configured.startsWith('/tenant/') ? configured : `/tenant/${tenantId}${configured}`;
      }
    }
    return `/tenant/${tenantId ?? ROOT_TENANT_ID}/admin/me`;
  }

  static async linkToUser(
    userId: string, expectedEmail: string, provider: SSOProvider, code: string, state?: string, ctx: SSOFlowContext = {},
  ): Promise<{ profile: SSOProfile }> {
    const { profile, tokens } = await SSOFlowService.handleCallback(provider, code, state, ctx.tenantId);
    if (!profile.email) throw new AppError(SSOMessages.EMAIL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new AppError(SSOMessages.EMAIL_MISMATCH, 403, ErrorCode.FORBIDDEN);
    }
    await UserSocialAccountService.link(
      userId, provider, profile.sub, tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined,
    );
    AuditLogService.log({
      tenantId: ctx.tenantId ?? null, actorId: userId, actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
      metadata: { provider, action: 'link_to_user' },
    }).catch(() => {});
    return { profile };
  }

  /**
   * Unlink a social account. GOODTOHAVE (compliance, GDPR Art. 7(3)): revoke the
   * grant at the provider before dropping the local record so the upstream
   * consent is actually withdrawn, not just the local token forgotten.
   */
  static async unlinkAccount(userId: string, provider: SSOProvider): Promise<void> {
    let revoked = false;
    try {
      const accounts = await UserSocialAccountService.getByUserId(userId);
      const account = accounts.find((a) => a.provider === provider);
      if (account) {
        const { accessToken, refreshToken } = await UserSocialAccountService.getRawTokens(account.userSocialAccountId);
        const providerService = getProvider(provider);
        if (providerService.revokeToken) {
          const token = refreshToken ?? accessToken;
          if (token) revoked = await providerService.revokeToken(token, refreshToken ? 'refresh_token' : 'access_token');
        }
      }
    } catch (err: unknown) {
      Logger.warn(`SSOAccount: provider revoke failed for ${provider}: ${err instanceof Error ? err.message : String(err)}`);
    }

    await UserSocialAccountService.unlink(userId, provider);
    AuditLogService.log({
      tenantId: null, actorId: userId, actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
      metadata: { provider, action: 'unlink', providerRevoked: revoked },
    }).catch(() => {});
  }

  static async getLinkedAccounts(userId: string) {
    return UserSocialAccountService.getByUserId(userId);
  }
}
