import jwt from 'jsonwebtoken';
import { env } from '@/modules/env';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProfile } from './auth_sso.types';
import SSOMessages from './auth_sso.messages';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import AuditLogService from '../audit_log/audit_log.service';
import { AuditActions } from '../audit_log/audit_log.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import SSOFlowService from './auth_sso.flow.service';

const LINK_STATE_TTL_SECONDS = 600;

interface SSOLinkStatePayload {
  a: 'link';
  uid: string;
  em: string;
  r?: string;
}

export default class SSOAccountService {

  static async linkAccount(userId: string, provider: SSOProvider, code: string): Promise<void> {
    const { profile, tokens } = await SSOFlowService.handleCallback(provider, code);
    await UserSocialAccountService.link(
      userId, provider, profile.sub, tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined,
    );
    AuditLogService.log({
      tenantId: null, actorId: userId, actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
      metadata: { provider, action: 'link' },
    }).catch(() => {});
  }

  static signLinkState(userId: string, email: string, returnPath?: string): string {
    const payload: SSOLinkStatePayload = {
      a: 'link', uid: userId, em: email.toLowerCase(),
      ...(returnPath ? { r: returnPath } : {}),
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

  static safeReturnPath(input: string | undefined | null): string {
    const fallback = `/tenant/${ROOT_TENANT_ID}/admin/me`;
    if (!input || typeof input !== 'string') return fallback;
    if (!input.startsWith('/') || input.startsWith('//')) return fallback;
    return input;
  }

  static async linkToUser(
    userId: string, expectedEmail: string, provider: SSOProvider, code: string, state?: string,
  ): Promise<{ profile: SSOProfile }> {
    const { profile, tokens } = await SSOFlowService.handleCallback(provider, code, state);
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
      tenantId: null, actorId: userId, actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
      metadata: { provider, action: 'link_to_user' },
    }).catch(() => {});
    return { profile };
  }

  static async unlinkAccount(userId: string, provider: SSOProvider): Promise<void> {
    await UserSocialAccountService.unlink(userId, provider);
    AuditLogService.log({
      tenantId: null, actorId: userId, actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED, resourceType: 'sso_account',
      metadata: { provider, action: 'unlink' },
    }).catch(() => {});
  }

  static async getLinkedAccounts(userId: string) {
    return UserSocialAccountService.getByUserId(userId);
  }
}
