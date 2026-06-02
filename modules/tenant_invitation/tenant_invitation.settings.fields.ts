import type { SettingFieldDef } from '@/modules_next/setting/setting-fields.types';

// UI metadata for the Invitations settings page. Keys mirror the non-env rows of
// modules/tenant_invitation/POSIBBLE_SETTING_KEYS.md (env:* TTLs are deployment
// config, not tenant-editable, so they are excluded).
export const TENANT_INVITATION_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'invitationNegativeCacheTtlSeconds',
    label: 'Negative Cache TTL (seconds)',
    description: 'How long to cache a "no such invitation" result, in seconds. Minimum 60.',
    group: 'Caching',
    type: 'number',
    placeholder: '60',
  },
];
