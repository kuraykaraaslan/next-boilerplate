import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';
import { NAVIGATION_SETTING_KEYS } from './navigation.setting.keys';

// UI metadata for the Navigation settings page. Drives the generic per-module
// settings scaffold (ModuleSettingsPage).
export const NAVIGATION_SETTINGS_FIELDS: SettingFieldDef[] = [
  {
    key: NAVIGATION_SETTING_KEYS.DEFAULT_LOCATION,
    label: 'Default Location',
    description: 'Location pre-selected when creating a new menu.',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: 'header', label: 'Header' },
      { value: 'footer', label: 'Footer' },
      { value: 'sidebar', label: 'Sidebar' },
    ],
    defaultValue: 'header',
  },
  {
    key: NAVIGATION_SETTING_KEYS.MAX_DEPTH,
    label: 'Max Nesting Depth',
    description: 'Maximum nesting level allowed for menu items.',
    group: 'Behavior',
    type: 'number',
    defaultValue: '3',
    placeholder: '3',
  },
  {
    key: NAVIGATION_SETTING_KEYS.CACHE_TTL_SECONDS,
    label: 'Cache TTL (seconds)',
    description: 'How long a rendered menu is cached. 0 disables caching.',
    group: 'Behavior',
    type: 'number',
    defaultValue: '300',
    placeholder: '300',
  },
];
