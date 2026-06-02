import type { SettingFieldDef } from '@/modules_next/setting/setting-fields.types';

// UI metadata for the API Keys settings page. Keys mirror the non-env rows of
// modules/api_key/POSIBBLE_SETTING_KEYS.md (env:* cache TTL is deployment config
// and excluded).
export const API_KEY_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'apiKeyNegativeCacheTtlSeconds',
    label: 'Negative Cache TTL (seconds)',
    description: 'How long to cache a "no such API key" result, in seconds. Minimum 60.',
    group: 'Caching',
    type: 'number',
    placeholder: '60',
  },
];
