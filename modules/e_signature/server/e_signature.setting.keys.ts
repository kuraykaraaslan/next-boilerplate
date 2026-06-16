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
  // Compliance policy / enforcement
  'esigEnforcementMode',       // NONE | AES | QES (minimum signature level)
  'esigEsignActMode',          // 'true' → capture ESIGN/UETA intent+consent
  'esigCountryMinLoa',         // JSON { "DE": "high", ... } per-country min LoA
  'esigArchivalEnabled',
  'esigArchivalRetentionDays',
  'esigRateLimitPerHour',
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
  // Turkey — Mobil Imza aggregator account
  'mobilImzaAggregatorApiKey',          // sensitive
  'mobilImzaAggregatorCustomerCode',
  // Baltics (EE/LV/LT) — Smart-ID relying-party account (SK ID Solutions)
  'smartIdBaseUrl',
  'smartIdRelyingPartyUuid',
  'smartIdRelyingPartyName',
  // Sweden — BankID relying-party endpoint (mTLS cert/key stay system-level)
  'bankIdSeBaseUrl',
  // United States — Login.gov OIDC client
  'loginGovClientId',
  'loginGovRedirectUri',
]);
export type ESignatureTenantSettingKey = z.infer<typeof ESignatureTenantSettingKeySchema>;
export const E_SIGNATURE_TENANT_KEYS = ESignatureTenantSettingKeySchema.options;

export const E_SIGNATURE_TENANT_SENSITIVE_KEYS: readonly ESignatureTenantSettingKey[] = [
  'mobilImzaAggregatorApiKey',
] as const;
