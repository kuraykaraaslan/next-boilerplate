import PaymentTaxCrudService from './payment_tax.crud.service';
import PaymentTaxCalcService from './payment_tax.calc.service';
import PaymentTaxReportService from './payment_tax.report.service';
import { validateVatNumber, qualifiesForReverseCharge } from './payment_tax.vat';

export { PaymentTaxCrudService, PaymentTaxCalcService, PaymentTaxReportService };

export default class PaymentTaxService {

  // ──────────────────────────────────────────────
  // Tax Classes
  // ──────────────────────────────────────────────

  static createClass  = PaymentTaxCrudService.createClass.bind(PaymentTaxCrudService);
  static updateClass  = PaymentTaxCrudService.updateClass.bind(PaymentTaxCrudService);
  static listClasses  = PaymentTaxCrudService.listClasses.bind(PaymentTaxCrudService);
  static deleteClass  = PaymentTaxCrudService.deleteClass.bind(PaymentTaxCrudService);

  // ──────────────────────────────────────────────
  // Tax Rates
  // ──────────────────────────────────────────────

  static createRate   = PaymentTaxCrudService.createRate.bind(PaymentTaxCrudService);
  static updateRate   = PaymentTaxCrudService.updateRate.bind(PaymentTaxCrudService);
  static getRate      = PaymentTaxCrudService.getRate.bind(PaymentTaxCrudService);
  static listRates    = PaymentTaxCrudService.listRates.bind(PaymentTaxCrudService);
  static deleteRate   = PaymentTaxCrudService.deleteRate.bind(PaymentTaxCrudService);

  // ──────────────────────────────────────────────
  // Calculation
  // ──────────────────────────────────────────────

  static calculateTax = PaymentTaxCalcService.calculateTax.bind(PaymentTaxCalcService);

  // ──────────────────────────────────────────────
  // VAT validation / reverse-charge (foundation for invoice & checkout)
  // ──────────────────────────────────────────────

  static validateVatNumber = validateVatNumber;
  static qualifiesForReverseCharge = qualifiesForReverseCharge;

  // ──────────────────────────────────────────────
  // Reporting
  // ──────────────────────────────────────────────

  static getTaxReport = PaymentTaxReportService.getReport.bind(PaymentTaxReportService);
}
