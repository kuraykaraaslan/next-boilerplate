import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '@kuraykaraaslan/payment/server/entities/subscription_plan.entity';
import { StoreProduct as ProductEntity } from '@kuraykaraaslan/store/server/entities/store_product.entity';
import PaymentService from '@kuraykaraaslan/payment/server/payment.service';
import { ExchangeRateService } from '@kuraykaraaslan/exchange_rate';
import type { PaymentProvider } from '@kuraykaraaslan/payment/server/payment.enums';
import type { CardBinInfo } from '@kuraykaraaslan/payment/server/payment.types';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { fetchProductOrThrow } from './tenant_subscription.helpers';

/** Providers that settle Turkish cards in TRY, so a TR card triggers conversion. */
export const TRY_SETTLE_PROVIDERS: ReadonlySet<PaymentProvider> = new Set<PaymentProvider>(['IYZICO']);

export interface ResolveChargeResult {
  plan: SubscriptionPlanEntity;
  product: ProductEntity;
  baseAmount: number;
  baseCurrency: string;
  binInfo: CardBinInfo | null;
  isTurkish: boolean;
  chargedAmount: number;
  chargedCurrency: string;
  exchangeRate: number | null;
}

/**
 * Work out what currency/amount a plan should actually be charged in for a
 * given card BIN + provider, without creating any payment. Shared by `quote`
 * (live checkout preview) and `payWithCard` (the real charge), so both stay in
 * lockstep. A plan priced in USD is converted to TRY at the live TCMB rate when
 * a TRY-settling provider (iyzico) is paid with a Turkish card.
 */
export async function resolveCharge(
  tenantId: string,
  planId: string,
  bin: string | undefined,
  provider: PaymentProvider,
): Promise<ResolveChargeResult> {
  const sysDs = await tenantDataSourceFor(tenantId);
  const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
  if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const product = await fetchProductOrThrow(tenantId, plan.productId);

  const baseAmount = Number(product.basePrice);
  const baseCurrency = product.currency;

  let binInfo: CardBinInfo | null = null;
  if (bin && bin.replace(/\D/g, '').length >= 6) {
    binInfo = await PaymentService.checkBin(tenantId, bin, provider);
  }

  const wantsTry =
    TRY_SETTLE_PROVIDERS.has(provider) &&
    !!binInfo?.isTurkish &&
    baseCurrency.toUpperCase() !== 'TRY';

  if (wantsTry) {
    const { rate } = await ExchangeRateService.getRate(baseCurrency, 'TRY');
    const chargedAmount = Math.round((baseAmount * rate + Number.EPSILON) * 100) / 100;
    return {
      plan, product, baseAmount, baseCurrency, binInfo,
      isTurkish: true, chargedAmount, chargedCurrency: 'TRY', exchangeRate: rate,
    };
  }

  return {
    plan, product, baseAmount, baseCurrency, binInfo,
    isTurkish: !!binInfo?.isTurkish,
    chargedAmount: baseAmount, chargedCurrency: baseCurrency, exchangeRate: null,
  };
}
