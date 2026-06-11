import { z } from 'zod';

// Canonical per-tenant setting keys for the auth_saml module.
//
// IdP/SP *protocol* configuration lives on the `SamlConfig` entity (one row per
// tenant) — not here. These keys are the genuinely-new *operational* knobs that
// govern monitoring and safety behaviours layered on top of that config:
//   * cert-expiry alert threshold,
//   * assertion replay-detection toggle,
//   * metadata-import enablement,
//   * Single Logout enablement.
//
// They are read/written through the generic `setting.service` + settings page so
// platform/tenant admins can tune them without a schema change.
export const AuthSamlSettingKeySchema = z.enum([
  'samlCertExpiryWarningDays',
  'samlReplayDetectionEnabled',
  'samlMetadataImportEnabled',
  'samlSloEnabled',
]);
export type AuthSamlSettingKey = z.infer<typeof AuthSamlSettingKeySchema>;
export const AUTH_SAML_SETTING_KEY_LIST = AuthSamlSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const AUTH_SAML_SETTING_KEYS = {
  CERT_EXPIRY_WARNING_DAYS: 'samlCertExpiryWarningDays',
  REPLAY_DETECTION_ENABLED: 'samlReplayDetectionEnabled',
  METADATA_IMPORT_ENABLED: 'samlMetadataImportEnabled',
  SLO_ENABLED: 'samlSloEnabled',
} as const satisfies Record<string, AuthSamlSettingKey>;

// Defaults applied when a tenant has not set the key.
export const AUTH_SAML_SETTING_DEFAULTS = {
  CERT_EXPIRY_WARNING_DAYS: 30,
  REPLAY_DETECTION_ENABLED: true,
  METADATA_IMPORT_ENABLED: true,
  SLO_ENABLED: false,
} as const;
