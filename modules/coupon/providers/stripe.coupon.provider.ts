import axios from 'axios'
import qs from 'querystring'
import BaseCouponProvider, { CouponProviderSyncResult } from './base.coupon.provider'
import SettingService from '@/modules/setting/setting.service'
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { COUPON_MESSAGES } from '../coupon.messages'
import type { Coupon, CouponValidationResult } from '../coupon.types'
import Logger from '@/modules/logger'

export default class StripeCouponProvider extends BaseCouponProvider {
  readonly name = 'stripe'

  private static readonly STRIPE_API_URL = 'https://api.stripe.com/v1'

  /**
   * Resolve the Stripe secret key for a tenant.
   *
   * GOODTOHAVE (multi-tenancy): tenants using Stripe Connect have their own
   * Stripe account. We check `stripeConnectSecretKey` first (the tenant's own
   * account key), then fall back to `stripeSecretKey` on the platform root
   * tenant. This allows white-label SaaS tenants to sync coupons to their own
   * Stripe account rather than the platform's.
   */
  private static async resolveApiKey(tenantId?: string): Promise<string> {
    if (tenantId && tenantId !== ROOT_TENANT_ID) {
      const connectKey = await SettingService.getValue(tenantId, 'stripeConnectSecretKey').catch(() => null);
      if (connectKey?.trim()) return connectKey.trim();
    }
    const platformKey = await SettingService.getValue(ROOT_TENANT_ID, 'stripeSecretKey').catch(() => null);
    if (platformKey?.trim()) return platformKey.trim();
    throw new Error(COUPON_MESSAGES.STRIPE_SYNC_FAILED);
  }

  private static async getClient(tenantId?: string) {
    const key = await StripeCouponProvider.resolveApiKey(tenantId);
    return axios.create({
      baseURL: StripeCouponProvider.STRIPE_API_URL,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async syncCoupon(coupon: Coupon, tenantId?: string): Promise<CouponProviderSyncResult> {
    try {
      const client = await StripeCouponProvider.getClient(tenantId);

      const stripeCouponParams: Record<string, unknown> = {
        name: coupon.name,
        id: `coupon_${coupon.couponId.replace(/-/g, '')}`,
      };

      if (coupon.discountType === 'PERCENTAGE') {
        stripeCouponParams['percent_off'] = coupon.discountValue;
      } else {
        stripeCouponParams['amount_off'] = Math.round(coupon.discountValue * 100);
        stripeCouponParams['currency'] = (coupon.currency ?? 'USD').toLowerCase();
      }

      if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
        stripeCouponParams['max_redemptions'] = coupon.maxUses;
      }

      if (coupon.expiresAt) {
        stripeCouponParams['redeem_by'] = Math.floor(coupon.expiresAt.getTime() / 1000);
      }

      const stripeCouponId = stripeCouponParams['id'] as string;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.post('/coupons', qs.stringify(stripeCouponParams as any));
      } catch (err: unknown) {
        if ((err as any)?.response?.data?.error?.code !== 'resource_already_exists') throw err;
      }

      const promoParams: Record<string, string> = { coupon: stripeCouponId, code: coupon.code };

      let promoCodeId: string | undefined;
      try {
        const promoRes = await client.post('/promotion_codes', qs.stringify(promoParams));
        promoCodeId = promoRes.data.id;
      } catch (err: unknown) {
        if ((err as any)?.response?.data?.error?.code !== 'resource_already_exists') throw err;
        const listRes = await client.get(`/promotion_codes?code=${coupon.code}&limit=1`);
        promoCodeId = listRes.data.data?.[0]?.id;
      }

      return { providerCouponId: stripeCouponId, providerPromoCodeId: promoCodeId, synced: true };
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.STRIPE_SYNC_FAILED}: ${error}`);
      return { synced: false };
    }
  }

  async getCheckoutCouponParam(validation: CouponValidationResult, tenantId?: string): Promise<Record<string, string>> {
    if (!validation.valid || !validation.coupon) return {};
    try {
      const client = await StripeCouponProvider.getClient(tenantId);
      const listRes = await client.get(
        `/promotion_codes?code=${validation.coupon.code}&active=true&limit=1`,
      );
      const promoCodeId: string | undefined = listRes.data.data?.[0]?.id;
      if (promoCodeId) return { 'discounts[0][promotion_code]': promoCodeId };
      return { 'discounts[0][coupon]': `coupon_${validation.coupon.couponId.replace(/-/g, '')}` };
    } catch {
      return {};
    }
  }
}
