import { z } from 'zod';

// Canonical per-tenant setting keys for the procurement module. Centralised so
// the admin settings UI and any future runtime enforcement never drift apart.
export const ProcurementSettingKeySchema = z.enum([
  'procurementPoNumberPrefix',
  'procurementDefaultCurrency',
  'procurementApprovalThreshold',
  'procurementAutoReceiveOnFull',
]);
export type ProcurementSettingKey = z.infer<typeof ProcurementSettingKeySchema>;
export const PROCUREMENT_SETTING_KEY_LIST = ProcurementSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const PROCUREMENT_SETTING_KEYS = {
  PO_NUMBER_PREFIX: 'procurementPoNumberPrefix',
  DEFAULT_CURRENCY: 'procurementDefaultCurrency',
  APPROVAL_THRESHOLD: 'procurementApprovalThreshold',
  AUTO_RECEIVE_ON_FULL: 'procurementAutoReceiveOnFull',
} as const satisfies Record<string, ProcurementSettingKey>;
