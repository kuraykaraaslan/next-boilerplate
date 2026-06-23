import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';
import { REDIRECT_SETTING_KEYS } from './redirect.setting.keys';

// UI metadata for the Redirect settings page. Drives the generic
// ModuleSettingsPage scaffold; values persist via the generic settings API.
export const REDIRECT_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: REDIRECT_SETTING_KEYS.DEFAULT_STATUS_CODE,
    label: 'Default Status Code',
    description: 'HTTP status used when creating a new redirect.',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: '301', label: '301 Permanent' },
      { value: '302', label: '302 Found' },
      { value: '307', label: '307 Temporary' },
      { value: '308', label: '308 Permanent' },
    ],
    defaultValue: '301',
  },
  {
    key: REDIRECT_SETTING_KEYS.CASE_SENSITIVE,
    label: 'Case-sensitive Matching',
    description: 'Match the source path case-sensitively.',
    group: 'Matching',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: REDIRECT_SETTING_KEYS.LOG_HITS,
    label: 'Log Hits',
    description: 'Count and store how many times each redirect is followed.',
    group: 'Behavior',
    type: 'boolean',
    defaultValue: 'true',
  },
];
