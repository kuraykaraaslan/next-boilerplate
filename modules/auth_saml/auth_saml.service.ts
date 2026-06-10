import { SAML } from '@node-saml/node-saml';
import crypto from 'crypto';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { SamlConfig } from './entities/saml_config.entity';
import {
  SafeSamlConfigSchema,
  type SafeSamlConfig,
  type SamlProfile,
  type SamlMetadata,
} from './auth_saml.types';
import type { UpsertSamlConfigInput } from './auth_saml.dto';
import SamlMessages from './auth_saml.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SAML_NAME_ID_FORMATS } from './auth_saml.enums';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import UserService from '../user/user.service';
import { SafeUserSchema, type SafeUser } from '../user/user.types';
import TenantMemberService from '../tenant_member/tenant_member.service';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import AuditLogService from '../audit_log/audit_log.service';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';
const SAML_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class SamlService {

  private static configCacheKey(tenantId: string): string {
    return `auth_saml:config:${tenantId}`;
  }

  private static async clearCache(tenantId: string): Promise<void> {
    await redis.del(this.configCacheKey(tenantId)).catch(() => {});
  }

  private static async loadConfig(tenantId: string): Promise<SamlConfig | null> {
    const cacheKey = this.configCacheKey(tenantId);
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed === null ? null : (parsed as SamlConfig);
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const row = await ds.getRepository(SamlConfig).findOne({ where: { tenantId } });
      await redis.setex(cacheKey, jitter(SAML_CACHE_TTL), JSON.stringify(row ?? null)).catch(() => {});
      return row;
    });
  }

  static spEntityId(tenantId: string): string {
    return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/metadata`;
  }

  static acsUrl(tenantId: string): string {
    return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/callback`;
  }

  static metadataUrl(tenantId: string): string {
    return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/metadata`;
  }

  private static buildSaml(config: SamlConfig, tenantId: string): SAML {
    return new SAML({
      callbackUrl: this.acsUrl(tenantId),
      entryPoint: config.idpSsoUrl,
      issuer: this.spEntityId(tenantId),
      idpCert: config.idpCertificate,
      privateKey: config.spPrivateKey ?? undefined,
      signatureAlgorithm: 'sha256',
      identifierFormat: config.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL,
      wantAssertionsSigned: true,
      acceptedClockSkewMs: 5000,
    });
  }

  static async getConfig(tenantId: string): Promise<SafeSamlConfig | null> {
    const row = await this.loadConfig(tenantId);
    if (!row) return null;
    return SafeSamlConfigSchema.parse(row);
  }

  static async upsertConfig(tenantId: string, input: UpsertSamlConfigInput): Promise<SafeSamlConfig> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SamlConfig);

    let row = await repo.findOne({ where: { tenantId } });

    if (!row) {
      row = repo.create({
        tenantId,
        isEnabled: false,
        idpEntityId: '',
        idpSsoUrl: '',
        idpCertificate: '',
        spPrivateKey: null,
        spCertificate: null,
        emailAttribute: 'email',
        nameAttribute: 'name',
        roleAttribute: null,
        allowJitProvisioning: false,
        defaultMemberRole: null,
        allowIdpInitiated: false,
        signRequests: false,
        nameIdFormat: SAML_NAME_ID_FORMATS.EMAIL,
      });
    }

    if (input.isEnabled !== undefined) row.isEnabled = input.isEnabled;
    if (input.idpEntityId !== undefined) row.idpEntityId = input.idpEntityId;
    if (input.idpSsoUrl !== undefined) row.idpSsoUrl = input.idpSsoUrl;
    if (input.idpCertificate !== undefined) row.idpCertificate = input.idpCertificate;
    if (input.spPrivateKey !== undefined) row.spPrivateKey = input.spPrivateKey;
    if (input.spCertificate !== undefined) row.spCertificate = input.spCertificate;
    if (input.emailAttribute !== undefined) row.emailAttribute = input.emailAttribute;
    if (input.nameAttribute !== undefined) row.nameAttribute = input.nameAttribute;
    if (input.roleAttribute !== undefined) row.roleAttribute = input.roleAttribute ?? null;
    if (input.allowJitProvisioning !== undefined) row.allowJitProvisioning = input.allowJitProvisioning;
    if (input.defaultMemberRole !== undefined) row.defaultMemberRole = input.defaultMemberRole ?? null;
    if (input.allowIdpInitiated !== undefined) row.allowIdpInitiated = input.allowIdpInitiated;
    if (input.signRequests !== undefined) row.signRequests = input.signRequests;
    if (input.nameIdFormat !== undefined) row.nameIdFormat = input.nameIdFormat;

    const saved = await repo.save(row);
    await this.clearCache(tenantId);
    return SafeSamlConfigSchema.parse(saved);
  }

  static async deleteConfig(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SamlConfig);
    const row = await repo.findOne({ where: { tenantId } });
    if (row) await repo.remove(row);
    await this.clearCache(tenantId);
  }

  static async generateAuthUrl(tenantId: string, relayState = ''): Promise<string> {
    const config = await this.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
    if (!config.isEnabled) throw new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);

    const saml = this.buildSaml(config, tenantId);
    return saml.getAuthorizeUrlAsync(relayState, '', {});
  }

  static async isTenantEnabled(tenantId: string): Promise<boolean> {
    const config = await this.loadConfig(tenantId);
    return Boolean(config?.isEnabled);
  }

  static async validateCallback(
    tenantId: string,
    body: Record<string, string>,
    isIdpInitiated = false,
  ): Promise<SamlProfile> {
    const config = await this.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
    if (!config.isEnabled) throw new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);
    if (isIdpInitiated && !config.allowIdpInitiated) throw new AppError(SamlMessages.IDP_INITIATED_DISABLED, 403, ErrorCode.FORBIDDEN);

    const saml = this.buildSaml(config, tenantId);
    const { profile } = await saml.validatePostResponseAsync(body);

    if (!profile) throw new AppError(SamlMessages.INVALID_RESPONSE, 400, ErrorCode.VALIDATION_ERROR);

    const attrs = (profile as Record<string, unknown>);
    const emailAttr = config.emailAttribute;
    const nameAttr = config.nameAttribute;

    const rawEmail =
      (attrs[emailAttr] as string) ??
      (profile as any).email ??
      (profile as any).nameID ??
      null;

    if (!rawEmail) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    const rawName = (attrs[nameAttr] as string | string[] | undefined) ?? null;
    const name = rawName ? (Array.isArray(rawName) ? rawName[0] : rawName) : null;

    const attributes: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'string' || Array.isArray(v)) attributes[k] = v;
    }

    return { email, name, nameId: (profile as any).nameID ?? email, attributes };
  }

  static async generateMetadata(tenantId: string): Promise<SamlMetadata> {
    const config = await this.loadConfig(tenantId);

    const decryptionCert = config?.spCertificate ?? null;
    const signingCert = config?.spCertificate ?? null;

    let xml: string;
    if (config) {
      const saml = this.buildSaml(config, tenantId);
      xml = saml.generateServiceProviderMetadata(decryptionCert, signingCert);
    } else {
      xml = this.buildMinimalMetadata(tenantId);
    }

    return {
      entityId: this.spEntityId(tenantId),
      acsUrl: this.acsUrl(tenantId),
      metadataUrl: this.metadataUrl(tenantId),
      xml,
    };
  }

  private static buildMinimalMetadata(tenantId: string): string {
    const entityId = this.spEntityId(tenantId);
    const acs = this.acsUrl(tenantId);
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

  // ═══════ Link-from-Connected-Accounts ═════════════════════════════════════

  /**
   * Attach the SAML identity (from a freshly-validated assertion) to a user
   * **only when the assertion email matches `expectedEmail`**. The match is
   * case-insensitive; mismatch throws and the caller redirects back with an
   * error. The provider+providerId uniqueness on user_social_account will
   * also reject attempts to attach the same nameID to a different user.
   */
  static async linkToUser(
    userId: string,
    expectedEmail: string,
    profile: SamlProfile,
  ): Promise<void> {
    if (!profile.email) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);
    if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new AppError(SamlMessages.EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
    }

    await UserSocialAccountService.link(
      userId,
      'saml',
      profile.nameId,
    );
  }

  // ═══════ JIT (Just-In-Time) provisioning ══════════════════════════════════

  /**
   * Derive a TenantMemberRole from the freshly-validated SAML assertion.
   *
   * Resolution order:
   * 1. If `samlConfig.roleAttribute` is set and the profile carries that
   *    attribute, match its value case-insensitively:
   *    – 'owner'  → 'OWNER'
   *    – 'admin'  → 'ADMIN'
   *    – anything else falls through.
   * 2. Otherwise, use `samlConfig.defaultMemberRole` (validated against the
   *    enum) or 'USER' as the final fallback.
   *
   * Array-valued attributes (groups / memberOf) are scanned for any match.
   */
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
    if (fallback === 'OWNER' || fallback === 'ADMIN' || fallback === 'USER') {
      return fallback;
    }
    return 'USER';
  }

  /**
   * Resolve the user + tenant-membership for a freshly-validated SAML
   * assertion. Behaviour is gated by `allowJitProvisioning`:
   *
   *  • Existing user + active member  → return as-is (no-op).
   *  • Existing user, no membership   → create membership (JIT) when
   *                                     allowed; otherwise throw NOT_MEMBER.
   *  • Unknown user                   → create user + membership (JIT) when
   *                                     allowed; otherwise throw NOT_MEMBER.
   *
   * On JIT user creation, any pending TenantInvitation for the email is
   * auto-accepted (overrides the role mapping with the invited role for that
   * specific tenant — invitation-driven onboarding wins).
   *
   * Returns a tuple `[user, didJitProvision]` so callers can branch on
   * welcome-email / audit-log behaviour.
   */
  static async resolveOrProvisionUser(
    tenantId: string,
    profile: SamlProfile,
  ): Promise<{ user: SafeUser; jitProvisioned: boolean; memberCreated: boolean }> {
    const config = await this.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);

    const existingRaw = await UserService.getByEmail(profile.email);
    let user: SafeUser | null = existingRaw ? SafeUserSchema.parse(existingRaw) : null;
    let jitProvisioned = false;

    if (!user) {
      if (!config.allowJitProvisioning) throw new AppError(SamlMessages.NOT_MEMBER, 403, ErrorCode.FORBIDDEN);

      const randomPwd = `saml_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      user = await UserService.create({ email: profile.email, password: randomPwd });
      jitProvisioned = true;

      // Auto-accept any pending invitation for this email (across tenants).
      try { await TenantInvitationService.autoAcceptForEmail(user.userId, user.email); } catch {}

      await AuditLogService.log({
        tenantId,
        actorType: 'SYSTEM',
        action: 'saml.jit_provisioned',
        resourceType: 'user',
        resourceId: user.userId,
        metadata: { email: user.email, nameId: profile.nameId },
      });
    }

    const existingMember = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
      .catch(() => null);

    let memberCreated = false;

    if (!existingMember) {
      if (!config.allowJitProvisioning) throw new AppError(SamlMessages.NOT_MEMBER, 403, ErrorCode.FORBIDDEN);

      const mappedRole = this.mapSamlRoleToMemberRole(profile, config);
      await TenantMemberService.create({
        tenantId,
        userId: user.userId,
        memberRole: mappedRole,
        memberStatus: 'ACTIVE',
      });
      memberCreated = true;

      await AuditLogService.log({
        tenantId,
        actorType: 'SYSTEM',
        action: 'saml.jit_role_mapped',
        resourceType: 'tenant_member',
        resourceId: user.userId,
        metadata: { memberRole: mappedRole, roleAttribute: config.roleAttribute ?? null },
      });
    }

    return { user, jitProvisioned, memberCreated };
  }
}
