import axios from 'axios'
import BaseCouponProvider, { CouponProviderSyncResult } from './base.coupon.provider'
import SettingService from '@nb/setting/server/setting.service'
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants'
import { COUPON_MESSAGES } from '../coupon.messages'
import type { Coupon, CouponValidationResult } from '../coupon.types'
import Logger from '@nb/logger'

/**
 * PayPal coupon provider.
 *
 * GOODTOHAVE (multi-country): PayPal's Orders v2 API supports `discount_amount`
 * as a line item on the purchase unit. We represent the coupon as a negative
 * `reference_id` item with `unit_amount` equal to the discount so it appears as
 * a named discount line on the customer's PayPal receipt.
 *
 * `syncCoupon` is still a no-op — PayPal has no server-side coupon registry.
 * `getCheckoutCouponParam` returns the `purchase_units[0].items` patch that the
 * PayPal payment module merges into the order-create body.
 */
export default class PaypalCouponProvider extends BaseCouponProvider {
  readonly name = 'paypal'

  private static readonly PAYPAL_API = 'https://api-m.paypal.com';

  private static async getToken(tenantId?: string): Promise<string> {
    const clientId = await SettingService.getValue(tenantId ?? ROOT_TENANT_ID, 'paypalClientId').catch(() => null)
      ?? await SettingService.getValue(ROOT_TENANT_ID, 'paypalClientId').catch(() => null);
    const secret = await SettingService.getValue(tenantId ?? ROOT_TENANT_ID, 'paypalClientSecret').catch(() => null)
      ?? await SettingService.getValue(ROOT_TENANT_ID, 'paypalClientSecret').catch(() => null);
    if (!clientId || !secret) throw new Error(COUPON_MESSAGES.PAYPAL_SYNC_FAILED);

    const res = await axios.post(
      `${PaypalCouponProvider.PAYPAL_API}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: { username: clientId, password: secret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return res.data.access_token as string;
  }

  async syncCoupon(_coupon: Coupon): Promise<CouponProviderSyncResult> {
    // PayPal has no server-side coupon registry — discounts are applied as
    // order line items at checkout time via getCheckoutCouponParam.
    return { synced: false };
  }

  /**
   * Returns a PayPal Orders v2 `items` patch: a negative-amount discount line
   * that shows up as a named discount on the customer's PayPal receipt.
   *
   * Shape expected by the PayPal payment module:
   *   { 'purchase_units[0].items[discount]': JSON.stringify(item) }
   */
  async getCheckoutCouponParam(
    validation: CouponValidationResult,
    _tenantId?: string,
  ): Promise<Record<string, string>> {
    if (!validation.valid || !validation.coupon || !validation.discountAmount) return {};

    try {
      const discountItem = {
        name: `Discount: ${validation.coupon.code}`,
        quantity: '1',
        unit_amount: {
          currency_code: validation.coupon.currency ?? 'USD',
          value: validation.discountAmount.toFixed(2),
        },
        category: 'DIGITAL_GOODS',
      };
      return { 'paypal_discount_item': JSON.stringify(discountItem) };
    } catch (error) {
      Logger.warn(`${COUPON_MESSAGES.PAYPAL_SYNC_FAILED}: ${error}`);
      return {};
    }
  }
}
