import { z } from 'zod';

// ============================================================================
// System Payment Setting Keys
// ============================================================================

export const PaymentSettingKeySchema = z.enum([
  'stripeEnabled', 'stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret',
  'paypalEnabled', 'paypalClientId', 'paypalClientSecret', 'paypalSandboxMode', 'paypalWebhookId',
  'iyzicoEnabled', 'iyzicoApiKey', 'iyzicoSecretKey', 'iyzicoSandboxMode',
  // Alipay (China)
  'alipayEnabled', 'alipayAppId', 'alipayPrivateKey', 'alipayPublicKey', 'alipaySandboxMode',
  // WeChat Pay (China)
  'wechatPayEnabled', 'wechatPayAppId', 'wechatPayMchId', 'wechatPayPrivateKey',
  'wechatPaySerialNo', 'wechatPayApiV3Key', 'wechatPayNotifyUrl',
  // YooKassa (Russia)
  'yookassaEnabled', 'yookassaShopId', 'yookassaSecretKey',
  // CloudPayments (Russia)
  'cloudpaymentsEnabled', 'cloudpaymentsPublicId', 'cloudpaymentsApiSecret',
  'currency', 'taxRate', 'taxEnabled',
]);
export type PaymentSettingKey = z.infer<typeof PaymentSettingKeySchema>;
export const PAYMENT_KEYS = PaymentSettingKeySchema.options;

// ============================================================================
// Tenant Billing Setting Keys
// ============================================================================

export const TenantBillingSettingKeySchema = z.enum([
  'billingEmail', 'billingName', 'billingAddress',
  'taxId', 'vatNumber', 'currency',
  'invoicePrefix', 'invoiceFooter',
]);
export type TenantBillingSettingKey = z.infer<typeof TenantBillingSettingKeySchema>;
export const TENANT_BILLING_KEYS = TenantBillingSettingKeySchema.options;
