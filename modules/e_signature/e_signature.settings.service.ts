import SettingService from '@/modules/setting/setting.service';
import TenantSettingService from '@/modules/tenant_setting/tenant_setting.service';
import ESignatureEncryptionService from './e_signature.encryption.service';
import {
  E_SIGNATURE_KEYS,
  E_SIGNATURE_SENSITIVE_KEYS,
  E_SIGNATURE_TENANT_KEYS,
  E_SIGNATURE_TENANT_SENSITIVE_KEYS,
  type ESignatureSystemSettingKey,
  type ESignatureTenantSettingKey,
} from './e_signature.setting.keys';

const MASK = '***SET***';

/**
 * Read/write the e_signature module's system-level settings with envelope
 * encryption for sensitive values (API keys, HMAC secrets) and write-only
 * semantics in admin responses (the API returns a `***SET***` mask instead
 * of decrypted secret values).
 *
 * Internal callers (e.g. provider adapters) use `getInternal(key)` to get
 * the plaintext value.
 */
export default class ESignatureSettingsService {
  static readonly KEYS: readonly ESignatureSystemSettingKey[] = E_SIGNATURE_KEYS;
  static readonly SENSITIVE_KEYS: readonly ESignatureSystemSettingKey[] = E_SIGNATURE_SENSITIVE_KEYS;
  static readonly MASK = MASK;

  private static isSensitive(key: string): key is ESignatureSystemSettingKey {
    return (E_SIGNATURE_SENSITIVE_KEYS as readonly string[]).includes(key);
  }

  /** Plaintext read for server-side consumers (provider adapters etc.). */
  static async getInternal(key: ESignatureSystemSettingKey): Promise<string | null> {
    const map = await SettingService.getByKeys([key]);
    const raw = map[key];
    if (raw == null || raw === '') return null;
    if (ESignatureService_isEncrypted(raw)) {
      const decrypted = ESignatureEncryptionService.decryptOpt(raw);
      return typeof decrypted === 'string' ? decrypted : null;
    }
    return raw;
  }

  /** Get all e_signature settings, masking sensitive values for UI display. */
  static async getAdminView(): Promise<Record<ESignatureSystemSettingKey, string>> {
    const map = await SettingService.getByKeys([...E_SIGNATURE_KEYS]);
    const out = {} as Record<ESignatureSystemSettingKey, string>;
    for (const key of E_SIGNATURE_KEYS) {
      const raw = map[key] ?? '';
      const sensitive = (E_SIGNATURE_SENSITIVE_KEYS as readonly string[]).includes(key);
      out[key] = sensitive ? (raw ? MASK : '') : raw;
    }
    return out;
  }

  /**
   * Persist an admin-supplied partial update. Sensitive values equal to the
   * MASK are skipped (preserves the existing value). Non-MASK sensitive
   * values are envelope-encrypted before being written.
   */
  static async updateAdmin(patch: Partial<Record<ESignatureSystemSettingKey, string>>): Promise<void> {
    const toWrite: Record<string, string> = {};
    for (const key of E_SIGNATURE_KEYS) {
      const incoming = patch[key];
      if (incoming === undefined) continue;
      if (ESignatureSettingsService.isSensitive(key)) {
        if (incoming === MASK || incoming === '') continue;  // leave existing untouched
        toWrite[key] = ESignatureEncryptionService.encryptOpt(incoming);
      } else {
        toWrite[key] = incoming;
      }
    }
    if (Object.keys(toWrite).length > 0) {
      await SettingService.updateMany(toWrite);
    }
  }

  // ── Tenant-scope helpers ────────────────────────────────────────────────
  private static isTenantSensitive(key: string): boolean {
    return (E_SIGNATURE_TENANT_SENSITIVE_KEYS as readonly string[]).includes(key);
  }

  /**
   * Read a tenant-scoped setting with system-level fallback. Sensitive values
   * are auto-decrypted. Returns null when neither tenant nor system level has
   * the key set.
   */
  static async getTenantInternal(tenantId: string, key: ESignatureTenantSettingKey): Promise<string | null> {
    const tenantRaw = await TenantSettingService.getValue(tenantId, key);
    if (tenantRaw != null && tenantRaw !== '') {
      if (ESignatureService_isEncrypted(tenantRaw)) {
        const decrypted = ESignatureEncryptionService.decryptOpt(tenantRaw);
        return typeof decrypted === 'string' ? decrypted : null;
      }
      return tenantRaw;
    }
    // Fall back to the system value if the same key exists at system level.
    if ((E_SIGNATURE_KEYS as readonly string[]).includes(key)) {
      return ESignatureSettingsService.getInternal(key as ESignatureSystemSettingKey);
    }
    return null;
  }

  static async getTenantAdminView(tenantId: string): Promise<Record<ESignatureTenantSettingKey, string>> {
    const out = {} as Record<ESignatureTenantSettingKey, string>;
    for (const key of E_SIGNATURE_TENANT_KEYS) {
      const raw = (await TenantSettingService.getValue(tenantId, key)) ?? '';
      const sensitive = ESignatureSettingsService.isTenantSensitive(key);
      out[key] = sensitive ? (raw ? MASK : '') : raw;
    }
    return out;
  }

  static async updateTenantAdmin(
    tenantId: string,
    patch: Partial<Record<ESignatureTenantSettingKey, string>>,
  ): Promise<void> {
    for (const key of E_SIGNATURE_TENANT_KEYS) {
      const incoming = patch[key];
      if (incoming === undefined) continue;
      if (ESignatureSettingsService.isTenantSensitive(key)) {
        if (incoming === MASK || incoming === '') continue;
        await TenantSettingService.create(
          tenantId,
          key,
          ESignatureEncryptionService.encryptOpt(incoming),
        );
      } else {
        await TenantSettingService.create(tenantId, key, incoming);
      }
    }
  }
}

function ESignatureService_isEncrypted(value: string): boolean {
  // Inlined to avoid an extra import; mirrors ESignatureEncryptionService.isEncrypted
  return value.startsWith('v1.');
}
