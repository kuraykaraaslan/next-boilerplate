// ============================================================================
// Keys Registry
// ============================================================================
// Maps key group names to actual key arrays

import { GENERAL_KEYS, AUTH_KEYS } from '@/modules/auth/auth.setting.keys';
import { EMAIL_KEYS, NOTIFICATION_KEYS } from '@/modules/notification_mail/notification_mail.setting.keys';
import { SMS_KEYS } from '@/modules/notification_sms/notification_sms.setting.keys';
import { PAYMENT_KEYS, TENANT_BILLING_KEYS } from '@/modules/payment/payment.setting.keys';
import { AI_KEYS } from '@/modules/ai/ai.setting.keys';
import { STORAGE_KEYS } from '@/modules/storage/storage.setting.keys';
import { SECURITY_KEYS } from '@/modules/user_security/user_security.setting.keys';
import { TENANT_GENERAL_KEYS } from '@/modules/tenant/tenant.setting.keys';
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys';
import { TENANT_SECURITY_KEYS } from '@/modules/tenant_session/tenant_session.setting.keys';
import {
  INTEGRATIONS_KEYS,
  ANALYTICS_KEYS,
  SOCIAL_KEYS,
  LOCALIZATION_KEYS,
} from './setting.types';

const KEYS_MAP: Record<string, readonly string[]> = {
  GENERAL_KEYS,
  AUTH_KEYS,
  EMAIL_KEYS,
  NOTIFICATION_KEYS,
  SMS_KEYS,
  PAYMENT_KEYS,
  TENANT_BILLING_KEYS,
  AI_KEYS,
  STORAGE_KEYS,
  SECURITY_KEYS,
  INTEGRATIONS_KEYS,
  ANALYTICS_KEYS,
  SOCIAL_KEYS,
  LOCALIZATION_KEYS,
  TENANT_GENERAL_KEYS,
  TENANT_BRANDING_KEYS,
  TENANT_SECURITY_KEYS,
};

export function getKeys(name: string | readonly string[] | string[]): readonly string[] {
  if (Array.isArray(name)) {
    return name as readonly string[];
  }
  return KEYS_MAP[name as string] || [];
}

export function registerKeys(name: string, keys: readonly string[]): void {
  KEYS_MAP[name] = keys;
}
