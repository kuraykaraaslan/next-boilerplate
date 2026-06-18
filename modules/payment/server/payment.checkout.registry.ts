import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';
import type BasePaymentProvider from './providers/base.provider';
import { type WalletDescriptor } from './providers/base.provider';
import type { PaymentGatewayContribution } from './payment.gateway.types';
import { IsolatedPaymentProvider } from './providers/isolated.payment.provider';
import { PaymentProvider } from './payment.enums';
import { PAYMENT_MESSAGES } from './payment.messages';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

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
 * Resolve a gateway implementation. A SANDBOXED community gateway installed for the
 * tenant WINS (resolved per-call, not cached — `invoke` is tenant-bound); otherwise a
 * satellite contribution (extension registry) is used, then the in-tree fallback.
 * Async — satellite implementations are lazy-loaded — and the non-community path is
 * cached per provider.
 */
export async function getProvider(providerName?: PaymentProvider, tenantId?: string): Promise<BasePaymentProvider> {
  const name = providerName || DEFAULT_PROVIDER;

  if (tenantId) {
    // Lazy-load the community bridge so this module (and its callers/tests) don't pull
    // the DB layer at import time when no tenant-scoped resolution is needed.
    const { listExternalContributions } = await import('@kuraykaraaslan/common/server/external-extensions');
    const ext = (await listExternalContributions(tenantId, PAYMENT_GATEWAY_POINT)).find((c) => c.key === name.toLowerCase());
    if (ext) return new IsolatedPaymentProvider(ext.key, ext.metadata ?? {}, ext.invoke);
  }

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

/**
 * Available gateway keys. After full migration to sandboxed plugins the static
 * registry is empty, so a tenant's INSTALLED community gateways are the real list
 * (unioned with any remaining static/fallback contributions). Pass `tenantId` to
 * include community plugins — without it, only static/fallback keys are returned.
 */
export async function getAvailableProviders(tenantId?: string): Promise<PaymentProvider[]> {
  const fromExtensions = extensionRegistry
    .getContributions(PAYMENT_GATEWAY_POINT)
    .flatMap((c) => (c.key ? [c.key.toUpperCase() as PaymentProvider] : []));
  let community: PaymentProvider[] = [];
  if (tenantId) {
    const { listExternalContributions } = await import('@kuraykaraaslan/common/server/external-extensions');
    community = (await listExternalContributions(tenantId, PAYMENT_GATEWAY_POINT)).map((c) => c.key.toUpperCase() as PaymentProvider);
  }
  return [...new Set([...fromExtensions, ...community, ...FALLBACK.keys()])];
}

export function getDefaultProvider(): PaymentProvider {
  return DEFAULT_PROVIDER;
}

export async function getSupportedWallets(providerName?: PaymentProvider, tenantId?: string): Promise<WalletDescriptor[]> {
  return (await getProvider(providerName, tenantId)).supportedWallets;
}

export async function getWalletMatrix(tenantId?: string): Promise<{ provider: PaymentProvider; wallets: WalletDescriptor[] }[]> {
  const providers = await getAvailableProviders(tenantId);
  return Promise.all(
    providers.map(async (provider) => ({
      provider,
      wallets: (await getProvider(provider, tenantId)).supportedWallets,
    })),
  );
}

// Provider → its per-tenant enable flag setting.
const ENABLED_KEY: Record<PaymentProvider, string> = {
  STRIPE: 'stripeEnabled', PAYPAL: 'paypalEnabled', IYZICO: 'iyzicoEnabled',
  ALIPAY: 'alipayEnabled', WECHATPAY: 'wechatPayEnabled',
  YOOKASSA: 'yookassaEnabled', CLOUDPAYMENTS: 'cloudpaymentsEnabled',
  MANUAL: 'manualEnabled',
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
