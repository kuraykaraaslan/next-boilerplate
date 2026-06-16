import type { SettingFieldDef } from '@nb/setting/server/setting-fields.types';
import { IMPERSONATION_SETTING_KEYS } from './impersonation.setting.keys';

// UI metadata for the Impersonation settings page (ModuleSettingsPage). Every
// key is read against the target tenant, so these controls govern how this
// tenant's own users may be impersonated by platform/tenant admins.
export const IMPERSONATION_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: IMPERSONATION_SETTING_KEYS.SESSION_TTL_MINUTES,
    label: 'Impersonation Session Lifetime (minutes)',
    description:
      'How long an impersonation session for this tenant\'s users stays valid before it auto-expires. Minimum 1, maximum 1440. Defaults to 60 when unset.',
    group: 'Session',
    type: 'number',
    defaultValue: '60',
    placeholder: '60',
  },
  {
    key: IMPERSONATION_SETTING_KEYS.REQUIRE_STEP_UP,
    label: 'Require Step-Up Re-authentication',
    description:
      'When enabled, an admin must re-confirm their identity (password re-entry or a TOTP code) immediately before starting impersonation of this tenant\'s users.',
    group: 'Security',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: IMPERSONATION_SETTING_KEYS.MAX_CONCURRENT_PER_IMPERSONATOR,
    label: 'Max Concurrent Sessions per Admin',
    description:
      'Maximum number of simultaneous active impersonation sessions a single admin may hold against this tenant. 0 = unlimited.',
    group: 'Security',
    type: 'number',
    defaultValue: '0',
    placeholder: '0',
  },
  {
    key: IMPERSONATION_SETTING_KEYS.DISABLED,
    label: 'Disable Impersonation Entirely',
    description:
      'When enabled, no one — including platform super-admins — may impersonate this tenant\'s users. Use for high-sensitivity tenants that contractually prohibit vendor-side access.',
    group: 'Security',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: IMPERSONATION_SETTING_KEYS.ALERT_STARTS_PER_HOUR,
    label: 'Anomaly Alert Threshold (starts/hour)',
    description:
      'Emit a real-time alert (impersonation.started webhook is always sent; an additional anomaly signal fires) when a single admin starts more than this many impersonation sessions within one hour. 0 = no anomaly alerting.',
    group: 'Monitoring',
    type: 'number',
    defaultValue: '0',
    placeholder: '0',
  },
];
