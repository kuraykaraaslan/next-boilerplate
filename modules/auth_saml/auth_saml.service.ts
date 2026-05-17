import { SAML } from '@node-saml/node-saml';
import { getSystemDataSource, tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { SamlConfig } from './entities/saml_config.entity';
import { SystemSamlConfig } from './entities/system_saml_config.entity';
import {
  SafeSamlConfigSchema,
  SafeSystemSamlConfigSchema,
  type SafeSamlConfig,
  type SafeSystemSamlConfig,
  type SamlProfile,
  type SamlMetadata,
} from './auth_saml.types';
import type { UpsertSamlConfigInput } from './auth_saml.dto';
import SamlMessages from './auth_saml.messages';
import { SAML_NAME_ID_FORMATS } from './auth_saml.enums';
import UserSocialAccountService from '../user_social_account/user_social_account.service';

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
    if (!config) throw new Error(SamlMessages.NOT_CONFIGURED);
    if (!config.isEnabled) throw new Error(SamlMessages.NOT_ENABLED);

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
    if (!config) throw new Error(SamlMessages.NOT_CONFIGURED);
    if (!config.isEnabled) throw new Error(SamlMessages.NOT_ENABLED);
    if (isIdpInitiated && !config.allowIdpInitiated) throw new Error(SamlMessages.IDP_INITIATED_DISABLED);

    const saml = this.buildSaml(config, tenantId);
    const { profile } = await saml.validatePostResponseAsync(body);

    if (!profile) throw new Error(SamlMessages.INVALID_RESPONSE);

    const attrs = (profile as Record<string, unknown>);
    const emailAttr = config.emailAttribute;
    const nameAttr = config.nameAttribute;

    const rawEmail =
      (attrs[emailAttr] as string) ??
      (profile as any).email ??
      (profile as any).nameID ??
      null;

    if (!rawEmail) throw new Error(SamlMessages.EMAIL_MISSING);

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

  // ═══════ System-scope SAML ════════════════════════════════════════════════
  // Mirrors the tenant-scope methods above but reads SystemSamlConfig from the
  // system schema. Used for `/system/admin/me` Connected Accounts linking.

  private static readonly SYSTEM_CACHE_KEY = 'auth_saml:system_config';

  private static async clearSystemCache(): Promise<void> {
    await redis.del(this.SYSTEM_CACHE_KEY).catch(() => {});
  }

  private static async loadSystemConfig(): Promise<SystemSamlConfig | null> {
    const cached = await redis.get(this.SYSTEM_CACHE_KEY).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed === null ? null : (parsed as SystemSamlConfig);
      } catch { await redis.del(this.SYSTEM_CACHE_KEY).catch(() => {}); }
    }

    return singleFlight(this.SYSTEM_CACHE_KEY, async () => {
      const ds = await getSystemDataSource();
      const row = await ds.getRepository(SystemSamlConfig).findOne({ where: {} });
      await redis.setex(this.SYSTEM_CACHE_KEY, jitter(SAML_CACHE_TTL), JSON.stringify(row ?? null)).catch(() => {});
      return row;
    });
  }

  static spSystemEntityId(): string {
    return `${APP_HOST}/system/api/auth/saml/metadata`;
  }

  static acsSystemUrl(): string {
    return `${APP_HOST}/system/api/auth/saml/callback`;
  }

  private static buildSystemSaml(config: SystemSamlConfig): SAML {
    return new SAML({
      callbackUrl: this.acsSystemUrl(),
      entryPoint: config.idpSsoUrl,
      issuer: this.spSystemEntityId(),
      idpCert: config.idpCertificate,
      privateKey: config.spPrivateKey ?? undefined,
      signatureAlgorithm: 'sha256',
      identifierFormat: config.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL,
      wantAssertionsSigned: true,
      acceptedClockSkewMs: 5000,
    });
  }

  static async getSystemConfig(): Promise<SafeSystemSamlConfig | null> {
    const row = await this.loadSystemConfig();
    if (!row) return null;
    return SafeSystemSamlConfigSchema.parse(row);
  }

  static async upsertSystemConfig(input: Partial<UpsertSamlConfigInput>): Promise<SafeSystemSamlConfig> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SystemSamlConfig);

    let row = await repo.findOne({ where: {} });

    if (!row) {
      row = repo.create({
        isEnabled: false,
        idpEntityId: '',
        idpSsoUrl: '',
        idpCertificate: '',
        spPrivateKey: null,
        spCertificate: null,
        emailAttribute: 'email',
        nameAttribute: 'name',
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
    if (input.allowIdpInitiated !== undefined) row.allowIdpInitiated = input.allowIdpInitiated;
    if (input.signRequests !== undefined) row.signRequests = input.signRequests;
    if (input.nameIdFormat !== undefined) row.nameIdFormat = input.nameIdFormat;

    const saved = await repo.save(row);
    await this.clearSystemCache();
    return SafeSystemSamlConfigSchema.parse(saved);
  }

  static async isSystemEnabled(): Promise<boolean> {
    const config = await this.loadSystemConfig();
    return Boolean(config?.isEnabled);
  }

  /** SP metadata XML for the system-scope IdP integration. */
  static async generateSystemMetadata(): Promise<SamlMetadata> {
    const config = await this.loadSystemConfig();
    const decryptionCert = config?.spCertificate ?? null;
    const signingCert = config?.spCertificate ?? null;

    let xml: string;
    if (config) {
      const saml = this.buildSystemSaml(config);
      xml = saml.generateServiceProviderMetadata(decryptionCert, signingCert);
    } else {
      const entityId = this.spSystemEntityId();
      const acs = this.acsSystemUrl();
      xml = `<?xml version="1.0"?>
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

    return {
      entityId: this.spSystemEntityId(),
      acsUrl: this.acsSystemUrl(),
      metadataUrl: `${APP_HOST}/system/api/auth/saml/metadata`,
      xml,
    };
  }

  /** Build the IdP authorize URL for the system-scope SAML flow. */
  static async generateSystemAuthUrl(relayState = ''): Promise<string> {
    const config = await this.loadSystemConfig();
    if (!config) throw new Error(SamlMessages.SYSTEM_NOT_CONFIGURED);
    if (!config.isEnabled) throw new Error(SamlMessages.SYSTEM_NOT_ENABLED);

    const saml = this.buildSystemSaml(config);
    return saml.getAuthorizeUrlAsync(relayState, '', {});
  }

  static async validateSystemCallback(
    body: Record<string, string>,
    isIdpInitiated = false,
  ): Promise<SamlProfile> {
    const config = await this.loadSystemConfig();
    if (!config) throw new Error(SamlMessages.SYSTEM_NOT_CONFIGURED);
    if (!config.isEnabled) throw new Error(SamlMessages.SYSTEM_NOT_ENABLED);
    if (isIdpInitiated && !config.allowIdpInitiated) throw new Error(SamlMessages.IDP_INITIATED_DISABLED);

    const saml = this.buildSystemSaml(config);
    const { profile } = await saml.validatePostResponseAsync(body);
    if (!profile) throw new Error(SamlMessages.INVALID_RESPONSE);

    return this.extractProfile(profile as Record<string, unknown>, config.emailAttribute, config.nameAttribute);
  }

  // ═══════ Profile extraction (shared) ══════════════════════════════════════

  private static extractProfile(
    attrs: Record<string, unknown>,
    emailAttribute: string,
    nameAttribute: string,
  ): SamlProfile {
    const rawEmail =
      (attrs[emailAttribute] as string) ??
      (attrs as any).email ??
      (attrs as any).nameID ??
      null;

    if (!rawEmail) throw new Error(SamlMessages.EMAIL_MISSING);

    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    const rawName = (attrs[nameAttribute] as string | string[] | undefined) ?? null;
    const name = rawName ? (Array.isArray(rawName) ? rawName[0] : rawName) : null;

    const attributes: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'string' || Array.isArray(v)) attributes[k] = v;
    }

    return { email, name, nameId: (attrs as any).nameID ?? email, attributes };
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
    if (!profile.email) throw new Error(SamlMessages.EMAIL_MISSING);
    if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new Error(SamlMessages.EMAIL_MISMATCH);
    }

    await UserSocialAccountService.link(
      userId,
      'saml',
      profile.nameId,
    );
  }
}
