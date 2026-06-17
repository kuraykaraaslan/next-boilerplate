import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';
import { AUDIT_LOG_SETTING_KEYS } from './audit_log.setting.keys';

// UI metadata for the Audit Logs settings page (ModuleSettingsPage).
export const AUDIT_LOG_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: AUDIT_LOG_SETTING_KEYS.RETENTION_DAYS,
    label: 'Retention Period (days)',
    description:
      'How long to keep audit-log rows before the retention purge deletes them. 0 = keep forever. ' +
      'Set per compliance needs (e.g. 30 for storage control, 2555 for a 7-year regulatory hold). ' +
      'Rows are optionally archived to NDJSON before deletion.',
    group: 'Retention',
    type: 'number',
    defaultValue: '0',
    placeholder: '0',
  },
];
