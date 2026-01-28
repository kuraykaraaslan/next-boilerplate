import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { EMAIL_KEYS } from './notification_mail.setting.keys';
import EmailSettings from './ui/notification_mail.settings';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'email',
    label: 'Email',
    icon: faEnvelope,
    keys: EMAIL_KEYS,
    component: EmailSettings,
    order: 20,
    type: 'system',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
