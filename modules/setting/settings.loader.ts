// ============================================================================
// Settings & Menu Loader
// ============================================================================
// Collects and filters settings tabs and menu items from all modules

import {
  SettingsTabEntry,
  NavMenuEntry,
  getSystemTabs,
  getTenantTabs,
  getAllKeys,
  getSystemMenu,
  getTenantMenu,
} from './settings.registry';

// Import settings tabs from each module
import { SETTINGS_TABS as SETTING_TABS, MENU_ITEMS as SETTING_MENU } from './setting.settings.config';
import { SETTINGS_TABS as AUTH_TABS } from '@/modules/auth/auth.settings.config';
import { SETTINGS_TABS as PAYMENT_TABS } from '@/modules/payment/payment.settings.config';
import { SETTINGS_TABS as AI_TABS } from '@/modules/ai/ai.settings.config';
import { SETTINGS_TABS as STORAGE_TABS } from '@/modules/storage/storage.settings.config';
import { SETTINGS_TABS as MAIL_TABS } from '@/modules/notification_mail/notification_mail.settings.config';
import { SETTINGS_TABS as SMS_TABS } from '@/modules/notification_sms/notification_sms.settings.config';
import { SETTINGS_TABS as TENANT_TABS, MENU_ITEMS as TENANT_MENU } from '@/modules/tenant/tenant.settings.config';
import { SETTINGS_TABS as DOMAIN_TABS } from '@/modules/tenant_domain/tenant_domain.settings.config';
import { SETTINGS_TABS as BRANDING_TABS } from '@/modules/tenant_branding/tenant_branding.settings.config';
import { SETTINGS_TABS as SESSION_TABS } from '@/modules/tenant_session/tenant_session.settings.config';

// Import menu items from modules
import { MENU_ITEMS as USER_MENU } from '@/modules/user/user.config';
import { MENU_ITEMS as AUTH_MENU } from '@/modules/auth/auth.config';

// ============================================================================
// Settings Tabs
// ============================================================================

const ALL_TABS: SettingsTabEntry[] = [
  ...SETTING_TABS,
  ...AUTH_TABS,
  ...PAYMENT_TABS,
  ...AI_TABS,
  ...STORAGE_TABS,
  ...MAIL_TABS,
  ...SMS_TABS,
  ...TENANT_TABS,
  ...DOMAIN_TABS,
  ...BRANDING_TABS,
  ...SESSION_TABS,
];

export function getSystemSettingsTabs(): SettingsTabEntry[] {
  return getSystemTabs(ALL_TABS);
}

export function getAllSystemKeys(): string[] {
  return getAllKeys(getSystemTabs(ALL_TABS));
}

export function getTenantSettingsTabs(): SettingsTabEntry[] {
  return getTenantTabs(ALL_TABS);
}

export function getAllTenantKeys(): string[] {
  return getAllKeys(getTenantTabs(ALL_TABS));
}

// ============================================================================
// Menu Items
// ============================================================================

const ALL_MENU_ITEMS: NavMenuEntry[] = [
  ...SETTING_MENU,
  ...USER_MENU,
  ...AUTH_MENU,
  ...TENANT_MENU,
];

export function getSystemMenuItems(): NavMenuEntry[] {
  return getSystemMenu(ALL_MENU_ITEMS);
}

export function getTenantMenuItems(tenantBase: string = ''): NavMenuEntry[] {
  const items = getTenantMenu(ALL_MENU_ITEMS);
  // Replace {tenantBase} placeholder with actual value
  return items.map(item => ({
    ...item,
    href: item.href.replace('{tenantBase}', tenantBase),
  }));
}

// Re-export types
export type { TenantSettingsTabProps, SettingsTabEntry, NavMenuEntry } from './settings.registry';
