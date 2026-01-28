import { faDatabase } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { STORAGE_KEYS } from './storage.setting.keys';
import StorageSettings from './ui/storage.settings';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'storage',
    label: 'Storage',
    icon: faDatabase,
    keys: STORAGE_KEYS,
    component: StorageSettings,
    order: 40,
    type: 'system',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
