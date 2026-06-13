import PaymentSellCrudService from './payment_sell.crud.service';
import PaymentSellCheckoutService from './payment_sell.checkout.service';
import PaymentSellAnalyticsService from './payment_sell.analytics.service';

export { PaymentSellCrudService, PaymentSellCheckoutService, PaymentSellAnalyticsService };

export default class PaymentSellService {

  // ──────────────────────────────────────────────
  // Provider registry
  // ──────────────────────────────────────────────

  static getProvider         = PaymentSellCrudService.getProvider.bind(PaymentSellCrudService);

  // ──────────────────────────────────────────────
  // Payment CRUD
  // ──────────────────────────────────────────────

  static getById             = PaymentSellCrudService.getById.bind(PaymentSellCrudService);
  static getWithTransactions = PaymentSellCrudService.getWithTransactions.bind(PaymentSellCrudService);
  static list                = PaymentSellCrudService.list.bind(PaymentSellCrudService);
  static update              = PaymentSellCrudService.update.bind(PaymentSellCrudService);
  static createTransaction   = PaymentSellCrudService.createTransaction.bind(PaymentSellCrudService);
  static listTransactions    = PaymentSellCrudService.listTransactions.bind(PaymentSellCrudService);

  // ──────────────────────────────────────────────
  // Checkout / provider operations
  // ──────────────────────────────────────────────

  static createCheckout      = PaymentSellCheckoutService.createCheckout.bind(PaymentSellCheckoutService);
  static refund              = PaymentSellCheckoutService.refund.bind(PaymentSellCheckoutService);
  static getProviderStatus   = PaymentSellCheckoutService.getProviderStatus.bind(PaymentSellCheckoutService);
  static getCustomerPortal   = PaymentSellCheckoutService.getCustomerPortal.bind(PaymentSellCheckoutService);

  // ──────────────────────────────────────────────
  // Analytics
  // ──────────────────────────────────────────────

  static getAnalytics        = PaymentSellAnalyticsService.getAnalytics.bind(PaymentSellAnalyticsService);
}
