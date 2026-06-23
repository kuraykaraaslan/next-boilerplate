import { z } from 'zod';

// Canonical per-tenant setting keys for the form_builder module. Centralised so
// the settings-fields file (admin UI) and any runtime readers never drift apart.
export const FormBuilderSettingKeySchema = z.enum([
  'formBuilderDefaultStatus',
  'formBuilderNotifyEmail',
  'formBuilderEnableSpamProtection',
  'formBuilderMaxSubmissionsPerDay',
]);
export type FormBuilderSettingKey = z.infer<typeof FormBuilderSettingKeySchema>;
export const FORM_BUILDER_SETTING_KEY_LIST = FormBuilderSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const FORM_BUILDER_SETTING_KEYS = {
  DEFAULT_STATUS: 'formBuilderDefaultStatus',
  NOTIFY_EMAIL: 'formBuilderNotifyEmail',
  ENABLE_SPAM_PROTECTION: 'formBuilderEnableSpamProtection',
  MAX_SUBMISSIONS_PER_DAY: 'formBuilderMaxSubmissionsPerDay',
} as const satisfies Record<string, FormBuilderSettingKey>;
