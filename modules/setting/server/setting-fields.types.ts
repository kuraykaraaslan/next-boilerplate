// Shared, framework-agnostic metadata that drives the generic per-module
// settings scaffold (ModuleSettingsPage). These types carry NO runtime imports
// so per-module field files (modules/<m>/<m>.settings.fields.ts) stay safe to
// import into 'use client' pages.

export type SettingFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'secret'
  | 'url'
  | 'email';

export type SettingFieldOption = { value: string; label: string };

export type SettingFieldDef = {
  /** The setting key as stored in the per-tenant `settings` table. */
  key: string;
  /** UI label (English, to match the rest of the admin UI). */
  label: string;
  /** Optional helper text shown under the field. */
  description?: string;
  /** Groups fields into Cards on the settings page (first-seen order wins). */
  group: string;
  type: SettingFieldType;
  /** Options for `select` fields. */
  options?: SettingFieldOption[];
  /** Default value (string form; booleans as 'true' | 'false'). */
  defaultValue?: string;
  placeholder?: string;
};

/** Sentinel returned by masked secret services; never write it back as a value. */
export const SECRET_MASK = '***SET***';
