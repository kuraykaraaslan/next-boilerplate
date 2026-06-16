import { env } from '@nb/env';
import Logger from '@nb/logger';
import { extensionRegistry } from '@nb/common/server/extension-registry';
import type BasePaymentProvider from './providers/base.provider';
import { type WalletDescriptor } from './providers/base.provider';
import type { PaymentGatewayContribution } from './payment.gateway.types';
import { PaymentProvider } from './payment.enums';
import { PAYMENT_MESSAGES } from './payment.messages';
import SettingService from '@nb/setting/server/setting.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const PAYMENT_GATEWAY_POINT = 'payment:gateway';

/**
 * Not-yet-migrated gateways, still in-tree (Partial — shrinks as gateways move
 * into their own satellite module, payment_<key>, discovered via the extension
 * registry).
 */
const FALLBACK = new Map<PaymentProvider, () => BasePaymentProvider>();

const instances = new Map<PaymentProvider, BasePaymentProvider>();

export const DEFAULT_PROVIDER: PaymentProvider =
  (env.PAYMENT_DEFAULT_PROVIDER?.toUpperCase() as PaymentProvider) || 'STRIPE';

/**
 * Resolve a gateway implementation. Satellite contributions (extension registry)
 * win; otherwise the in-tree fallback factory is used. Async — satellite
 * implementations are lazy-loaded — and cached per provider.
 */
export async function getProvider(providerName?: PaymentProvider): Promise<BasePaymentProvider> {
  const name = providerName || DEFAULT_PROVIDER;
  const cached = instances.get(name);
  if (cached) return cached;

  let impl: BasePaymentProvider;
  const contrib = extensionRegistry
    .getContributions(PAYMENT_GATEWAY_POINT)
    .find((c) => c.key === name.toLowerCase());
  if (contrib) {
    const c = await extensionRegistry.load<PaymentGatewayContribution>(contrib);
    impl = c.create();
  } else {
    const factory = FALLBACK.get(name);
    if (!factory) {
      Logger.error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`);
      throw new AppError(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`, 400, ErrorCode.VALIDATION_ERROR);
    }
    impl = factory();
  }
  instances.set(name, impl);
  return impl;
}

export function getAvailableProviders(): PaymentProvider[] {
  const fromExtensions = extensionRegistry
    .getContributions(PAYMENT_GATEWAY_POINT)
    .flatMap((c) => (c.key ? [c.key.toUpperCase() as PaymentProvider] : []));
  return [...new Set([...fromExtensions, ...FALLBACK.keys()])];
}

export function getDefaultProvider(): PaymentProvider {
  return DEFAULT_PROVIDER;
}

export async function getSupportedWallets(providerName?: PaymentProvider): Promise<WalletDescriptor[]> {
  return (await getProvider(providerName)).supportedWallets;
}

export async function getWalletMatrix(): Promise<{ provider: PaymentProvider; wallets: WalletDescriptor[] }[]> {
  return Promise.all(
    getAvailableProviders().map(async (provider) => ({
      provider,
      wallets: (await getProvider(provider)).supportedWallets,
    })),
  );
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
