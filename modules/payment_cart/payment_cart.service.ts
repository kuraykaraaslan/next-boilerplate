import PaymentCartCrudService from './payment_cart.crud.service';
import PaymentCartExpiryService from './payment_cart.expiry.service';

export { PaymentCartCrudService, PaymentCartExpiryService };

export default class PaymentCartService {

  // ──────────────────────────────────────────────
  // Cart Lifecycle
  // ──────────────────────────────────────────────

  static getOrCreateCart    = PaymentCartCrudService.getOrCreateCart.bind(PaymentCartCrudService);
  static getById            = PaymentCartCrudService.getById.bind(PaymentCartCrudService);

  // ──────────────────────────────────────────────
  // Items
  // ──────────────────────────────────────────────

  static addItem            = PaymentCartCrudService.addItem.bind(PaymentCartCrudService);
  static updateItemQuantity = PaymentCartCrudService.updateItemQuantity.bind(PaymentCartCrudService);
  static removeItem         = PaymentCartCrudService.removeItem.bind(PaymentCartCrudService);
  static clear              = PaymentCartCrudService.clear.bind(PaymentCartCrudService);

  // ──────────────────────────────────────────────
  // Coupons
  // ──────────────────────────────────────────────

  static applyCoupon        = PaymentCartCrudService.applyCoupon.bind(PaymentCartCrudService);
  static removeCoupon       = PaymentCartCrudService.removeCoupon.bind(PaymentCartCrudService);

  // ──────────────────────────────────────────────
  // Merge & Conversion
  // ──────────────────────────────────────────────

  static mergeGuestIntoUser = PaymentCartCrudService.mergeGuestIntoUser.bind(PaymentCartCrudService);
  static markConverted      = PaymentCartCrudService.markConverted.bind(PaymentCartCrudService);

  // ──────────────────────────────────────────────
  // Listing
  // ──────────────────────────────────────────────

  static list               = PaymentCartCrudService.list.bind(PaymentCartCrudService);

  // ──────────────────────────────────────────────
  // Expiry / abandonment
  // ──────────────────────────────────────────────

  static sweepAbandoned     = PaymentCartExpiryService.sweepAbandoned.bind(PaymentCartExpiryService);
  static extendExpiry       = PaymentCartExpiryService.extend.bind(PaymentCartExpiryService);
}
