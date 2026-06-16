import 'reflect-metadata'
import Logger from '@nb/logger'
import SettingService from '@nb/setting/server/setting.service'
import { InvoiceService } from '@nb/invoice'
import type { Payment as PaymentEntity } from './entities/payment.entity'

/**
 * Auto-generate an invoice when a payment completes. Best-effort and gated by
 * the per-tenant `paymentAutoInvoice` setting ('true' to enable) so a billing
 * failure never blocks the payment. Tax is resolved by the invoice module's
 * own payment_tax engine, so we pass the gross line and let it compute.
 */
export default class PaymentSellInvoiceService {
  static async generateForPayment(tenantId: string, payment: PaymentEntity): Promise<void> {
    try {
      const enabled = (await SettingService.getValue(tenantId, 'paymentAutoInvoice')) === 'true'
      if (!enabled) return
      if (!payment.customerEmail || !payment.customerName) {
        Logger.warn(`[payment_sell.invoice] skip auto-invoice for ${payment.paymentId}: missing customer identity`)
        return
      }

      const addr = (payment.billingAddress ?? {}) as { country?: string; countryCode?: string }
      const countryCode = (addr.countryCode ?? addr.country ?? 'TR').toString().slice(0, 2).toUpperCase()

      await InvoiceService.create(tenantId, {
        paymentId: payment.paymentId,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        customerCountryCode: countryCode,
        currency: payment.currency,
        lines: [{
          description: payment.description || `Payment ${payment.paymentId}`,
          quantity: 1,
          unitPrice: Number(payment.amount),
          taxRate: 0, // amount already charged gross; invoice records it as-is
        }],
      })
      Logger.info(`[payment_sell.invoice] auto-invoice created for payment ${payment.paymentId}`)
    } catch (err) {
      Logger.warn(`[payment_sell.invoice] auto-invoice failed for ${payment.paymentId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
