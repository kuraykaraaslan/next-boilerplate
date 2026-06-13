import PaymentShippingCrudService from './payment_shipping.crud.service';
import PaymentShippingCalcService from './payment_shipping.calc.service';
import PaymentShippingCarrierService from './payment_shipping.carrier.service';
import PaymentShippingRulesService from './payment_shipping.rules.service';

export { PaymentShippingCrudService, PaymentShippingCalcService, PaymentShippingCarrierService, PaymentShippingRulesService };

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

  // ──────────────────────────────────────────────
  // Live carriers (UPS / FedEx / DHL / Royal Mail / Yurtiçi)
  // ──────────────────────────────────────────────

  static getLiveRates       = PaymentShippingCarrierService.getLiveRates.bind(PaymentShippingCarrierService);
  static trackShipment      = PaymentShippingCarrierService.track.bind(PaymentShippingCarrierService);
  static configuredCarriers = PaymentShippingCarrierService.configuredCarriers.bind(PaymentShippingCarrierService);
}
