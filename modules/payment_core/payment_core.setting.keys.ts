import { z } from 'zod';

export const PaymentProviderSettingKeySchema = z.enum([
  'stripeEnabled', 'stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret',
  'paypalEnabled', 'paypalClientId', 'paypalClientSecret', 'paypalSandboxMode', 'paypalWebhookId',
  'iyzicoEnabled', 'iyzicoApiKey', 'iyzicoSecretKey', 'iyzicoSandboxMode',
  'alipayEnabled', 'alipayAppId', 'alipayPrivateKey', 'alipayPublicKey', 'alipaySandboxMode',
  'wechatPayEnabled', 'wechatPayAppId', 'wechatPayMchId', 'wechatPayPrivateKey',
  'wechatPaySerialNo', 'wechatPayApiV3Key', 'wechatPayNotifyUrl',
  'yookassaEnabled', 'yookassaShopId', 'yookassaSecretKey',
  'cloudpaymentsEnabled', 'cloudpaymentsPublicId', 'cloudpaymentsApiSecret',
]);
export type PaymentProviderSettingKey = z.infer<typeof PaymentProviderSettingKeySchema>;
export const PAYMENT_CORE_KEYS = PaymentProviderSettingKeySchema.options;
