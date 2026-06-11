import type { SettingFieldDef } from '@/modules_next/setting/setting-fields.types';

// UI metadata for the API Docs settings page.
export const API_DOC_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: 'apiDocsPublic',
    label: 'Public API Docs',
    description:
      'When enabled, a public-facing variant of the API documentation can be served without a logged-in session. Internal and admin docs routes always remain private.',
    group: 'Visibility',
    type: 'boolean',
    defaultValue: 'false',
  },
];
