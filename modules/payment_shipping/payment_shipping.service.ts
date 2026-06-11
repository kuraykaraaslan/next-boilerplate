import PaymentShippingCrudService from './payment_shipping.crud.service';
import PaymentShippingCalcService from './payment_shipping.calc.service';

export { PaymentShippingCrudService, PaymentShippingCalcService };

export default class PaymentShippingService {

  // ──────────────────────────────────────────────
  // Methods
  // ──────────────────────────────────────────────

  static createMethod    = PaymentShippingCrudService.createMethod.bind(PaymentShippingCrudService);
  static updateMethod    = PaymentShippingCrudService.updateMethod.bind(PaymentShippingCrudService);
  static getMethod       = PaymentShippingCrudService.getMethod.bind(PaymentShippingCrudService);
  static listMethods     = PaymentShippingCrudService.listMethods.bind(PaymentShippingCrudService);
  static deleteMethod    = PaymentShippingCrudService.deleteMethod.bind(PaymentShippingCrudService);

  // ──────────────────────────────────────────────
  // Rates
  // ──────────────────────────────────────────────

  static createRate      = PaymentShippingCrudService.createRate.bind(PaymentShippingCrudService);
  static updateRate      = PaymentShippingCrudService.updateRate.bind(PaymentShippingCrudService);
  static deleteRate      = PaymentShippingCrudService.deleteRate.bind(PaymentShippingCrudService);

  // ──────────────────────────────────────────────
  // Calculation
  // ──────────────────────────────────────────────

  static calculateShipping = PaymentShippingCalcService.calculateShipping.bind(PaymentShippingCalcService);
}
