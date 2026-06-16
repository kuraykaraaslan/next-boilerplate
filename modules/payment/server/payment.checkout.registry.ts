import { env } from '@nb/env';
import Logger from '@nb/logger';
import BasePaymentProvider, { WalletDescriptor } from './providers/base.provider';
import StripeProvider from './providers/stripe.provider';
import PaypalProvider from './providers/paypal.provider';
import IyzicoProvider from './providers/iyzico.provider';
import AlipayProvider from './providers/alipay.provider';
import WeChatPayProvider from './providers/wechatpay.provider';
import YooKassaProvider from './providers/yookassa.provider';
import CloudPaymentsProvider from './providers/cloudpayments.provider';
import { PaymentProvider } from './payment.enums';
import { PAYMENT_MESSAGES } from './payment.messages';
import SettingService from '@nb/setting/server/setting.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
  ['STRIPE', new StripeProvider()],
  ['PAYPAL', new PaypalProvider()],
  ['IYZICO', new IyzicoProvider()],
  ['ALIPAY', new AlipayProvider()],
  ['WECHATPAY', new WeChatPayProvider()],
  ['YOOKASSA', new YooKassaProvider()],
  ['CLOUDPAYMENTS', new CloudPaymentsProvider()],
]);

export const DEFAULT_PROVIDER: PaymentProvider =
  (env.PAYMENT_DEFAULT_PROVIDER?.toUpperCase() as PaymentProvider) || 'STRIPE';

export function getProvider(providerName?: PaymentProvider): BasePaymentProvider {
  const name = providerName || DEFAULT_PROVIDER;
  const provider = PROVIDERS.get(name);
  if (!provider) {
    Logger.error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`);
    throw new AppError(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`, 400, ErrorCode.VALIDATION_ERROR);
  }
  return provider;
}

export function getAvailableProviders(): PaymentProvider[] {
  return Array.from(PROVIDERS.keys());
}

export function getDefaultProvider(): PaymentProvider {
  return DEFAULT_PROVIDER;
}

export function getSupportedWallets(providerName?: PaymentProvider): WalletDescriptor[] {
  return getProvider(providerName).supportedWallets;
}

export function getWalletMatrix(): { provider: PaymentProvider; wallets: WalletDescriptor[] }[] {
  return Array.from(PROVIDERS.entries()).map(([provider, impl]) => ({
    provider,
    wallets: impl.supportedWallets,
  }));
}

// Provider → its per-tenant enable flag setting.
const ENABLED_KEY: Record<PaymentProvider, string> = {
  STRIPE: 'stripeEnabled', PAYPAL: 'paypalEnabled', IYZICO: 'iyzicoEnabled',
  ALIPAY: 'alipayEnabled', WECHATPAY: 'wechatPayEnabled',
  YOOKASSA: 'yookassaEnabled', CLOUDPAYMENTS: 'cloudpaymentsEnabled',
};

/**
 * Resolve the effective provider for a tenant: explicit choice, else the
 * tenant's `paymentDefaultProvider` setting, else the platform default. Then
 * enforce the per-tenant enable flag — a disabled provider is rejected so a
 * caller can't transact through a channel the tenant turned off.
 */
export async function resolveEnabledProvider(tenantId: string, providerName?: PaymentProvider): Promise<PaymentProvider> {
  let name = providerName;
  if (!name) {
    const configured = await SettingService.getValue(tenantId, 'paymentDefaultProvider').catch(() => null);
    name = (configured?.toUpperCase() as PaymentProvider) || DEFAULT_PROVIDER;
  }
  const flagKey = ENABLED_KEY[name];
  if (flagKey) {
    const enabled = await SettingService.getValue(tenantId, flagKey).catch(() => null);
    // Explicit 'false' disables; unset is treated as allowed (back-compat).
    if (enabled === 'false') {
      throw new AppError(`${PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED}: ${name} is disabled`, 422, ErrorCode.VALIDATION_ERROR);
    }
  }
  return name;
}
