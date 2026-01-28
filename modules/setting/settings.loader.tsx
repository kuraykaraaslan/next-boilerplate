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

// Setting keys per module
const SETTING_KEYS = {
  general: ['siteName', 'siteUrl', 'siteDescription', 'logoUrl', 'faviconUrl', 'applicationHost', 'applicationDomain', 'i18nLanguages', 'contactName', 'contactTitle', 'contactEmail', 'contactPhone', 'maintenanceMode', 'maintenanceMessage'],
  auth: ['allowRegistration', 'emailVerificationRequired', 'sessionDuration', 'maxLoginAttempts', 'ssoAllowedProviders', 'jwtAccessTokenSecret', 'jwtAccessTokenExpiresIn', 'jwtRefreshTokenSecret', 'jwtRefreshTokenExpiresIn', 'oauthGoogle', 'oauthGitHub', 'oauthMicrosoft', 'oauthLinkedIn', 'oauthApple', 'oauthTwitter', 'oauthMeta', 'oauthAutodesk', 'googleClientId', 'googleClientSecret', 'githubClientId', 'githubClientSecret', 'appleClientId', 'appleTeamId', 'appleKeyId', 'applePrivateKey', 'metaClientId', 'metaClientSecret', 'autodeskClientId', 'autodeskClientSecret', 'gitlabToken', 'gitlabUser'],
  email: ['smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'smtpEncryption', 'fromEmail', 'fromName', 'pushNotificationsEnabled', 'vapidPublicKey', 'vapidPrivateKey', 'emailOnNewUser', 'emailOnNewComment', 'emailOnNewOrder', 'emailOnNewContact', 'slackWebhookUrl', 'slackNotificationsEnabled', 'adminNotificationEmail'],
  sms: ['smsProvider', 'smsEnabled', 'twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber', 'netgsmUserCode', 'netgsmPassword', 'netgsmPhoneNumber'],
  storage: ['storageProvider', 's3Bucket', 's3Region', 's3AccessKey', 's3SecretKey', 's3Endpoint', 'maxFileSizeMb', 'allowedExtensions'],
  ai: ['aiEnabled', 'aiDefaultProvider', 'aiDailyLimit', 'aiMonthlyBudget', 'openaiApiKey', 'openaiDefaultModel', 'openaiMaxTokens', 'openaiBaseUrl', 'anthropicApiKey', 'anthropicDefaultModel', 'anthropicMaxTokens', 'googleAiApiKey', 'googleDefaultModel', 'googleMaxTokens', 'huggingfaceToken', 'tinymceApiKey'],
  security: ['rateLimitPerMinute', 'rateLimitPerHour', 'rateLimitEnabled', 'corsAllowedOrigins', 'hstsEnabled', 'xContentTypeOptions', 'xFrameOptions', 'blockedIps', 'recaptchaEnabled', 'recaptchaClientKey', 'recaptchaServerKey', 'maxmindAccountId', 'maxmindApiKey', 'cronSecret'],
  integrations: ['discordWebhookUrl', 'discordDoormanWebhookUrl', 'githubTreeUrl', 'githubToken', 'githubUser'],
  analytics: ['googleTagId'],
  social: ['facebookUrl', 'twitterUrl', 'instagramUrl', 'linkedinUrl', 'youtubeUrl', 'githubProfileUrl', 'tiktokUrl', 'pinterestUrl'],
  payment: ['stripeEnabled', 'stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret', 'paypalEnabled', 'paypalClientId', 'paypalClientSecret', 'paypalSandboxMode', 'iyzicoEnabled', 'iyzicoApiKey', 'iyzicoSecretKey', 'iyzicoSandboxMode', 'currency', 'taxRate', 'taxEnabled', 'billingEmail', 'billingName', 'billingAddress', 'taxId', 'vatNumber', 'invoicePrefix', 'invoiceFooter'],
  notifications: ['pushNotificationsEnabled', 'vapidPublicKey', 'vapidPrivateKey', 'emailOnNewUser', 'emailOnNewComment', 'emailOnNewOrder', 'emailOnNewContact', 'slackWebhookUrl', 'slackNotificationsEnabled', 'adminNotificationEmail'],
  localization: ['defaultTimezone', 'defaultLanguage', 'dateFormat', 'timeFormat', 'datetimeFormat', 'weekStartsOn', 'currencySymbol', 'currencyPosition', 'thousandSeparator', 'decimalSeparator'],
  // Tenant keys
  tenantGeneral: ['tenantName', 'tenantDescription', 'logoUrl', 'faviconUrl', 'primaryColor', 'secondaryColor', 'accentColor', 'contactEmail', 'contactPhone', 'contactAddress', 'timezone', 'language', 'dateFormat', 'timeFormat'],
  tenantBranding: ['brandName', 'brandTagline', 'brandLogoLight', 'brandLogoDark', 'brandFavicon', 'brandPrimaryColor', 'brandSecondaryColor', 'customCss', 'customJs'],
  tenantSecurity: ['twoFactorRequired', 'passwordMinLength', 'passwordRequireUppercase', 'passwordRequireNumbers', 'passwordRequireSymbols', 'sessionTimeout', 'maxLoginAttempts', 'ipWhitelist', 'ipBlacklist', 'ssoEnabled', 'ssoProvider', 'ssoConfig'],
  tenantBilling: ['billingEmail', 'billingName', 'billingAddress', 'taxId', 'vatNumber'],
};

const SYSTEM_SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General', icon: faCog, component: GeneralSettings, order: 0, scope: 'system', keys: SETTING_KEYS.general, moduleId: 'setting' },
  { id: 'auth', label: 'Authentication', icon: faUserShield, component: AuthSettings, order: 10, scope: 'system', keys: SETTING_KEYS.auth, moduleId: 'auth' },
  { id: 'email', label: 'Email', icon: faEnvelope, component: EmailSettings, order: 20, scope: 'system', keys: SETTING_KEYS.email, moduleId: 'notification_mail' },
  { id: 'sms', label: 'SMS', icon: faComment, component: SmsSettings, order: 30, scope: 'system', keys: SETTING_KEYS.sms, moduleId: 'notification_sms' },
  { id: 'storage', label: 'Storage', icon: faDatabase, component: StorageSettings, order: 40, scope: 'system', keys: SETTING_KEYS.storage, moduleId: 'storage' },
  { id: 'ai', label: 'AI', icon: faRobot, component: AiSettings, order: 50, scope: 'system', keys: SETTING_KEYS.ai, moduleId: 'ai' },
  { id: 'security', label: 'Security', icon: faShield, component: SecuritySettings, order: 60, scope: 'system', keys: SETTING_KEYS.security, moduleId: 'setting' },
  { id: 'integrations', label: 'Integrations', icon: faPlug, component: IntegrationsSettings, order: 70, scope: 'system', keys: SETTING_KEYS.integrations, moduleId: 'setting' },
  { id: 'analytics', label: 'Analytics', icon: faChartLine, component: AnalyticsSettings, order: 80, scope: 'system', keys: SETTING_KEYS.analytics, moduleId: 'setting' },
  { id: 'social', label: 'Social', icon: faShareNodes, component: SocialSettings, order: 90, scope: 'system', keys: SETTING_KEYS.social, moduleId: 'setting' },
  { id: 'payment', label: 'Payment', icon: faCreditCard, component: PaymentSettings, order: 100, scope: 'system', keys: SETTING_KEYS.payment, moduleId: 'payment' },
  { id: 'notifications', label: 'Notifications', icon: faBell, component: NotificationSettings, order: 110, scope: 'system', keys: SETTING_KEYS.notifications, moduleId: 'setting' },
  { id: 'localization', label: 'Localization', icon: faGlobe, component: LocalizationSettings, order: 120, scope: 'system', keys: SETTING_KEYS.localization, moduleId: 'setting' },
];

const TENANT_SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General', icon: faCog, component: TenantGeneralSettings, order: 0, scope: 'tenant', keys: SETTING_KEYS.tenantGeneral, moduleId: 'tenant' },
  { id: 'domains', label: 'Domains', icon: faGlobe, component: TenantDomainsSettings, order: 10, scope: 'tenant', keys: [], moduleId: 'tenant_domain' },
  { id: 'branding', label: 'Branding', icon: faPalette, component: TenantBrandingSettings, order: 20, scope: 'tenant', keys: SETTING_KEYS.tenantBranding, moduleId: 'tenant_branding' },
  { id: 'security', label: 'Security', icon: faShield, component: TenantSecuritySettings, order: 50, scope: 'tenant', keys: SETTING_KEYS.tenantSecurity, moduleId: 'tenant_session' },
  { id: 'billing', label: 'Billing', icon: faCreditCard, component: TenantBillingSettings, order: 60, scope: 'tenant', keys: SETTING_KEYS.tenantBilling, moduleId: 'payment' },
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
