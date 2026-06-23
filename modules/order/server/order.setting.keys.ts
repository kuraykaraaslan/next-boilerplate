import { z } from 'zod';

// Canonical per-tenant setting keys for the order module. Centralised so the
// service (runtime enforcement) and the settings-fields file (admin UI) never
// drift apart.
export const OrderSettingKeySchema = z.enum([
  'orderNumberPrefix',
  'orderDefaultCurrency',
  'orderDefaultStatus',
  'orderRequireCustomer',
  'orderAutoConfirmOnPayment',
]);
export type OrderSettingKey = z.infer<typeof OrderSettingKeySchema>;
export const ORDER_SETTING_KEY_LIST = OrderSettingKeySchema.options;
