import {
  faCog,
  faShield,
  faGlobe,
  faBell,
  faPlug,
  faChartLine,
  faShareNodes,
  faHome,
} from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, NavMenuEntry, registerModule } from './settings.registry';
import {
  GENERAL_KEYS,
  SECURITY_KEYS,
  LOCALIZATION_KEYS,
  NOTIFICATION_KEYS,
  INTEGRATIONS_KEYS,
  ANALYTICS_KEYS,
  SOCIAL_KEYS,
} from './setting.types';
import GeneralSettings from './ui/general.settings';
import SecuritySettings from './ui/security.settings';
import LocalizationSettings from './ui/localization.settings';
import NotificationSettings from './ui/notification.settings';
import IntegrationsSettings from './ui/integrations.settings';
import AnalyticsSettings from './ui/analytics.settings';
import SocialSettings from './ui/social.settings';

// ============================================================================
// Settings Tabs
// ============================================================================

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'general',
    label: 'General',
    icon: faCog,
    keys: GENERAL_KEYS,
    component: GeneralSettings,
    order: 0,
    type: 'system',
  },
  {
    id: 'security',
    label: 'Security',
    icon: faShield,
    keys: SECURITY_KEYS,
    component: SecuritySettings,
    order: 60,
    type: 'system',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: faPlug,
    keys: INTEGRATIONS_KEYS,
    component: IntegrationsSettings,
    order: 70,
    type: 'system',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: faChartLine,
    keys: ANALYTICS_KEYS,
    component: AnalyticsSettings,
    order: 80,
    type: 'system',
  },
  {
    id: 'social',
    label: 'Social',
    icon: faShareNodes,
    keys: SOCIAL_KEYS,
    component: SocialSettings,
    order: 90,
    type: 'system',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: faBell,
    keys: NOTIFICATION_KEYS,
    component: NotificationSettings,
    order: 110,
    type: 'system',
  },
  {
    id: 'localization',
    label: 'Localization',
    icon: faGlobe,
    keys: LOCALIZATION_KEYS,
    component: LocalizationSettings,
    order: 120,
    type: 'system',
  },
];

// ============================================================================
// Menu Items
// ============================================================================

export const MENU_ITEMS: NavMenuEntry[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/system/admin',
    icon: faHome,
    order: 0,
    type: 'system',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/system/admin/settings',
    icon: faCog,
    order: 900,
    type: 'system',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS, menuItems: MENU_ITEMS });
