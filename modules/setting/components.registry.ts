// ============================================================================
// Component Registry
// ============================================================================
// Maps component paths to actual React components
// Add new components here when creating new modules

import { ComponentType } from 'react';
import { SettingsTabProps } from './setting.types';

// Setting module
import GeneralSettings from './ui/general.settings';
import SecuritySettings from './ui/security.settings';
import LocalizationSettings from './ui/localization.settings';
import NotificationSettings from './ui/notification.settings';
import IntegrationsSettings from './ui/integrations.settings';
import AnalyticsSettings from './ui/analytics.settings';
import SocialSettings from './ui/social.settings';

// Auth module
import AuthSettings from '@/modules/auth/ui/auth.settings';

// Payment module
import PaymentSettings from '@/modules/payment/ui/payment.settings';
import BillingTab from '@/modules/payment/ui/payment.tenant';

// AI module
import AISettings from '@/modules/ai/ui/ai.settings';

// Storage module
import StorageSettings from '@/modules/storage/ui/storage.settings';

// Notification modules
import EmailSettings from '@/modules/notification_mail/ui/notification_mail.settings';
import SmsSettings from '@/modules/notification_sms/ui/notification_sms.settings';

// Tenant modules
import TenantGeneralTab from '@/modules/tenant/ui/tenant.tenant';
import DomainsTab from '@/modules/tenant_domain/ui/tenant_domain.tenant';
import BrandingTab from '@/modules/tenant_branding/ui/branding.tenant';
import SecurityTab from '@/modules/tenant_session/ui/tenant_session.tenant';

type SettingsComponent = ComponentType<SettingsTabProps>;

const COMPONENT_MAP: Record<string, SettingsComponent> = {
  // Setting module
  '@/modules/setting/ui/general.settings': GeneralSettings,
  '@/modules/setting/ui/security.settings': SecuritySettings,
  '@/modules/setting/ui/localization.settings': LocalizationSettings,
  '@/modules/setting/ui/notification.settings': NotificationSettings,
  '@/modules/setting/ui/integrations.settings': IntegrationsSettings,
  '@/modules/setting/ui/analytics.settings': AnalyticsSettings,
  '@/modules/setting/ui/social.settings': SocialSettings,

  // Auth module
  '@/modules/auth/ui/auth.settings': AuthSettings,

  // Payment module
  '@/modules/payment/ui/payment.settings': PaymentSettings,
  '@/modules/payment/ui/payment.tenant': BillingTab,

  // AI module
  '@/modules/ai/ui/ai.settings': AISettings,

  // Storage module
  '@/modules/storage/ui/storage.settings': StorageSettings,

  // Notification modules
  '@/modules/notification_mail/ui/notification_mail.settings': EmailSettings,
  '@/modules/notification_sms/ui/notification_sms.settings': SmsSettings,

  // Tenant modules
  '@/modules/tenant/ui/tenant.tenant': TenantGeneralTab,
  '@/modules/tenant_domain/ui/tenant_domain.tenant': DomainsTab,
  '@/modules/tenant_branding/ui/branding.tenant': BrandingTab,
  '@/modules/tenant_session/ui/tenant_session.tenant': SecurityTab,
};

export function getComponent(modulePath: string, componentPath: string): SettingsComponent | null {
  const fullPath = `${modulePath}/${componentPath}`;
  const component = COMPONENT_MAP[fullPath];
  if (!component) {
    console.warn(`Component "${fullPath}" not found in registry`);
    return null;
  }
  return component;
}

export function registerComponent(path: string, component: SettingsComponent): void {
  COMPONENT_MAP[path] = component;
}
