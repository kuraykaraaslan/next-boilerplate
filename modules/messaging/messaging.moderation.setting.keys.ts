import { z } from 'zod';

// ============================================================================
// Tenant Messaging Moderation Setting Keys
// ----------------------------------------------------------------------------
// Read per-tenant at runtime via SettingService.getByKeys(tenantId, keys).
// Values are stored as strings; see MESSAGING_MODERATION_DEFAULTS for fallbacks.
// ============================================================================

export const MessagingModerationSettingKeySchema = z.enum([
  // 'OFF' | 'LOG' | 'REPORT' | 'AUTO' — the enforcement policy.
  'messagingModerationMode',
  // JSON array string of blocklist entries: plain literals and /regex/flags forms.
  'messagingModerationKeywords',
  // 'true' to run the async AI (LLM) backstop classifier.
  'messagingModerationUseAi',
  // 'true' + AUTO mode → hold keyword-clean messages PENDING until the AI job resolves.
  'messagingModerationAiHold',
  // '0'..'100' — minimum AI score to treat a message as a violation.
  'messagingModerationAiThreshold',
  // '0' = off; otherwise auto-quarantine a message after N distinct open reports.
  'messagingModerationReportThreshold',
]);
export type MessagingModerationSettingKey = z.infer<typeof MessagingModerationSettingKeySchema>;
export const MESSAGING_MODERATION_KEYS = MessagingModerationSettingKeySchema.options;

/** Defaults applied when a tenant has not set the key. */
export const MESSAGING_MODERATION_DEFAULTS: Record<MessagingModerationSettingKey, string> = {
  messagingModerationMode: 'OFF',
  messagingModerationKeywords: '[]',
  messagingModerationUseAi: 'false',
  messagingModerationAiHold: 'false',
  messagingModerationAiThreshold: '70',
  messagingModerationReportThreshold: '0',
};
