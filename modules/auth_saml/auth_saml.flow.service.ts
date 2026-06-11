import crypto from 'crypto';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import SamlMessages from './auth_saml.messages';
import { SamlConfig } from './entities/saml_config.entity';
import { type SamlProfile, type SamlMetadata } from './auth_saml.types';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import UserService from '../user/user.service';
import { SafeUserSchema, type SafeUser } from '../user/user.types';
import TenantMemberService from '../tenant_member/tenant_member.service';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import AuditLogService from '../audit_log/audit_log.service';
import AuthSamlConfigService from './auth_saml.config.service';

export default class AuthSamlFlowService {

  static async generateAuthUrl(tenantId: string, relayState = ''): Promise<string> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
    if (!config.isEnabled) throw new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);
    const saml = AuthSamlConfigService.buildSaml(config, tenantId);
    return saml.getAuthorizeUrlAsync(relayState, '', {});
  }

  static async isTenantEnabled(tenantId: string): Promise<boolean> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    return Boolean(config?.isEnabled);
  }

  static async validateCallback(
    tenantId: string,
    body: Record<string, string>,
    isIdpInitiated = false,
  ): Promise<SamlProfile> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
    if (!config.isEnabled) throw new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);
    if (isIdpInitiated && !config.allowIdpInitiated) throw new AppError(SamlMessages.IDP_INITIATED_DISABLED, 403, ErrorCode.FORBIDDEN);

    const saml = AuthSamlConfigService.buildSaml(config, tenantId);
    const { profile } = await saml.validatePostResponseAsync(body);
    if (!profile) throw new AppError(SamlMessages.INVALID_RESPONSE, 400, ErrorCode.VALIDATION_ERROR);

    const attrs = (profile as Record<string, unknown>);
    const rawEmail =
      (attrs[config.emailAttribute] as string) ??
      (profile as any).email ??
      (profile as any).nameID ??
      null;
    if (!rawEmail) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    const rawName = (attrs[config.nameAttribute] as string | string[] | undefined) ?? null;
    const name = rawName ? (Array.isArray(rawName) ? rawName[0] : rawName) : null;
    const attributes: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'string' || Array.isArray(v)) attributes[k] = v;
    }
    return { email, name, nameId: (profile as any).nameID ?? email, attributes };
  }

  static async generateMetadata(tenantId: string): Promise<SamlMetadata> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    const decryptionCert = config?.spCertificate ?? null;
    const signingCert = config?.spCertificate ?? null;
    let xml: string;
    if (config) {
      const saml = AuthSamlConfigService.buildSaml(config, tenantId);
      xml = saml.generateServiceProviderMetadata(decryptionCert, signingCert);
    } else {
      xml = AuthSamlFlowService.buildMinimalMetadata(tenantId);
    }
    return {
      entityId: AuthSamlConfigService.spEntityId(tenantId),
      acsUrl: AuthSamlConfigService.acsUrl(tenantId),
      metadataUrl: AuthSamlConfigService.metadataUrl(tenantId),
      xml,
    };
  }

  private static buildMinimalMetadata(tenantId: string): string {
    const entityId = AuthSamlConfigService.spEntityId(tenantId);
    const acs = AuthSamlConfigService.acsUrl(tenantId);
    return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acs}"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
  }

  static async linkToUser(userId: string, expectedEmail: string, profile: SamlProfile): Promise<void> {
    if (!profile.email) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);
    if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new AppError(SamlMessages.EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
    }
    await UserSocialAccountService.link(userId, 'saml', profile.nameId);
  }

  static mapSamlRoleToMemberRole(
    profile: SamlProfile,
    config: Pick<SamlConfig, 'roleAttribute' | 'defaultMemberRole'>,
  ): TenantMemberRole {
    const attrName = config.roleAttribute?.trim();
    if (attrName) {
      const raw = profile.attributes[attrName];
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const v of values) {
        const lower = String(v).toLowerCase();
        if (lower.includes('owner')) return 'OWNER';
        if (lower.includes('admin')) return 'ADMIN';
      }
    }
    const fallback = (config.defaultMemberRole ?? '').toUpperCase();
    if (fallback === 'OWNER' || fallback === 'ADMIN' || fallback === 'USER') return fallback;
    return 'USER';
  }

  static async resolveOrProvisionUser(
    tenantId: string,
    profile: SamlProfile,
  ): Promise<{ user: SafeUser; jitProvisioned: boolean; memberCreated: boolean }> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);

    const existingRaw = await UserService.getByEmail(profile.email);
    let user: SafeUser | null = existingRaw ? SafeUserSchema.parse(existingRaw) : null;
    let jitProvisioned = false;

    if (!user) {
      if (!config.allowJitProvisioning) throw new AppError(SamlMessages.NOT_MEMBER, 403, ErrorCode.FORBIDDEN);
      const randomPwd = `saml_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      user = await UserService.create({ email: profile.email, password: randomPwd });
      jitProvisioned = true;
      try { await TenantInvitationService.autoAcceptForEmail(user.userId, user.email); } catch {}
      await AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'saml.jit_provisioned',
        resourceType: 'user', resourceId: user.userId,
        metadata: { email: user.email, nameId: profile.nameId },
      });
    }

    const existingMember = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
      .catch(() => null);
    let memberCreated = false;

    if (!existingMember) {
      if (!config.allowJitProvisioning) throw new AppError(SamlMessages.NOT_MEMBER, 403, ErrorCode.FORBIDDEN);
      const mappedRole = AuthSamlFlowService.mapSamlRoleToMemberRole(profile, config);
      await TenantMemberService.create({ tenantId, userId: user.userId, memberRole: mappedRole, memberStatus: 'ACTIVE' });
      memberCreated = true;
      await AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'saml.jit_role_mapped',
        resourceType: 'tenant_member', resourceId: user.userId,
        metadata: { memberRole: mappedRole, roleAttribute: config.roleAttribute ?? null },
      });
    }

    return { user, jitProvisioned, memberCreated };
  }
}
