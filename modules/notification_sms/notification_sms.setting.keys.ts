import { z } from 'zod';

// ============================================================================
// SMS Setting Keys (System-level SMS configuration)
// ============================================================================

export const SmsSettingKeySchema = z.enum([
  'smsProvider', 'smsEnabled',
  'twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber',
  'netgsmUserCode', 'netgsmPassword', 'netgsmPhoneNumber',
]);
export type SmsSettingKey = z.infer<typeof SmsSettingKeySchema>;
export const SMS_KEYS = SmsSettingKeySchema.options;
