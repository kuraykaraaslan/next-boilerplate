import { z } from 'zod';

// ============================================================================
// SMS Setting Keys (Tenant-scoped SMS provider configuration)
//
// Every key below is read per-tenant via SettingService.getValue(tenantId, ...).
// When a tenant has no value for a given key, the provider falls back to the
// matching `env.*` value so the platform keeps working out-of-the-box.
// ============================================================================

export const SmsSettingKeySchema = z.enum([
  'smsProvider', 'smsEnabled', 'smsAllowedCountries',
  // ── Twilio ───────────────────────────────────────────────────────────────
  'twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber',
  // ── Vonage / Nexmo ───────────────────────────────────────────────────────
  'nexmoApiKey', 'nexmoApiSecret', 'nexmoPhoneNumber',
  // ── Clickatell ───────────────────────────────────────────────────────────
  'clickatellApiKey',
  // ── NetGSM ───────────────────────────────────────────────────────────────
  'netgsmUserCode', 'netgsmPassword', 'netgsmPhoneNumber',
]);
export type SmsSettingKey = z.infer<typeof SmsSettingKeySchema>;
export const SMS_KEYS = SmsSettingKeySchema.options;
