// ============================================================================
// System Settings Configuration
// ============================================================================

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ComponentType } from 'react';
import {
  faCog,
  faShield,
  faPlug,
  faChartLine,
  faShareNodes,
  faBell,
  faGlobe,
  faUserShield,
  faEnvelope,
  faComment,
  faCreditCard,
  faDatabase,
  faRobot,
  faHome,
  faBuilding,
  faUsers,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import { SettingsTabProps } from './setting.types';

// Import setting keys from each module
import { GENERAL_KEYS, AUTH_KEYS } from '@/modules/auth/auth.setting.keys';
import { EMAIL_KEYS, NOTIFICATION_KEYS } from '@/modules/notification_mail/notification_mail.setting.keys';
import { SMS_KEYS } from '@/modules/notification_sms/notification_sms.setting.keys';
import { STORAGE_KEYS } from '@/modules/storage/storage.setting.keys';
import { AI_KEYS } from '@/modules/ai/ai.setting.keys';
import { PAYMENT_KEYS } from '@/modules/payment/payment.setting.keys';
import { SECURITY_KEYS } from '@/modules/user_security/user_security.setting.keys';

// Lazy imports for settings components
import dynamic from 'next/dynamic';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <span className="loading loading-spinner loading-lg"></span>
  </div>
);

const GeneralSettings = dynamic(() => import('./ui/general.settings'), { ssr: false, loading: LoadingSpinner });
const SecuritySettings = dynamic(() => import('./ui/security.settings'), { ssr: false, loading: LoadingSpinner });
const IntegrationsSettings = dynamic(() => import('./ui/integrations.settings'), { ssr: false, loading: LoadingSpinner });
const AnalyticsSettings = dynamic(() => import('./ui/analytics.settings'), { ssr: false, loading: LoadingSpinner });
const NotificationSettings = dynamic(() => import('./ui/notification.settings'), { ssr: false, loading: LoadingSpinner });
const LocalizationSettings = dynamic(() => import('./ui/localization.settings'), { ssr: false, loading: LoadingSpinner });
const AuthSettings = dynamic(() => import('@/modules/auth/ui/auth.settings'), { ssr: false, loading: LoadingSpinner });
const EmailSettings = dynamic(() => import('@/modules/notification_mail/ui/notification_mail.settings'), { ssr: false, loading: LoadingSpinner });
const SmsSettings = dynamic(() => import('@/modules/notification_sms/ui/notification_sms.settings'), { ssr: false, loading: LoadingSpinner });
const PaymentSettings = dynamic(() => import('@/modules/payment/ui/payment.settings'), { ssr: false, loading: LoadingSpinner });
const StorageSettings = dynamic(() => import('@/modules/storage/ui/storage.settings'), { ssr: false, loading: LoadingSpinner });
const AiSettings = dynamic(() => import('@/modules/ai/ui/ai.settings'), { ssr: false, loading: LoadingSpinner });

// ============================================================================
// Types
// ============================================================================

export interface SystemSettingsTab {
  id: string;
  label: string;
  icon: IconDefinition;
  keys: readonly string[];
  component: ComponentType<SettingsTabProps>;
  order: number;
}

export interface SystemMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: IconDefinition;
  order: number;
  permissions?: string[];
}

// ============================================================================
// System Settings Tabs
// ============================================================================

const SYSTEM_SETTINGS_TABS: SystemSettingsTab[] = [
  { id: 'general', label: 'General', icon: faCog, component: GeneralSettings, order: 0, keys: GENERAL_KEYS },
  { id: 'auth', label: 'Authentication', icon: faUserShield, component: AuthSettings, order: 10, keys: AUTH_KEYS },
  { id: 'email', label: 'Email', icon: faEnvelope, component: EmailSettings, order: 20, keys: EMAIL_KEYS },
  { id: 'sms', label: 'SMS', icon: faComment, component: SmsSettings, order: 30, keys: SMS_KEYS },
  { id: 'storage', label: 'Storage', icon: faDatabase, component: StorageSettings, order: 40, keys: STORAGE_KEYS },
  { id: 'ai', label: 'AI', icon: faRobot, component: AiSettings, order: 50, keys: AI_KEYS },
  { id: 'security', label: 'Security', icon: faShield, component: SecuritySettings, order: 60, keys: SECURITY_KEYS },
  { id: 'integrations', label: 'Integrations', icon: faPlug, component: IntegrationsSettings, order: 70, keys: [] },
  { id: 'analytics', label: 'Analytics', icon: faChartLine, component: AnalyticsSettings, order: 80, keys: [] },
  { id: 'payment', label: 'Payment', icon: faCreditCard, component: PaymentSettings, order: 100, keys: PAYMENT_KEYS },
  { id: 'notifications', label: 'Notifications', icon: faBell, component: NotificationSettings, order: 110, keys: NOTIFICATION_KEYS },
  { id: 'localization', label: 'Localization', icon: faGlobe, component: LocalizationSettings, order: 120, keys: [] },
];

// ============================================================================
// System Menu Items
// ============================================================================

const SYSTEM_MENU_ITEMS: SystemMenuItem[] = [
  { id: 'home', label: 'Home', href: '/system/admin', icon: faHome, order: 0 },
  { id: 'users', label: 'Users', href: '/system/admin/users', icon: faUsers, order: 600, permissions: ['users.view'] },
  { id: 'tenants', label: 'Tenants', href: '/system/admin/tenants', icon: faBuilding, order: 700, permissions: ['tenants.view'] },
  { id: 'settings', label: 'Settings', href: '/system/admin/settings', icon: faCog, order: 900 },
  { id: 'logout', label: 'Logout', href: '/auth/logout', icon: faSignOutAlt, order: 1000 },
];

// ============================================================================
// Public API
// ============================================================================

export function getSystemSettingsTabs(): SystemSettingsTab[] {
  return SYSTEM_SETTINGS_TABS;
}

export function getSystemMenuItems(): SystemMenuItem[] {
  return SYSTEM_MENU_ITEMS;
}

export function getAllSystemKeys(): string[] {
  return SYSTEM_SETTINGS_TABS.flatMap(tab => [...tab.keys]);
}
