import { tenantDataSourceFor } from '@nb/db';
import Logger from '@nb/logger';
import ObservabilityService from '@nb/observability';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { SamlConfig } from './entities/saml_config.entity';
import { SafeSamlConfigSchema, type SafeSamlConfig } from './auth_saml.types';
import type { UpsertSamlConfigInput, ImportSamlMetadataInput } from './auth_saml.dto';
import SamlMessages from './auth_saml.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { SAML_NAME_ID_FORMATS } from './auth_saml.enums';
import AuthSamlCryptoService from './auth_saml.crypto.service';
import AuthSamlMetadataService from './auth_saml.metadata.service';
import { AUTH_SAML_SETTING_KEYS, AUTH_SAML_SETTING_DEFAULTS } from './auth_saml.setting.keys';
import { loadConfig, clearCache, settingBool, settingNumber } from './auth_saml.config.helpers';

export async function getConfig(tenantId: string): Promise<SafeSamlConfig | null> {
  const row = await loadConfig(tenantId);
  if (!row) return null;
  return SafeSamlConfigSchema.parse(row);
}

export async function upsertConfig(tenantId: string, input: UpsertSamlConfigInput): Promise<SafeSamlConfig> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SamlConfig);
  let row = await repo.findOne({ where: { tenantId } });
  const isNew = !row;
  if (!row) {
    row = repo.create({
      tenantId, isEnabled: false, idpEntityId: '', idpSsoUrl: '',
      idpCertificate: '', idpSloUrl: '', idpMetadataUrl: '', idpCertNotAfter: null,
      spPrivateKey: null, spCertificate: null,
      spPrivateKeySecondary: null, spCertificateSecondary: null,
      emailAttribute: 'email', nameAttribute: 'name', roleAttribute: null, roleMappingRules: null,
      allowJitProvisioning: false, defaultMemberRole: null,
      allowIdpInitiated: false, signRequests: false,
      signatureAlgorithm: 'sha256', clockSkewMs: 5000,
      wantAssertionsSigned: true, honorSessionNotOnOrAfter: true,
      nameIdFormat: SAML_NAME_ID_FORMATS.EMAIL,
    });
  }
  if (input.isEnabled !== undefined) row.isEnabled = input.isEnabled;
  if (input.idpEntityId !== undefined) row.idpEntityId = input.idpEntityId;
  if (input.idpSsoUrl !== undefined) row.idpSsoUrl = input.idpSsoUrl;
  if (input.idpCertificate !== undefined) row.idpCertificate = input.idpCertificate;
  if (input.idpSloUrl !== undefined) row.idpSloUrl = input.idpSloUrl;
  if (input.idpMetadataUrl !== undefined) row.idpMetadataUrl = input.idpMetadataUrl;
  if (input.spPrivateKey !== undefined) row.spPrivateKey = input.spPrivateKey;
  if (input.spCertificate !== undefined) row.spCertificate = input.spCertificate;
  if (input.spPrivateKeySecondary !== undefined) row.spPrivateKeySecondary = input.spPrivateKeySecondary;
  if (input.spCertificateSecondary !== undefined) row.spCertificateSecondary = input.spCertificateSecondary;
  if (input.emailAttribute !== undefined) row.emailAttribute = input.emailAttribute;
  if (input.nameAttribute !== undefined) row.nameAttribute = input.nameAttribute;
  if (input.roleAttribute !== undefined) row.roleAttribute = input.roleAttribute ?? null;
  if (input.roleMappingRules !== undefined) row.roleMappingRules = input.roleMappingRules ?? null;
  if (input.allowJitProvisioning !== undefined) row.allowJitProvisioning = input.allowJitProvisioning;
  if (input.defaultMemberRole !== undefined) row.defaultMemberRole = input.defaultMemberRole ?? null;
  if (input.allowIdpInitiated !== undefined) row.allowIdpInitiated = input.allowIdpInitiated;
  if (input.signRequests !== undefined) row.signRequests = input.signRequests;
  if (input.signatureAlgorithm !== undefined) row.signatureAlgorithm = input.signatureAlgorithm;
  if (input.clockSkewMs !== undefined) row.clockSkewMs = input.clockSkewMs;
  if (input.wantAssertionsSigned !== undefined) row.wantAssertionsSigned = input.wantAssertionsSigned;
  if (input.honorSessionNotOnOrAfter !== undefined) row.honorSessionNotOnOrAfter = input.honorSessionNotOnOrAfter;
  if (input.nameIdFormat !== undefined) row.nameIdFormat = input.nameIdFormat;

  // Per-tenant SP key/cert auto-generation on first configuration. Only when
  // the admin did not supply their own pair — keeps self-service onboarding
  // friction-free while giving each tenant a unique SP identity.
  if (!row.spPrivateKey && !row.spCertificate && input.spPrivateKey === undefined && input.spCertificate === undefined) {
    try {
      const { privateKeyPem, certificatePem } = await AuthSamlCryptoService.generateSpKeyPair(tenantId);
      row.spPrivateKey = privateKeyPem;
      row.spCertificate = certificatePem;
      Logger.info(`[auth_saml] auto-generated SP key pair for tenant ${tenantId}`);
    } catch (err) {
      Logger.warn(`[auth_saml] SP key auto-generation failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Track IdP certificate expiry whenever the cert changes (or on create).
  if (input.idpCertificate !== undefined || isNew) {
    row.idpCertNotAfter = AuthSamlCryptoService.parseCertNotAfter(row.idpCertificate);
  }

  const saved = await repo.save(row);
  await clearCache(tenantId);

  // Proactively surface an about-to-expire (or expired) IdP cert on save.
  await checkIdpCertExpiry(tenantId, saved).catch(() => {});

  return SafeSamlConfigSchema.parse(saved);
}

export async function deleteConfig(tenantId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SamlConfig);
  const row = await repo.findOne({ where: { tenantId } });
  if (row) await repo.remove(row);
  await clearCache(tenantId);
}

/**
 * Import IdP configuration from a published metadata URL (federation
 * discovery). Returns the parsed fields AND persists them so the admin form
 * reloads pre-filled. Gated by the `samlMetadataImportEnabled` setting.
 */
export async function importMetadata(tenantId: string, input: ImportSamlMetadataInput): Promise<SafeSamlConfig> {
  const enabled = await settingBool(
    tenantId, AUTH_SAML_SETTING_KEYS.METADATA_IMPORT_ENABLED, AUTH_SAML_SETTING_DEFAULTS.METADATA_IMPORT_ENABLED,
  );
  if (!enabled) throw new AppError(SamlMessages.METADATA_IMPORT_FAILED, 403, ErrorCode.FORBIDDEN);

  const imported = await AuthSamlMetadataService.importFromUrl(input.metadataUrl);
  const patch: UpsertSamlConfigInput = { idpMetadataUrl: input.metadataUrl };
  if (imported.idpEntityId) patch.idpEntityId = imported.idpEntityId;
  if (imported.idpSsoUrl) patch.idpSsoUrl = imported.idpSsoUrl;
  if (imported.idpSloUrl) patch.idpSloUrl = imported.idpSloUrl;
  if (imported.idpCertificate) patch.idpCertificate = imported.idpCertificate;

  await AuditLogService.log({
    tenantId, actorType: 'USER', action: 'saml.metadata_imported',
    resourceType: 'saml_config', resourceId: tenantId,
    metadata: { metadataUrl: input.metadataUrl, idpEntityId: imported.idpEntityId },
  }).catch(() => {});

  return upsertConfig(tenantId, patch);
}

/**
 * IdP certificate expiry monitoring. Emits a Prometheus gauge + an audit
 * event when the cert is within the configured warning window (or expired).
 * Safe to call from any read path — never throws.
 */
export async function checkIdpCertExpiry(tenantId: string, config: SamlConfig): Promise<void> {
  const notAfter = config.idpCertNotAfter
    ? new Date(config.idpCertNotAfter)
    : AuthSamlCryptoService.parseCertNotAfter(config.idpCertificate);
  const days = AuthSamlCryptoService.daysUntilExpiry(notAfter);
  if (days === null) return;

  ObservabilityService.recordTenantUsage({ tenantId, metric: 'saml_idp_cert_days_to_expiry', value: days });

  const warnDays = await settingNumber(
    tenantId, AUTH_SAML_SETTING_KEYS.CERT_EXPIRY_WARNING_DAYS, AUTH_SAML_SETTING_DEFAULTS.CERT_EXPIRY_WARNING_DAYS,
  );
  if (warnDays <= 0) return;

  if (days <= warnDays) {
    ObservabilityService.recordTenantUsage({ tenantId, metric: 'saml_idp_cert_expiry_alert', value: 1 });
    await AuditLogService.log({
      tenantId, actorType: 'SYSTEM',
      action: days < 0 ? 'saml.idp_cert_expired' : 'saml.idp_cert_expiring',
      resourceType: 'saml_config', resourceId: tenantId,
      metadata: { daysToExpiry: days, notAfter: notAfter?.toISOString() ?? null, warnDays },
    }).catch(() => {});
  }
}
