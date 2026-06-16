import crypto from 'crypto'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from '@nb/payment/server/providers/base.provider'
import SettingService from '@nb/setting/server/setting.service'

/**
 * Manual / offline settlement gateway — cash or bank wire.
 *
 * There is no online processor: a "checkout" simply records the payment as
 * PENDING and surfaces the operator-authored payment instructions (the
 * `manualPaymentNote` setting — e.g. IBAN / "pay on delivery"). An operator
 * later marks the payment paid once the funds arrive, so this provider never
 * charges a card and exposes no portal, 3DS, wallets or BIN lookup.
 */
export default class ManualProvider extends BasePaymentProvider {
  readonly name = 'manual'

  /** No remote API — a bare instance is returned only to satisfy the contract. */
  getAxiosInstance(): AxiosInstance {
    return axios.create()
  }

  /**
   * Manual payments have no provider-side status; they stay PENDING until an
   * operator confirms receipt. The caller reads the canonical state from our own
   * Payment row.
   */
  async getPaymentStatus(_tenantId: string, _token: string): Promise<any> {
    return { provider: 'manual', status: 'PENDING', manual: true }
  }

  /**
   * "Checkout" for an offline method: nothing to redirect to externally, so we
   * send the buyer straight to the success/confirmation page and hand back the
   * operator's payment instructions in `providerData`. The payment is left
   * PENDING for an operator to reconcile.
   */
  async createCheckoutSession(tenantId: string, params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const instructions = (await SettingService.getValue(tenantId, 'manualPaymentNote').catch(() => null)) ?? ''
    return {
      sessionId: `manual_${crypto.randomUUID()}`,
      checkoutUrl: params.successUrl,
      providerData: {
        manual: true,
        status: 'PENDING',
        instructions,
        amount: params.amount,
        currency: params.currency,
      },
    }
  }
}
