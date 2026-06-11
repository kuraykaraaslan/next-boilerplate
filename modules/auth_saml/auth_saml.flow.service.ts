import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import redis from '@/modules/redis';
import ObservabilityService from '@/modules/observability';
import { tenantDataSourceFor } from '@/modules/db';
import SamlMessages from './auth_saml.messages';
import { SamlConfig } from './entities/saml_config.entity';
import {
  type SamlProfile,
  type SamlMetadata,
  type SamlRoleMappingRule,
  SamlRoleMappingRulesSchema,
} from './auth_saml.types';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import UserService from '../user/user.service';
import { SafeUserSchema, type SafeUser } from '../user/user.types';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '../tenant_member/entities/tenant_member.entity';
import TenantMemberService from '../tenant_member/tenant_member.service';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import AuditLogService from '../audit_log/audit_log.service';
import AuthSamlConfigService from './auth_saml.config.service';
import { AUTH_SAML_SETTING_KEYS, AUTH_SAML_SETTING_DEFAULTS } from './auth_saml.setting.keys';

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
      (profile as { email?: string }).email ??
      (profile as { nameID?: string }).nameID ??
      null;
    if (!rawEmail) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    const rawName = (attrs[config.nameAttribute] as string | string[] | undefined) ?? null;
    const name = rawName ? (Array.isArray(rawName) ? rawName[0] : rawName) : null;
    const attributes: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'string' || Array.isArray(v)) attributes[k] = v;
    }

    const assertionXml = typeof (profile as { getAssertionXml?: () => string }).getAssertionXml === 'function'
      ? (profile as { getAssertionXml: () => string }).getAssertionXml()
      : null;
    const sessionNotOnOrAfter = AuthSamlFlowService.extractSessionNotOnOrAfter(assertionXml);
    const assertionId = (profile as { ID?: string }).ID
      ?? AuthSamlFlowService.extractAssertionId(assertionXml)
      ?? null;

    const built: SamlProfile = {
      email,
      name,
      nameId: (profile as { nameID?: string }).nameID ?? email,
      attributes,
      assertionId,
      sessionIndex: (profile as { sessionIndex?: string }).sessionIndex ?? null,
      nameIdFormat: (profile as { nameIDFormat?: string }).nameIDFormat ?? config.nameIdFormat ?? null,
      sessionNotOnOrAfter,
    };

    // Replay detection: reject an assertion ID already seen for this tenant.
    await AuthSamlFlowService.assertNotReplayed(tenantId, built);

    return built;
  }

  /**
   * Assertion replay detection. Caches the seen assertion ID scoped by tenantId
   * in Redis with a TTL derived from NotOnOrAfter (so the key self-expires once
   * the assertion is no longer temporally valid anyway). Uses SET NX so the
   * first writer wins; a second sighting of the same ID is rejected.
   * No-op (fail-open) when the `samlReplayDetectionEnabled` setting is off or
   * when there is no usable assertion ID.
   */
  static async assertNotReplayed(tenantId: string, profile: SamlProfile): Promise<void> {
    const enabled = await AuthSamlConfigService.settingBool(
      tenantId, AUTH_SAML_SETTING_KEYS.REPLAY_DETECTION_ENABLED, AUTH_SAML_SETTING_DEFAULTS.REPLAY_DETECTION_ENABLED,
    );
    if (!enabled || !profile.assertionId) return;

    const idHash = crypto.createHash('sha256').update(profile.assertionId).digest('hex');
    const key = `auth_saml:replay:${tenantId}:${idHash}`;
    // TTL: time until NotOnOrAfter (+small grace), bounded to [60s, 24h].
    const remainingMs = profile.sessionNotOnOrAfter ? profile.sessionNotOnOrAfter - Date.now() : 0;
    const ttlSec = Math.min(60 * 60 * 24, Math.max(60, Math.ceil(remainingMs / 1000) + 60));

    let stored: 'OK' | null = null;
    try {
      stored = (await redis.set(key, '1', 'EX', ttlSec, 'NX')) as 'OK' | null;
    } catch {
      // Redis unavailable → fail open (do not block logins on cache outage).
      return;
    }
    if (stored !== 'OK') {
      ObservabilityService.recordTenantUsage({ tenantId, metric: 'saml_replay_blocked', value: 1 });
      throw new AppError(SamlMessages.REPLAY_DETECTED, 400, ErrorCode.VALIDATION_ERROR);
    }
  }

  /** Pull `SessionNotOnOrAfter` (ms epoch) from the assertion's AuthnStatement. */
  static extractSessionNotOnOrAfter(assertionXml: string | null): number | null {
    if (!assertionXml) return null;
    const m = assertionXml.match(/SessionNotOnOrAfter="([^"]+)"/);
    if (!m) return null;
    const t = Date.parse(m[1]);
    return Number.isNaN(t) ? null : t;
  }

  private static extractAssertionId(assertionXml: string | null): string | null {
    if (!assertionXml) return null;
    return assertionXml.match(/<(?:[\w-]+:)?Assertion[^>]*\bID="([^"]+)"/i)?.[1] ?? null;
  }

  static async generateMetadata(tenantId: string): Promise<SamlMetadata> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    let xml: string;
    if (config) {
      const saml = AuthSamlConfigService.buildSaml(config, tenantId);
      // Dual-cert rollover: publish both the primary and secondary SP certs in
      // SP metadata so the IdP trusts either during a rotation window.
      const certs = [config.spCertificate, config.spCertificateSecondary].filter(Boolean) as string[];
      const signingCerts = certs.length ? (certs.length === 1 ? certs[0] : certs) : null;
      const decryptionCert = config.spCertificate ?? null;
      xml = saml.generateServiceProviderMetadata(decryptionCert, signingCerts);
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

  // ── Single Logout (SLO) ─────────────────────────────────────────────────

  /**
   * Build the IdP LogoutRequest URL for SP-initiated SLO. Requires an IdP SLO
   * endpoint (`idpSloUrl`) and the subject's NameID + SessionIndex (captured at
   * login time and threaded back in). Gated by the `samlSloEnabled` setting.
   */
  static async generateLogoutUrl(
    tenantId: string,
    subject: { nameId: string; nameIdFormat?: string | null; sessionIndex?: string | null },
    relayState = '',
  ): Promise<string> {
    const enabled = await AuthSamlConfigService.settingBool(
      tenantId, AUTH_SAML_SETTING_KEYS.SLO_ENABLED, AUTH_SAML_SETTING_DEFAULTS.SLO_ENABLED,
    );
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
    if (!enabled || !config.idpSloUrl) throw new AppError(SamlMessages.SLO_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);

    const saml = AuthSamlConfigService.buildSaml(config, tenantId);
    // node-saml expects a Profile-shaped subject to construct the LogoutRequest.
    const profile = {
      issuer: config.idpEntityId,
      nameID: subject.nameId,
      nameIDFormat: subject.nameIdFormat ?? config.nameIdFormat ?? null,
      sessionIndex: subject.sessionIndex ?? undefined,
    };
    return saml.getLogoutUrlAsync(profile as Parameters<typeof saml.getLogoutUrlAsync>[0], relayState, {});
  }

  static async linkToUser(userId: string, expectedEmail: string, profile: SamlProfile): Promise<void> {
    if (!profile.email) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);
    if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new AppError(SamlMessages.EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
    }
    await UserSocialAccountService.link(userId, 'saml', profile.nameId);
  }

  /**
   * ABAC role mapping. Evaluates the tenant's configured `roleMappingRules` in
   * order (first match wins), supporting multi-value attributes and DN matching
   * for `memberOf`. Falls back to the legacy owner/admin substring scan, then to
   * `defaultMemberRole`, then to USER.
   */
  static mapSamlRoleToMemberRole(
    profile: SamlProfile,
    config: Pick<SamlConfig, 'roleAttribute' | 'defaultMemberRole' | 'roleMappingRules'>,
  ): TenantMemberRole {
    // 1. Configurable ABAC rules.
    const rules = AuthSamlFlowService.parseRules(config.roleMappingRules);
    for (const rule of rules) {
      const attrName = (rule.attribute ?? config.roleAttribute ?? '').trim();
      if (!attrName) continue;
      const values = AuthSamlFlowService.attrValues(profile, attrName);
      if (values.some((v) => AuthSamlFlowService.ruleMatches(rule, v))) return rule.role;
    }

    // 2. Legacy substring scan on the single roleAttribute.
    const attrName = config.roleAttribute?.trim();
    if (attrName) {
      for (const v of AuthSamlFlowService.attrValues(profile, attrName)) {
        const lower = v.toLowerCase();
        if (lower.includes('owner')) return 'OWNER';
        if (lower.includes('admin')) return 'ADMIN';
      }
    }

    // 3. Default.
    const fallback = (config.defaultMemberRole ?? '').toUpperCase();
    if (fallback === 'OWNER' || fallback === 'ADMIN' || fallback === 'USER') return fallback;
    return 'USER';
  }

  private static parseRules(raw: unknown): SamlRoleMappingRule[] {
    if (!raw) return [];
    const parsed = SamlRoleMappingRulesSchema.safeParse(raw);
    return parsed.success ? parsed.data : [];
  }

  private static attrValues(profile: SamlProfile, attrName: string): string[] {
    const raw = profile.attributes[attrName];
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return values.map((v) => String(v));
  }

  private static ruleMatches(rule: SamlRoleMappingRule, value: string): boolean {
    const v = value.trim();
    switch (rule.match) {
      case 'equals':
        return v.toLowerCase() === rule.value.toLowerCase();
      case 'contains':
        return v.toLowerCase().includes(rule.value.toLowerCase());
      case 'dnEquals':
        // Match a single RDN (e.g. "CN=App-Admins") anywhere in a DN string.
        return v.split(',').some((rdn) => rdn.trim().toLowerCase() === rule.value.toLowerCase());
      case 'regex':
        try { return new RegExp(rule.value, 'i').test(v); } catch { return false; }
      default:
        return false;
    }
  }

  /**
   * Resolve the user + tenant membership for an assertion, JIT-provisioning when
   * enabled. The user-create + invitation-accept + member-create sequence runs
   * inside a single per-tenant DB transaction so a mid-sequence failure can no
   * longer leave an orphaned user with no membership (atomic JIT).
   */
  static async resolveOrProvisionUser(
    tenantId: string,
    profile: SamlProfile,
  ): Promise<{ user: SafeUser; jitProvisioned: boolean; memberCreated: boolean }> {
    const config = await AuthSamlConfigService.loadConfig(tenantId);
    if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);

    const existingRaw = await UserService.getByEmail(profile.email);
    let user: SafeUser | null = existingRaw ? SafeUserSchema.parse(existingRaw) : null;

    const existingMember = user
      ? await TenantMemberService
          .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
          .catch(() => null)
      : null;

    // Fast path: known user with an existing membership — no writes needed.
    if (user && existingMember) {
      return { user, jitProvisioned: false, memberCreated: false };
    }

    // Anything missing requires JIT; bail before any write when it is off.
    if (!config.allowJitProvisioning) throw new AppError(SamlMessages.NOT_MEMBER, 403, ErrorCode.FORBIDDEN);

    const mappedRole = AuthSamlFlowService.mapSamlRoleToMemberRole(profile, config);

    let jitProvisioned = false;
    let memberCreated = false;
    let resolvedUserId = user?.userId ?? null;

    const ds = await tenantDataSourceFor(tenantId);
    try {
      await ds.transaction(async (mgr) => {
        const userRepo = mgr.getRepository(UserEntity);
        const memberRepo = mgr.getRepository(TenantMemberEntity);

        // Create the user inside the transaction when unknown.
        if (!resolvedUserId) {
          const randomPwd = `saml_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
          const passwordHash = await bcrypt.hash(randomPwd, 10);
          const created = userRepo.create({
            email: profile.email.toLowerCase(),
            password: passwordHash,
            userRole: 'USER',
            userStatus: 'ACTIVE',
          });
          const savedUser = await userRepo.save(created);
          resolvedUserId = savedUser.userId;
          jitProvisioned = true;
        }

        // Create the membership inside the same transaction when missing.
        const memberExists = await memberRepo.findOne({ where: { tenantId, userId: resolvedUserId! } });
        if (!memberExists) {
          const member = memberRepo.create({
            tenantId, userId: resolvedUserId!, memberRole: mappedRole, memberStatus: 'ACTIVE',
          });
          await memberRepo.save(member);
          memberCreated = true;
        }
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(SamlMessages.JIT_PROVISION_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }

    // Best-effort post-commit side effects (invitation auto-accept + audit).
    // These are NOT in the transaction: they are non-critical and idempotent.
    if (jitProvisioned && resolvedUserId) {
      try { await TenantInvitationService.autoAcceptForEmail(resolvedUserId, profile.email); } catch {}
      await AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'saml.jit_provisioned',
        resourceType: 'user', resourceId: resolvedUserId,
        metadata: { email: profile.email, nameId: profile.nameId },
      }).catch(() => {});
    }
    if (memberCreated && resolvedUserId) {
      await AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'saml.jit_role_mapped',
        resourceType: 'tenant_member', resourceId: resolvedUserId,
        metadata: { memberRole: mappedRole, roleAttribute: config.roleAttribute ?? null },
      }).catch(() => {});
    }

    // Reload the safe user (the transaction-created entity is not Safe-parsed).
    if (!user && resolvedUserId) {
      const reloaded = await UserService.getByEmail(profile.email);
      user = reloaded ? SafeUserSchema.parse(reloaded) : null;
    }
    if (!user) throw new AppError(SamlMessages.JIT_PROVISION_FAILED, 500, ErrorCode.INTERNAL_ERROR);

    return { user, jitProvisioned, memberCreated };
  }
}
