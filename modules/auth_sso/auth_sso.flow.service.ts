import { env } from '@/modules/env';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProfile, SSOTokens } from './auth_sso.types';
import { SSOProfileSchema, SSOTokensSchema } from './auth_sso.types';
import { getProvider } from './providers';
import { getAllowedProviders, isProviderConfigured } from './auth_sso.config';
import SSOMessages from './auth_sso.messages';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import UserService from '../user/user.service';
import type { SafeUser } from '../user/user.types';
import AuditLogService from '../audit_log/audit_log.service';
import { AuditActions } from '../audit_log/audit_log.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const SSO_PLACEHOLDER_DOMAIN = 'noreply.invalid';

export default class SSOFlowService {

  static getAllowedProviders(): SSOProvider[] {
    return getAllowedProviders();
  }

  static generateAuthUrl(provider: SSOProvider, state?: string): string {
    if (!isProviderConfigured(provider)) {
      throw new AppError(SSOMessages.PROVIDER_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);
    }
    return getProvider(provider).generateAuthUrl(state);
  }

  static isProviderEnabled(provider: string): boolean {
    return SSOFlowService.getAllowedProviders().includes(provider as SSOProvider);
  }

  static async handleCallback(provider: SSOProvider, code: string, state?: string): Promise<{
    profile: SSOProfile;
    tokens: SSOTokens;
  }> {
    if (!code) throw new AppError(SSOMessages.CODE_NOT_FOUND, 400, ErrorCode.VALIDATION_ERROR);
    if (!isProviderConfigured(provider)) throw new AppError(SSOMessages.PROVIDER_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);

    const providerService = getProvider(provider);
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

  static async authenticateOrRegister(
    provider: SSOProvider, code: string, state?: string,
  ): Promise<{ user: SafeUser; isNewUser: boolean }> {
    const { profile, tokens } = await SSOFlowService.handleCallback(provider, code, state);

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
        tenantId: null, actorId: user.userId, actorType: 'USER',
        action: AuditActions.AUTH_LOGIN, metadata: { provider, method: 'sso' },
      }).catch(() => {});
      return { user, isNewUser: false };
    }

    if (!emailIsSynthetic) {
      const existingUser = await UserService.getByEmail(email);
      if (existingUser) {
        await UserSocialAccountService.link(existingUser.userId, provider, profile.sub, tokens.accessToken);
        const user = await UserService.getById(existingUser.userId);
        AuditLogService.log({
          tenantId: null, actorId: user.userId, actorType: 'USER',
          action: AuditActions.AUTH_LOGIN, metadata: { provider, method: 'sso', emailLinked: true },
        }).catch(() => {});
        return { user, isNewUser: false };
      }
    }

    const randomPassword = `${profile.sub}_${Date.now()}_${Math.random().toString(36)}`;
    const newUser = await UserService.create({ email, password: randomPassword });
    await UserSocialAccountService.link(
      newUser.userId, provider, profile.sub, tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined,
    );
    AuditLogService.log({
      tenantId: null, actorId: newUser.userId, actorType: 'USER',
      action: AuditActions.AUTH_REGISTER, metadata: { provider, method: 'sso', emailIsSynthetic },
    }).catch(() => {});
    return { user: newUser, isNewUser: true };
  }
}
