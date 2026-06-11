import PaymentCrudService from './payment.crud.service';
import PaymentCheckoutService from './payment.checkout.service';

export { PaymentCrudService, PaymentCheckoutService };

export default class PaymentService {

  // ──────────────────────────────────────────────
  // Payment CRUD
  // ──────────────────────────────────────────────

  static create                  = PaymentCrudService.create.bind(PaymentCrudService);
  static getById                 = PaymentCrudService.getById.bind(PaymentCrudService);
  static getByIdWithTransactions = PaymentCrudService.getByIdWithTransactions.bind(PaymentCrudService);
  static getAll                  = PaymentCrudService.getAll.bind(PaymentCrudService);
  static update                  = PaymentCrudService.update.bind(PaymentCrudService);
  static delete                  = PaymentCrudService.delete.bind(PaymentCrudService);
  static refund                  = PaymentCrudService.refund.bind(PaymentCrudService);

  // ──────────────────────────────────────────────
  // Transaction CRUD
  // ──────────────────────────────────────────────

  static createTransaction    = PaymentCrudService.createTransaction.bind(PaymentCrudService);
  static getTransactionById   = PaymentCrudService.getTransactionById.bind(PaymentCrudService);
  static getTransactions      = PaymentCrudService.getTransactions.bind(PaymentCrudService);
  static updateTransaction    = PaymentCrudService.updateTransaction.bind(PaymentCrudService);

  // ──────────────────────────────────────────────
  // Convenience
  // ──────────────────────────────────────────────

  static getPaymentsByUser    = PaymentCrudService.getPaymentsByUser.bind(PaymentCrudService);
  static getPaymentsByTenant  = PaymentCrudService.getPaymentsByTenant.bind(PaymentCrudService);
  static markAsCompleted      = PaymentCrudService.markAsCompleted.bind(PaymentCrudService);
  static markAsFailed         = PaymentCrudService.markAsFailed.bind(PaymentCrudService);
  static markAsCancelled      = PaymentCrudService.markAsCancelled.bind(PaymentCrudService);

  // ──────────────────────────────────────────────
  // Provider / Checkout
  // ──────────────────────────────────────────────

  static getAvailableProviders     = PaymentCheckoutService.getAvailableProviders.bind(PaymentCheckoutService);
  static getDefaultProvider        = PaymentCheckoutService.getDefaultProvider.bind(PaymentCheckoutService);
  static getSupportedWallets       = PaymentCheckoutService.getSupportedWallets.bind(PaymentCheckoutService);
  static getWalletMatrix           = PaymentCheckoutService.getWalletMatrix.bind(PaymentCheckoutService);
  static createCustomerPortalSession = PaymentCheckoutService.createCustomerPortalSession.bind(PaymentCheckoutService);
  static createCheckoutSession     = PaymentCheckoutService.createCheckoutSession.bind(PaymentCheckoutService);
  static supportsDirectCardPayment = PaymentCheckoutService.supportsDirectCardPayment.bind(PaymentCheckoutService);
  static chargeWithCard            = PaymentCheckoutService.chargeWithCard.bind(PaymentCheckoutService);
  static supports3dsCardPayment    = PaymentCheckoutService.supports3dsCardPayment.bind(PaymentCheckoutService);
  static start3dsCharge            = PaymentCheckoutService.start3dsCharge.bind(PaymentCheckoutService);
  static complete3dsCharge         = PaymentCheckoutService.complete3dsCharge.bind(PaymentCheckoutService);
  static createPaymentIntent       = PaymentCheckoutService.createPaymentIntent.bind(PaymentCheckoutService);
  static getProviderStatus         = PaymentCheckoutService.getProviderStatus.bind(PaymentCheckoutService);
  static checkBin                  = PaymentCheckoutService.checkBin.bind(PaymentCheckoutService);
}
