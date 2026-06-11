import { SAML } from '@node-saml/node-saml';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { SamlConfig } from './entities/saml_config.entity';
import { SafeSamlConfigSchema, type SafeSamlConfig } from './auth_saml.types';
import type { UpsertSamlConfigInput } from './auth_saml.dto';
import SamlMessages from './auth_saml.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SAML_NAME_ID_FORMATS } from './auth_saml.enums';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';
const SAML_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class AuthSamlConfigService {

  static configCacheKey(tenantId: string): string {
    return `auth_saml:config:${tenantId}`;
  }

  static async clearCache(tenantId: string): Promise<void> {
    await redis.del(AuthSamlConfigService.configCacheKey(tenantId)).catch(() => {});
  }

  static async loadConfig(tenantId: string): Promise<SamlConfig | null> {
    const cacheKey = AuthSamlConfigService.configCacheKey(tenantId);
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

  static buildSaml(config: SamlConfig, tenantId: string): SAML {
    return new SAML({
      callbackUrl: AuthSamlConfigService.acsUrl(tenantId),
      entryPoint: config.idpSsoUrl,
      issuer: AuthSamlConfigService.spEntityId(tenantId),
      idpCert: config.idpCertificate,
      privateKey: config.spPrivateKey ?? undefined,
      signatureAlgorithm: 'sha256',
      identifierFormat: config.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL,
      wantAssertionsSigned: true,
      acceptedClockSkewMs: 5000,
    });
  }

  static async getConfig(tenantId: string): Promise<SafeSamlConfig | null> {
    const row = await AuthSamlConfigService.loadConfig(tenantId);
    if (!row) return null;
    return SafeSamlConfigSchema.parse(row);
  }

  static async upsertConfig(tenantId: string, input: UpsertSamlConfigInput): Promise<SafeSamlConfig> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SamlConfig);
    let row = await repo.findOne({ where: { tenantId } });
    if (!row) {
      row = repo.create({
        tenantId, isEnabled: false, idpEntityId: '', idpSsoUrl: '',
        idpCertificate: '', spPrivateKey: null, spCertificate: null,
        emailAttribute: 'email', nameAttribute: 'name', roleAttribute: null,
        allowJitProvisioning: false, defaultMemberRole: null,
        allowIdpInitiated: false, signRequests: false,
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
    await AuthSamlConfigService.clearCache(tenantId);
    return SafeSamlConfigSchema.parse(saved);
  }

  static async deleteConfig(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SamlConfig);
    const row = await repo.findOne({ where: { tenantId } });
    if (row) await repo.remove(row);
    await AuthSamlConfigService.clearCache(tenantId);
  }
}
