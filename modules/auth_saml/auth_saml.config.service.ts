import { SAML } from '@node-saml/node-saml';
import { SamlConfig } from './entities/saml_config.entity';
import type { SafeSamlConfig } from './auth_saml.types';
import type { UpsertSamlConfigInput, ImportSamlMetadataInput } from './auth_saml.dto';
import {
  configCacheKey, clearCache, loadConfig, spEntityId, acsUrl, metadataUrl, sloUrl,
  buildSaml, settingBool, settingNumber,
} from './auth_saml.config.helpers';
import {
  getConfig, upsertConfig, deleteConfig, importMetadata, checkIdpCertExpiry,
} from './auth_saml.config.crud.service';

/**
 * SAML per-tenant config service facade. URL builders, cache, the node-saml
 * client builder and setting helpers live in `auth_saml.config.helpers`; the
 * config CRUD + metadata import + cert-expiry monitoring in
 * `auth_saml.config.crud.service`. This class preserves the single
 * `AuthSamlConfigService.*` entry point its callers depend on.
 */
export default class AuthSamlConfigService {
  static configCacheKey(tenantId: string): string {
    return configCacheKey(tenantId);
  }

  static clearCache(tenantId: string): Promise<void> {
    return clearCache(tenantId);
  }

  static loadConfig(tenantId: string): Promise<SamlConfig | null> {
    return loadConfig(tenantId);
  }

  static spEntityId(tenantId: string): string {
    return spEntityId(tenantId);
  }

  static acsUrl(tenantId: string): string {
    return acsUrl(tenantId);
  }

  static metadataUrl(tenantId: string): string {
    return metadataUrl(tenantId);
  }

  static sloUrl(tenantId: string): string {
    return sloUrl(tenantId);
  }

  static buildSaml(config: SamlConfig, tenantId: string): SAML {
    return buildSaml(config, tenantId);
  }

  static getConfig(tenantId: string): Promise<SafeSamlConfig | null> {
    return getConfig(tenantId);
  }

  static upsertConfig(tenantId: string, input: UpsertSamlConfigInput): Promise<SafeSamlConfig> {
    return upsertConfig(tenantId, input);
  }

  static deleteConfig(tenantId: string): Promise<void> {
    return deleteConfig(tenantId);
  }

  static importMetadata(tenantId: string, input: ImportSamlMetadataInput): Promise<SafeSamlConfig> {
    return importMetadata(tenantId, input);
  }

  static checkIdpCertExpiry(tenantId: string, config: SamlConfig): Promise<void> {
    return checkIdpCertExpiry(tenantId, config);
  }

  static settingBool(tenantId: string, key: string, fallback: boolean): Promise<boolean> {
    return settingBool(tenantId, key, fallback);
  }

  static settingNumber(tenantId: string, key: string, fallback: number): Promise<number> {
    return settingNumber(tenantId, key, fallback);
  }
}
