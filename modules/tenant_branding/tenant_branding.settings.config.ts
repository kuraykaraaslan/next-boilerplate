import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { TENANT_BRANDING_KEYS } from './tenant_branding.setting.keys';
import BrandingTab from './ui/branding.tenant';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'branding',
    label: 'Branding',
    icon: faPalette,
    keys: TENANT_BRANDING_KEYS,
    component: BrandingTab,
    order: 20,
    type: 'tenant',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
