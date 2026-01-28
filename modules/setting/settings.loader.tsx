// ============================================================================
// Settings Loader (Static)
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
  faPalette,
  faHome,
  faBuilding,
  faUsers,
  faTachometerAlt,
  faArrowLeft,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import { SettingsTabProps, SettingsState } from './setting.types';

// Import setting keys from each module
import { GENERAL_KEYS, AUTH_KEYS } from '@/modules/auth/auth.setting.keys';
import { EMAIL_KEYS, NOTIFICATION_KEYS } from '@/modules/notification_mail/notification_mail.setting.keys';
import { SMS_KEYS } from '@/modules/notification_sms/notification_sms.setting.keys';
import { STORAGE_KEYS } from '@/modules/storage/storage.setting.keys';
import { AI_KEYS } from '@/modules/ai/ai.setting.keys';
import { PAYMENT_KEYS, TENANT_BILLING_KEYS } from '@/modules/payment/payment.setting.keys';
import { SECURITY_KEYS } from '@/modules/user_security/user_security.setting.keys';
import { TENANT_GENERAL_KEYS } from '@/modules/tenant/tenant.setting.keys';
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys';
import { TENANT_SECURITY_KEYS } from '@/modules/tenant_session/tenant_session.setting.keys';

// Lazy imports for settings components
import dynamic from 'next/dynamic';

const LoadingSpinner = () => <div className="flex items-center justify-center p-8"><span className="loading loading-spinner loading-lg"></span></div>;

const GeneralSettings = dynamic(() => import('./ui/general.settings'), { ssr: false, loading: LoadingSpinner });
const SecuritySettings = dynamic(() => import('./ui/security.settings'), { ssr: false, loading: LoadingSpinner });
const IntegrationsSettings = dynamic(() => import('./ui/integrations.settings'), { ssr: false, loading: LoadingSpinner });
const AnalyticsSettings = dynamic(() => import('./ui/analytics.settings'), { ssr: false, loading: LoadingSpinner });
const SocialSettings = dynamic(() => import('./ui/social.settings'), { ssr: false, loading: LoadingSpinner });
const NotificationSettings = dynamic(() => import('./ui/notification.settings'), { ssr: false, loading: LoadingSpinner });
const LocalizationSettings = dynamic(() => import('./ui/localization.settings'), { ssr: false, loading: LoadingSpinner });
const AuthSettings = dynamic(() => import('@/modules/auth/ui/auth.settings'), { ssr: false, loading: LoadingSpinner });
const EmailSettings = dynamic(() => import('@/modules/notification_mail/ui/notification_mail.settings'), { ssr: false, loading: LoadingSpinner });
const SmsSettings = dynamic(() => import('@/modules/notification_sms/ui/notification_sms.settings'), { ssr: false, loading: LoadingSpinner });
const PaymentSettings = dynamic(() => import('@/modules/payment/ui/payment.settings'), { ssr: false, loading: LoadingSpinner });
const StorageSettings = dynamic(() => import('@/modules/storage/ui/storage.settings'), { ssr: false, loading: LoadingSpinner });
const AiSettings = dynamic(() => import('@/modules/ai/ui/ai.settings'), { ssr: false, loading: LoadingSpinner });

// Tenant settings components
const TenantGeneralSettings = dynamic(() => import('@/modules/tenant/ui/tenant.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantDomainsSettings = dynamic(() => import('@/modules/tenant_domain/ui/tenant_domain.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantBrandingSettings = dynamic(() => import('@/modules/tenant_branding/ui/branding.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantSecuritySettings = dynamic(() => import('@/modules/tenant_session/ui/tenant_session.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantBillingSettings = dynamic(() => import('@/modules/payment/ui/payment.tenant'), { ssr: false, loading: LoadingSpinner });

// ============================================================================
// Types
// ============================================================================

export type TenantSettingsState = SettingsState;
export type TenantSettingsTabProps = SettingsTabProps;
export type ModuleScope = 'system' | 'tenant' | 'both';

export interface SettingsTab {
  id: string;
  label: string;
  icon: IconDefinition;
  keys: readonly string[];
  component: ComponentType<any>;
  order: number;
  scope: ModuleScope;
  moduleId: string;
}

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: IconDefinition;
  order: number;
  scope: ModuleScope;
  permissions?: string[];
  children?: MenuItem[];
  moduleId: string;
}

// Legacy type exports
export type SettingsTabEntry = SettingsTab;
export type NavMenuEntry = MenuItem;

// ============================================================================
// Static Settings Tabs
// ============================================================================

const SYSTEM_SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General', icon: faCog, component: GeneralSettings, order: 0, scope: 'system', keys: GENERAL_KEYS, moduleId: 'setting' },
  { id: 'auth', label: 'Authentication', icon: faUserShield, component: AuthSettings, order: 10, scope: 'system', keys: AUTH_KEYS, moduleId: 'auth' },
  { id: 'email', label: 'Email', icon: faEnvelope, component: EmailSettings, order: 20, scope: 'system', keys: EMAIL_KEYS, moduleId: 'notification_mail' },
  { id: 'sms', label: 'SMS', icon: faComment, component: SmsSettings, order: 30, scope: 'system', keys: SMS_KEYS, moduleId: 'notification_sms' },
  { id: 'storage', label: 'Storage', icon: faDatabase, component: StorageSettings, order: 40, scope: 'system', keys: STORAGE_KEYS, moduleId: 'storage' },
  { id: 'ai', label: 'AI', icon: faRobot, component: AiSettings, order: 50, scope: 'system', keys: AI_KEYS, moduleId: 'ai' },
  { id: 'security', label: 'Security', icon: faShield, component: SecuritySettings, order: 60, scope: 'system', keys: SECURITY_KEYS, moduleId: 'setting' },
  { id: 'integrations', label: 'Integrations', icon: faPlug, component: IntegrationsSettings, order: 70, scope: 'system', keys: [], moduleId: 'setting' },
  { id: 'analytics', label: 'Analytics', icon: faChartLine, component: AnalyticsSettings, order: 80, scope: 'system', keys: [], moduleId: 'setting' },
  { id: 'social', label: 'Social', icon: faShareNodes, component: SocialSettings, order: 90, scope: 'system', keys: [], moduleId: 'setting' },
  { id: 'payment', label: 'Payment', icon: faCreditCard, component: PaymentSettings, order: 100, scope: 'system', keys: PAYMENT_KEYS, moduleId: 'payment' },
  { id: 'notifications', label: 'Notifications', icon: faBell, component: NotificationSettings, order: 110, scope: 'system', keys: NOTIFICATION_KEYS, moduleId: 'setting' },
  { id: 'localization', label: 'Localization', icon: faGlobe, component: LocalizationSettings, order: 120, scope: 'system', keys: [], moduleId: 'setting' },
];

const TENANT_SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General', icon: faCog, component: TenantGeneralSettings, order: 0, scope: 'tenant', keys: TENANT_GENERAL_KEYS, moduleId: 'tenant' },
  { id: 'domains', label: 'Domains', icon: faGlobe, component: TenantDomainsSettings, order: 10, scope: 'tenant', keys: [], moduleId: 'tenant_domain' },
  { id: 'branding', label: 'Branding', icon: faPalette, component: TenantBrandingSettings, order: 20, scope: 'tenant', keys: TENANT_BRANDING_KEYS, moduleId: 'tenant_branding' },
  { id: 'security', label: 'Security', icon: faShield, component: TenantSecuritySettings, order: 50, scope: 'tenant', keys: TENANT_SECURITY_KEYS, moduleId: 'tenant_session' },
  { id: 'billing', label: 'Billing', icon: faCreditCard, component: TenantBillingSettings, order: 60, scope: 'tenant', keys: TENANT_BILLING_KEYS, moduleId: 'payment' },
];

// ============================================================================
// Static Menu Items
// ============================================================================

const SYSTEM_MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', href: '/system/admin', icon: faHome, order: 0, scope: 'system', moduleId: 'setting' },
  { id: 'users', label: 'Users', href: '/system/admin/users', icon: faUsers, order: 600, scope: 'system', permissions: ['users.view'], moduleId: 'user' },
  { id: 'tenants', label: 'Tenants', href: '/system/admin/tenants', icon: faBuilding, order: 700, scope: 'system', permissions: ['tenants.view'], moduleId: 'tenant' },
  { id: 'settings', label: 'Settings', href: '/system/admin/settings', icon: faCog, order: 900, scope: 'system', moduleId: 'setting' },
  { id: 'logout', label: 'Logout', href: '/auth/logout', icon: faSignOutAlt, order: 1000, scope: 'system', moduleId: 'auth' },
];

const TENANT_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '{tenantBase}/admin', icon: faTachometerAlt, order: 0, scope: 'tenant', moduleId: 'tenant' },
  { id: 'members', label: 'Members', href: '{tenantBase}/admin/members', icon: faUsers, order: 100, scope: 'tenant', moduleId: 'tenant' },
  { id: 'tenant-settings', label: 'Settings', href: '{tenantBase}/admin/settings', icon: faCog, order: 900, scope: 'tenant', moduleId: 'tenant' },
  { id: 'back-to-app', label: 'Back to App', href: '{tenantBase}', icon: faArrowLeft, order: 1000, scope: 'tenant', moduleId: 'tenant' },
];

// ============================================================================
// Public API - Settings Tabs
// ============================================================================

export function getSystemSettingsTabs(): SettingsTab[] {
  return SYSTEM_SETTINGS_TABS;
}

export function getTenantSettingsTabs(): SettingsTab[] {
  return TENANT_SETTINGS_TABS;
}

export function getAllSystemKeys(): string[] {
  return SYSTEM_SETTINGS_TABS.flatMap(tab => [...tab.keys]);
}

export function getAllTenantKeys(): string[] {
  return TENANT_SETTINGS_TABS.flatMap(tab => [...tab.keys]);
}

// ============================================================================
// Public API - Menu Items
// ============================================================================

export function getSystemMenuItems(): MenuItem[] {
  return SYSTEM_MENU_ITEMS;
}

export function getTenantMenuItems(tenantBase: string = ''): MenuItem[] {
  return TENANT_MENU_ITEMS.map(item => ({
    ...item,
    href: item.href.replace('{tenantBase}', tenantBase),
    children: item.children?.map(child => ({
      ...child,
      href: child.href.replace('{tenantBase}', tenantBase),
    })),
  }));
}

// ============================================================================
// Public API - Module Status
// ============================================================================

export function isModuleEnabled(_id: string): boolean {
  return true; // All modules are enabled in static mode
}

export function getEnabledModules(): { id: string; name: string }[] {
  return [
    { id: 'setting', name: 'Settings' },
    { id: 'auth', name: 'Authentication' },
    { id: 'notification_mail', name: 'Email Notifications' },
    { id: 'notification_sms', name: 'SMS Notifications' },
    { id: 'payment', name: 'Payment' },
    { id: 'storage', name: 'Storage' },
    { id: 'ai', name: 'AI' },
    { id: 'tenant', name: 'Multi-Tenancy' },
    { id: 'tenant_domain', name: 'Custom Domains' },
    { id: 'tenant_branding', name: 'Branding' },
    { id: 'tenant_session', name: 'Tenant Security' },
    { id: 'user', name: 'User Management' },
  ];
}

// Legacy alias
export const getAllModules = getEnabledModules;
