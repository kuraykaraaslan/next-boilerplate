import jwt from 'jsonwebtoken';
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
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import AuditLogService from '../audit_log/audit_log.service';
import { AuditActions } from '../audit_log/audit_log.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const LINK_STATE_TTL_SECONDS = 600;

interface SSOLinkStatePayload {
  /** Action discriminator. */
  a: 'link';
  /** User initiating the link — must match the session at callback time. */
  uid: string;
  /** Email expected back from the provider; mismatch aborts the link. */
  em: string;
  /** App-relative return path the callback should redirect to. Optional. */
  r?: string;
}

/**
 * Domain used for synthesised placeholder emails when the SSO provider does not
 * return one (Apple sometimes, Twitter/X, TikTok, WeChat — never). `.invalid` is
 * the RFC 6761 reserved TLD, so these addresses can never collide with real ones.
 */
const SSO_PLACEHOLDER_DOMAIN = 'noreply.invalid';

export default class SSOService {

  static getAllowedProviders(): SSOProvider[] {
    return getAllowedProviders();
  }

  static generateAuthUrl(provider: SSOProvider, state?: string): string {
    if (!isProviderConfigured(provider)) {
      throw new AppError(SSOMessages.PROVIDER_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);
    }

    const providerService = getProvider(provider);
    return providerService.generateAuthUrl(state);
  }

  static isProviderEnabled(provider: string): boolean {
    const allowedProviders = this.getAllowedProviders();
    return allowedProviders.includes(provider as SSOProvider);
  }

  static async handleCallback(provider: SSOProvider, code: string, state?: string): Promise<{
    profile: SSOProfile;
    tokens: SSOTokens;
  }> {
    if (!code) {
      throw new AppError(SSOMessages.CODE_NOT_FOUND, 400, ErrorCode.VALIDATION_ERROR);
    }

    if (!isProviderConfigured(provider)) {
      throw new AppError(SSOMessages.PROVIDER_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);
    }

    const providerService = getProvider(provider);

    const rawTokens = await providerService.getTokens(code, state);
    const rawProfile = await providerService.getUserInfo(rawTokens.accessToken, rawTokens);

    const tokens = SSOTokensSchema.parse(rawTokens);
    const profile = SSOProfileSchema.parse(rawProfile);

    return { profile, tokens };
  }

  /**
   * Build a stable placeholder email for SSO accounts where the provider
   * does not return one. Format: `${provider}-${sanitizedSub}@noreply.invalid`.
   * Always passes Zod's email check; never collides with real addresses.
   */
  static synthesizeSSOEmail(provider: SSOProvider, sub: string): string {
    const safeSub = String(sub).toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `${provider}-${safeSub}@${SSO_PLACEHOLDER_DOMAIN}`;
  }

  /**
   * Whether an email was synthesized by us because the provider didn't return one.
   * Use this from login flows to prompt the user to add a real address.
   */
  static isPlaceholderEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.toLowerCase().endsWith(`@${SSO_PLACEHOLDER_DOMAIN}`);
  }

  static async authenticateOrRegister(
    provider: SSOProvider,
    code: string,
    state?: string
  ): Promise<{ user: SafeUser; isNewUser: boolean }> {
    const { profile, tokens } = await this.handleCallback(provider, code, state);

    // Some providers (Apple in some flows, Twitter/X, TikTok, WeChat) never return an
    // email. Synthesize one tied to the SSO subject so we can still create the account;
    // the user can replace it later. See `isPlaceholderEmail` for downstream detection.
    const email = profile.email ?? this.synthesizeSSOEmail(provider, profile.sub);
    const emailIsSynthetic = !profile.email;

    // Check if social account exists
    const existingUserId = await UserSocialAccountService.findUserIdByProvider(
      provider,
      profile.sub
    );

    if (existingUserId) {
      // Update tokens and return existing user
      const accounts = await UserSocialAccountService.getByUserId(existingUserId);
      const account = accounts.find(a => a.provider === provider);

      if (account) {
        await UserSocialAccountService.updateTokens(
          account.userSocialAccountId,
          tokens.accessToken,
          tokens.refreshToken ? tokens.refreshToken : undefined
        );
      }

      const user = await UserService.getById(existingUserId);
      AuditLogService.log({
        tenantId: null,
        actorId: user.userId,
        actorType: 'USER',
        action: AuditActions.AUTH_LOGIN,
        metadata: { provider, method: 'sso' },
      }).catch(() => {});
      return { user, isNewUser: false };
    }

    // Only look up by email when it's real — placeholder emails would never match.
    if (!emailIsSynthetic) {
      const existingUser = await UserService.getByEmail(email);

      if (existingUser) {
        // Link social account to existing user
        await UserSocialAccountService.link(
          existingUser.userId,
          provider,
          profile.sub,
          tokens.accessToken,
        );

        const user = await UserService.getById(existingUser.userId);
        AuditLogService.log({
          tenantId: null,
          actorId: user.userId,
          actorType: 'USER',
          action: AuditActions.AUTH_LOGIN,
          metadata: { provider, method: 'sso', emailLinked: true },
        }).catch(() => {});
        return { user, isNewUser: false };
      }
    }

    // Create new user
    const randomPassword = `${profile.sub}_${Date.now()}_${Math.random().toString(36)}`;

    const newUser = await UserService.create({
      email,
      password: randomPassword,
      //name: profile.name || email.split('@')[0]
    });

    // Link social account
    await UserSocialAccountService.link(
      newUser.userId,
      provider,
      profile.sub,
      tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined
    );

    AuditLogService.log({
      tenantId: null,
      actorId: newUser.userId,
      actorType: 'USER',
      action: AuditActions.AUTH_REGISTER,
      metadata: { provider, method: 'sso', emailIsSynthetic },
    }).catch(() => {});

    return { user: newUser, isNewUser: true };
  }

  static async linkAccount(
    userId: string,
    provider: SSOProvider,
    code: string
  ): Promise<void> {
    const { profile, tokens } = await this.handleCallback(provider, code);

    await UserSocialAccountService.link(
      userId,
      provider,
      profile.sub,
      tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined
    );

    AuditLogService.log({
      tenantId: null,
      actorId: userId,
      actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED,
      resourceType: 'sso_account',
      metadata: { provider, action: 'link' },
    }).catch(() => {});
  }

  // ───── Link-from-profile flow (Connected Accounts) ────────────────────────

  /**
   * Build a signed link-intent state for the OAuth round-trip. The callback uses
   * `parseLinkState` to detect this is a link flow (not sign-in) and enforces:
   *   1) the SSO subject's email matches the user's email
   *   2) the link is being applied to the same user that initiated it
   */
  static signLinkState(userId: string, email: string, returnPath?: string): string {
    const payload: SSOLinkStatePayload = {
      a: 'link',
      uid: userId,
      em: email.toLowerCase(),
      ...(returnPath ? { r: returnPath } : {}),
    };
    return jwt.sign(payload, env.CSRF_SECRET, { expiresIn: LINK_STATE_TTL_SECONDS });
  }

  /** Returns the decoded link-state payload, or null if state isn't a valid link token. */
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
   * Safe return path: app-relative only (must start with `/` and not `//`). Falls
   * back to the root-tenant profile so a tampered/expired state can't open
   * redirect.
   */
  static safeReturnPath(input: string | undefined | null): string {
    const fallback = `/tenant/${ROOT_TENANT_ID}/admin/me`;
    if (!input || typeof input !== 'string') return fallback;
    if (!input.startsWith('/') || input.startsWith('//')) return fallback;
    return input;
  }

  /**
   * Complete an OAuth link flow initiated from Connected Accounts. Enforces that
   * the SSO provider's email exactly matches `expectedEmail`. Synthetic / missing
   * emails are rejected — the literal "ancak aynı mail adresi ise" requirement.
   */
  static async linkToUser(
    userId: string,
    expectedEmail: string,
    provider: SSOProvider,
    code: string,
    state?: string
  ): Promise<{ profile: SSOProfile }> {
    const { profile, tokens } = await this.handleCallback(provider, code, state);

    if (!profile.email) {
      throw new AppError(SSOMessages.EMAIL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    }
    if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new AppError(SSOMessages.EMAIL_MISMATCH, 403, ErrorCode.FORBIDDEN);
    }

    await UserSocialAccountService.link(
      userId,
      provider,
      profile.sub,
      tokens.accessToken,
      tokens.refreshToken ? tokens.refreshToken : undefined,
      profile.picture ? profile.picture : undefined,
    );

    AuditLogService.log({
      tenantId: null,
      actorId: userId,
      actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED,
      resourceType: 'sso_account',
      metadata: { provider, action: 'link_to_user' },
    }).catch(() => {});

    return { profile };
  }

  static async unlinkAccount(userId: string, provider: SSOProvider): Promise<void> {
    await UserSocialAccountService.unlink(userId, provider);

    AuditLogService.log({
      tenantId: null,
      actorId: userId,
      actorType: 'USER',
      action: AuditActions.MEMBER_UPDATED,
      resourceType: 'sso_account',
      metadata: { provider, action: 'unlink' },
    }).catch(() => {});
  }

  static async getLinkedAccounts(userId: string) {
    return UserSocialAccountService.getByUserId(userId);
  }
}
