import { z } from 'zod';

// ============================================================================
// System E-Signature Setting Keys
// ============================================================================

export const ESignatureSystemSettingKeySchema = z.enum([
  'eidEnabled',
  'eidDefaultProvider',
  'eidProviderMap',
  'eidRequiredLoA',
  'mobilImzaAggregatorEnabled',
  'mobilImzaAggregatorBaseUrl',
  'mobilImzaAggregatorApiKey',          // sensitive — envelope-encrypted
  'mobilImzaAggregatorCustomerCode',
  'mobilImzaCallbackHmacSecret',        // sensitive
  'trTrustRootsPath',
  'euLotlUrl',
  'tsaDefaultUrl',
]);
export type ESignatureSystemSettingKey = z.infer<typeof ESignatureSystemSettingKeySchema>;
export const E_SIGNATURE_KEYS = ESignatureSystemSettingKeySchema.options;

// Keys that must be stored encrypted via envelope encryption.
export const E_SIGNATURE_SENSITIVE_KEYS: readonly ESignatureSystemSettingKey[] = [
  'mobilImzaAggregatorApiKey',
  'mobilImzaCallbackHmacSecret',
] as const;

// ============================================================================
// Tenant E-Signature Setting Keys (per-tenant overrides — v2)
// ============================================================================

export const ESignatureTenantSettingKeySchema = z.enum([
  'eidEnabled',
  'eidRequiredLoA',
  'mobilImzaAggregatorApiKey',          // sensitive
  'mobilImzaAggregatorCustomerCode',
]);
export type ESignatureTenantSettingKey = z.infer<typeof ESignatureTenantSettingKeySchema>;
export const E_SIGNATURE_TENANT_KEYS = ESignatureTenantSettingKeySchema.options;

export const E_SIGNATURE_TENANT_SENSITIVE_KEYS: readonly ESignatureTenantSettingKey[] = [
  'mobilImzaAggregatorApiKey',
] as const;
