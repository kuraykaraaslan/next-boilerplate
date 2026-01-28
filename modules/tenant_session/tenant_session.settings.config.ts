import { faShield } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { TENANT_SECURITY_KEYS } from './tenant_session.setting.keys';
import SecurityTab from './ui/tenant_session.tenant';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'security',
    label: 'Security',
    icon: faShield,
    keys: TENANT_SECURITY_KEYS,
    component: SecurityTab,
    order: 50,
    type: 'tenant',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
