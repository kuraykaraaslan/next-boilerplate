// ============================================================================
// Tenant Settings Configuration
// ============================================================================

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ComponentType } from 'react';
import {
  faCog,
  faShield,
  faGlobe,
  faCreditCard,
  faPalette,
  faTachometerAlt,
  faUsers,
  faArrowLeft,
  faBoxOpen,
} from '@fortawesome/free-solid-svg-icons';
import { SettingsTabProps, SettingsState } from '@/modules/setting/setting.types';

// Import setting keys from each module
import { TENANT_GENERAL_KEYS } from '@/modules/tenant/tenant.setting.keys';
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys';
import { TENANT_SECURITY_KEYS } from '@/modules/tenant_session/tenant_session.setting.keys';
import { TENANT_BILLING_KEYS } from '@/modules/payment/payment.setting.keys';

// Lazy imports for settings components
import dynamic from 'next/dynamic';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <span className="loading loading-spinner loading-lg"></span>
  </div>
);

const TenantGeneralSettings = dynamic(() => import('@/modules/tenant/ui/tenant.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantDomainsSettings = dynamic(() => import('@/modules/tenant_domain/ui/tenant_domain.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantBrandingSettings = dynamic(() => import('@/modules/tenant_branding/ui/branding.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantSecuritySettings = dynamic(() => import('@/modules/tenant_session/ui/tenant_session.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantBillingSettings = dynamic(() => import('@/modules/payment/ui/payment.tenant'), { ssr: false, loading: LoadingSpinner });
const TenantSubscriptionSettings = dynamic(() => import('@/modules/tenant_subscription/ui/subscription.tenant'), { ssr: false, loading: LoadingSpinner });

// ============================================================================
// Types
// ============================================================================

export type TenantSettingsState = SettingsState;
export type TenantSettingsTabProps = SettingsTabProps;

export interface TenantSettingsTab {
  id: string;
  label: string;
  icon: IconDefinition;
  keys: readonly string[];
  component: ComponentType<SettingsTabProps>;
  order: number;
}

export interface TenantMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: IconDefinition;
  order: number;
  permissions?: string[];
}

// ============================================================================
// Tenant Settings Tabs
// ============================================================================

const TENANT_SETTINGS_TABS: TenantSettingsTab[] = [
  { id: 'general', label: 'General', icon: faCog, component: TenantGeneralSettings, order: 0, keys: TENANT_GENERAL_KEYS },
  { id: 'domains', label: 'Domains', icon: faGlobe, component: TenantDomainsSettings, order: 10, keys: [] },
  { id: 'branding', label: 'Branding', icon: faPalette, component: TenantBrandingSettings, order: 20, keys: TENANT_BRANDING_KEYS },
  { id: 'subscription', label: 'Subscription', icon: faBoxOpen, component: TenantSubscriptionSettings, order: 30, keys: [] },
  { id: 'security', label: 'Security', icon: faShield, component: TenantSecuritySettings, order: 50, keys: TENANT_SECURITY_KEYS },
  { id: 'billing', label: 'Billing', icon: faCreditCard, component: TenantBillingSettings, order: 60, keys: TENANT_BILLING_KEYS },
];

// ============================================================================
// Tenant Menu Items (href uses {tenantBase} placeholder)
// ============================================================================

const TENANT_MENU_ITEMS: TenantMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '{tenantBase}/admin', icon: faTachometerAlt, order: 0 },
  { id: 'members', label: 'Members', href: '{tenantBase}/admin/members', icon: faUsers, order: 100 },
  { id: 'tenant-settings', label: 'Settings', href: '{tenantBase}/admin/settings', icon: faCog, order: 900 },
  { id: 'back-to-app', label: 'Back to App', href: '{tenantBase}', icon: faArrowLeft, order: 1000 },
];

// ============================================================================
// Public API
// ============================================================================

export function getTenantSettingsTabs(): TenantSettingsTab[] {
  return TENANT_SETTINGS_TABS;
}

export function getTenantMenuItems(tenantBase: string = ''): TenantMenuItem[] {
  return TENANT_MENU_ITEMS.map(item => ({
    ...item,
    href: item.href.replace('{tenantBase}', tenantBase),
  }));
}

export function getAllTenantKeys(): string[] {
  return TENANT_SETTINGS_TABS.flatMap(tab => [...tab.keys]);
}
