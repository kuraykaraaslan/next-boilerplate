import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import DomainsTab from './ui/tenant_domain.tenant';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'domains',
    label: 'Domains',
    icon: faGlobe,
    keys: [],
    component: DomainsTab,
    order: 10,
    type: 'tenant',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
