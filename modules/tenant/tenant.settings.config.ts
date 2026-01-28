import { faCog, faBuilding, faTachometerAlt, faUsers, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, NavMenuEntry, registerModule } from '@/modules/setting/settings.registry';
import { TENANT_GENERAL_KEYS } from './tenant.setting.keys';
import GeneralTab from './ui/tenant.tenant';

// ============================================================================
// Settings Tabs
// ============================================================================

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'general',
    label: 'General',
    icon: faCog,
    keys: TENANT_GENERAL_KEYS,
    component: GeneralTab,
    order: 0,
    type: 'tenant',
  },
];

// ============================================================================
// Menu Items
// Note: {tenantBase} placeholder will be replaced with actual tenant base URL
// ============================================================================

export const MENU_ITEMS: NavMenuEntry[] = [
  // System menu - manage tenants
  {
    id: 'tenants',
    label: 'Tenants',
    href: '/system/admin/tenants',
    icon: faBuilding,
    order: 700,
    type: 'system',
  },
  // Tenant menu items
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '{tenantBase}/admin',
    icon: faTachometerAlt,
    order: 0,
    type: 'tenant',
  },
  {
    id: 'members',
    label: 'Members',
    href: '{tenantBase}/admin/members',
    icon: faUsers,
    order: 100,
    type: 'tenant',
  },
  {
    id: 'tenant-settings',
    label: 'Settings',
    href: '{tenantBase}/admin/settings',
    icon: faCog,
    order: 900,
    type: 'tenant',
  },
  {
    id: 'back-to-app',
    label: 'Back to App',
    href: '{tenantBase}',
    icon: faArrowLeft,
    order: 1000,
    type: 'tenant',
  },
];
