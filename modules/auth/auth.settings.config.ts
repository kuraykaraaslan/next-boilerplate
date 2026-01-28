import { faUserShield } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { AUTH_KEYS } from './auth.setting.keys';
import AuthSettings from './ui/auth.settings';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'auth',
    label: 'Authentication',
    icon: faUserShield,
    keys: AUTH_KEYS,
    component: AuthSettings,
    order: 10,
    type: 'system',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
