// ============================================================================
// Module Initialization
// ============================================================================
// This file imports all module configs to trigger auto-registration.
// Import this file once in your app's entry point (e.g., root layout).

// Settings modules
import '@/modules/setting/setting.settings.config';
import '@/modules/auth/auth.settings.config';
import '@/modules/payment/payment.settings.config';
import '@/modules/ai/ai.settings.config';
import '@/modules/storage/storage.settings.config';
import '@/modules/notification_mail/notification_mail.settings.config';
import '@/modules/notification_sms/notification_sms.settings.config';
import '@/modules/tenant/tenant.settings.config';
import '@/modules/tenant_domain/tenant_domain.settings.config';
import '@/modules/tenant_branding/tenant_branding.settings.config';
import '@/modules/tenant_session/tenant_session.settings.config';

// Menu-only modules
import '@/modules/user/user.config';
import '@/modules/auth/auth.config';
