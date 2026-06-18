import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';
import type { CouponValidationResult } from './coupon.types';
import type { LocalCouponDiscount, PaymentCouponContribution } from '@kuraykaraaslan/payment/server/payment.coupon.types';

const PAYMENT_COUPON_POINT = 'payment:coupon';

/** Map a locally-validated coupon result into the gateway-agnostic discount descriptor. */
function toLocalDiscount(validation: CouponValidationResult): LocalCouponDiscount | null {
  if (!validation.valid || !validation.coupon || !validation.discountAmount) return null;
  const c = validation.coupon;
  return {
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    discountAmount: validation.discountAmount,
    currency: c.currency ?? undefined,
  };
}

/**
 * Turns a LOCALLY-validated coupon discount into the gateway-specific checkout
 * params that apply it at payment time. The local coupon code is the single
 * source of truth — nothing is synced to the gateway's coupon registry. The
 * per-gateway adapter is resolved via the `payment:coupon` extension point
 * (contributed by payment_stripe / payment_iyzico / payment_paypal); an unknown
 * or adapter-less gateway yields no params (the caller charges the
 * already-discounted amount).
 */
export default class CouponCheckoutService {
  static async getCheckoutParams(
    provider: string,
    validation: CouponValidationResult,
    tenantId?: string,
  ): Promise<Record<string, string>> {
    const discount = toLocalDiscount(validation);
    if (!discount) return {};

    const key = provider.toLowerCase();

    // A sandboxed community plugin contributing payment:coupon for this tenant WINS
    // (its adapter runs in the isolate). Lazy-import the bridge so this module doesn't
    // pull the DB layer at import time when no tenant-scoped lookup is needed.
    if (tenantId) {
      const { listExternalContributions } = await import('@kuraykaraaslan/common/server/external-extensions');
      const ext = (await listExternalContributions(tenantId, PAYMENT_COUPON_POINT)).find((c) => c.key === key);
      if (ext) {
        const res = await ext.invoke('buildCheckoutParams', { discount, tenantId });
        return (res as Record<string, string>) ?? {};
      }
    }

    const contrib = extensionRegistry
      .getContributions(PAYMENT_COUPON_POINT)
      .find((c) => c.key === key);
    if (!contrib) return {};

    const impl = await extensionRegistry.load<PaymentCouponContribution>(contrib);
    return impl.create().buildCheckoutParams(discount, tenantId);
  }
}
