import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';
import { AUTH_SAML_SETTING_KEYS } from './auth_saml.setting.keys';

// UI metadata for the SAML operational-settings page. These are the knobs that
// are NOT part of the IdP/SP protocol config (which lives on the SamlConfig
// entity and is edited on /saml/settings) — they govern monitoring + safety.
export const AUTH_SAML_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: AUTH_SAML_SETTING_KEYS.CERT_EXPIRY_WARNING_DAYS,
    label: 'IdP Certificate Expiry Warning (days)',
    description: 'Emit a warning audit event + Prometheus metric when the IdP signing certificate is within this many days of expiry. 0 disables the alert.',
    group: 'Monitoring',
    type: 'number',
    defaultValue: '30',
    placeholder: '30',
  },
  {
    key: AUTH_SAML_SETTING_KEYS.REPLAY_DETECTION_ENABLED,
    label: 'Assertion Replay Detection',
    description: 'Reject a SAML assertion whose ID has already been seen (scoped per-tenant in Redis, TTL = assertion NotOnOrAfter). Required for eIDAS / NIST SP 800-63C LoA.',
    group: 'Security',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: AUTH_SAML_SETTING_KEYS.METADATA_IMPORT_ENABLED,
    label: 'Allow Metadata Import from URL',
    description: 'Allow tenant admins to pre-fill the IdP configuration by fetching the IdP\'s published SAML metadata XML.',
    group: 'Onboarding',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: AUTH_SAML_SETTING_KEYS.SLO_ENABLED,
    label: 'Single Logout (SLO)',
    description: 'Enable SAML Single Logout: platform logout propagates a LogoutRequest to the IdP, and the SP accepts IdP-initiated LogoutRequests. Requires an IdP SLO URL on the SAML config.',
    group: 'Security',
    type: 'boolean',
    defaultValue: 'false',
  },
];
