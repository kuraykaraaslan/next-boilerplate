import { faComment } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { SMS_KEYS } from './notification_sms.setting.keys';
import SmsSettings from './ui/notification_sms.settings';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'sms',
    label: 'SMS',
    icon: faComment,
    keys: SMS_KEYS,
    component: SmsSettings,
    order: 30,
    type: 'system',
  },
];
