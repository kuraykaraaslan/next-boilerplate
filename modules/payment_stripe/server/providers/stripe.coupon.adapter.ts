import axios from 'axios';
import qs from 'querystring';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import Logger from '@kuraykaraaslan/logger';
import type { LocalCouponDiscount, PaymentCouponAdapter } from '@kuraykaraaslan/payment/server/payment.coupon.types';

const STRIPE_API_URL = 'https://api.stripe.com/v1';

/**
 * Stripe coupon-checkout adapter. Creates an **ad-hoc one-off** Stripe coupon
 * (`duration: once`) from the locally-computed discount and returns it as a
 * checkout discount. No promotion_code is ever synced — the coupon lives only
 * for this checkout and is derived purely from the local validation, so the
 * local coupon code stays the single source of truth.
 */
export default class StripeCouponAdapter implements PaymentCouponAdapter {
  /**
   * Tenants on Stripe Connect have their own account key
   * (`stripeConnectSecretKey`); otherwise fall back to the platform root
   * tenant's `stripeSecretKey`.
   */
  private static async resolveApiKey(tenantId?: string): Promise<string> {
    if (tenantId && tenantId !== ROOT_TENANT_ID) {
      const connectKey = await SettingService.getValue(tenantId, 'stripeConnectSecretKey').catch(() => null);
      if (connectKey?.trim()) return connectKey.trim();
    }
    const platformKey = await SettingService.getValue(ROOT_TENANT_ID, 'stripeSecretKey').catch(() => null);
    if (platformKey?.trim()) return platformKey.trim();
    throw new Error('stripe_coupon_key_unavailable');
  }

  private static async getClient(tenantId?: string) {
    const key = await StripeCouponAdapter.resolveApiKey(tenantId);
    return axios.create({
      baseURL: STRIPE_API_URL,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async buildCheckoutParams(discount: LocalCouponDiscount, tenantId?: string): Promise<Record<string, string>> {
    if (!discount.discountAmount && discount.discountType !== 'PERCENTAGE') return {};
    try {
      const client = await StripeCouponAdapter.getClient(tenantId);
      const params: Record<string, unknown> = { name: `Discount: ${discount.code}`, duration: 'once' };
      if (discount.discountType === 'PERCENTAGE') {
        params['percent_off'] = discount.discountValue;
      } else {
        params['amount_off'] = Math.round(discount.discountAmount * 100);
        params['currency'] = (discount.currency ?? 'USD').toLowerCase();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await client.post('/coupons', qs.stringify(params as any));
      const couponId = res.data?.id as string | undefined;
      return couponId ? { 'discounts[0][coupon]': couponId } : {};
    } catch (error) {
      Logger.warn(`stripe coupon checkout param failed: ${error}`);
      return {};
    }
  }
}
