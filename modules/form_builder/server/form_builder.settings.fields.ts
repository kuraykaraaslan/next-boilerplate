import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';
import { FORM_BUILDER_SETTING_KEYS } from './form_builder.setting.keys';

// UI metadata for the Form Settings page: defaults, notifications and anti-spam.
export const FORM_BUILDER_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: FORM_BUILDER_SETTING_KEYS.DEFAULT_STATUS,
    label: 'Default Status',
    description: 'Status assigned to a newly created form.',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PUBLISHED', label: 'Published' },
    ],
    defaultValue: 'DRAFT',
  },
  {
    key: FORM_BUILDER_SETTING_KEYS.NOTIFY_EMAIL,
    label: 'Notification Email',
    description: 'Address notified when a new submission arrives. Empty = no notification.',
    group: 'Notifications',
    type: 'email',
    defaultValue: '',
    placeholder: 'forms@example.com',
  },
  {
    key: FORM_BUILDER_SETTING_KEYS.ENABLE_SPAM_PROTECTION,
    label: 'Spam Protection',
    description: 'Enable basic anti-spam (honeypot / rate limit) on public submissions.',
    group: 'Security',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: FORM_BUILDER_SETTING_KEYS.MAX_SUBMISSIONS_PER_DAY,
    label: 'Max Submissions / Day',
    description: 'Per-form daily submission cap. 0 = unlimited.',
    group: 'Limits',
    type: 'number',
    defaultValue: '0',
    placeholder: '0',
  },
];
