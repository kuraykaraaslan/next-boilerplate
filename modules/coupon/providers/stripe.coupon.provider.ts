import axios from 'axios'
import qs from 'querystring'
import BaseCouponProvider, { CouponProviderSyncResult } from './base.coupon.provider'
import SettingService from '@/modules/setting/setting.service'
import { COUPON_MESSAGES } from '../coupon.messages'
import type { Coupon, CouponValidationResult } from '../coupon.types'
import Logger from '@/libs/logger'

export default class StripeCouponProvider extends BaseCouponProvider {
  readonly name = 'stripe'

  private static readonly STRIPE_API_URL = 'https://api.stripe.com/v1'

  private static async getClient() {
    const key = await SettingService.getValue('stripeSecretKey')
    if (!key) throw new Error(COUPON_MESSAGES.STRIPE_SYNC_FAILED)
    return axios.create({
      baseURL: StripeCouponProvider.STRIPE_API_URL,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  /**
   * Creates (or retrieves existing) a Stripe Coupon for the given coupon,
   * then creates a Promotion Code matching our code string.
   * Uses the couponId as the idempotency key so it's safe to call multiple times.
   */
  async syncCoupon(coupon: Coupon): Promise<CouponProviderSyncResult> {
    try {
      const client = await StripeCouponProvider.getClient()

      // Build Stripe coupon params
      const stripeCouponParams: Record<string, any> = {
        name: coupon.name,
        // Use our couponId as Stripe's idempotent id
        id: `coupon_${coupon.couponId.replace(/-/g, '')}`,
      }

      if (coupon.discountType === 'PERCENTAGE') {
        stripeCouponParams['percent_off'] = coupon.discountValue
      } else {
        stripeCouponParams['amount_off'] = Math.round(coupon.discountValue * 100)
        stripeCouponParams['currency'] = (coupon.currency ?? 'USD').toLowerCase()
      }

      if (coupon.maxUses !== null) {
        stripeCouponParams['max_redemptions'] = coupon.maxUses
      }

      if (coupon.expiresAt) {
        stripeCouponParams['redeem_by'] = Math.floor(coupon.expiresAt.getTime() / 1000)
      }

      let stripeCouponId = stripeCouponParams['id'] as string

      // Create or retrieve Stripe coupon
      try {
        await client.post('/coupons', qs.stringify(stripeCouponParams))
      } catch (err: any) {
        // Already exists — that's fine, retrieve it
        if (err?.response?.data?.error?.code !== 'resource_already_exists') {
          throw err
        }
      }

      // Create a Promotion Code using our human-readable code
      const promoParams: Record<string, string> = {
        coupon: stripeCouponId,
        code: coupon.code,
      }

      let promoCodeId: string | undefined
      try {
        const promoRes = await client.post('/promotion_codes', qs.stringify(promoParams))
        promoCodeId = promoRes.data.id
      } catch (err: any) {
        if (err?.response?.data?.error?.code !== 'resource_already_exists') {
          throw err
        }
        // Already exists — look it up
        const listRes = await client.get(`/promotion_codes?code=${coupon.code}&limit=1`)
        promoCodeId = listRes.data.data?.[0]?.id
      }

      return { providerCouponId: stripeCouponId, providerPromoCodeId: promoCodeId, synced: true }
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.STRIPE_SYNC_FAILED}: ${error}`)
      return { synced: false }
    }
  }

  /**
   * Returns the Stripe checkout session param to apply the promotion code.
   * Pass this into the checkout session creation body.
   */
  async getCheckoutCouponParam(validation: CouponValidationResult): Promise<Record<string, string>> {
    if (!validation.valid || !validation.coupon) return {}

    try {
      const client = await StripeCouponProvider.getClient()
      const listRes = await client.get(
        `/promotion_codes?code=${validation.coupon.code}&active=true&limit=1`
      )
      const promoCodeId: string | undefined = listRes.data.data?.[0]?.id
      if (promoCodeId) {
        return { 'discounts[0][promotion_code]': promoCodeId }
      }
      // Fall back to coupon id
      const couponId = `coupon_${validation.coupon.couponId.replace(/-/g, '')}`
      return { 'discounts[0][coupon]': couponId }
    } catch {
      return {}
    }
  }
}
