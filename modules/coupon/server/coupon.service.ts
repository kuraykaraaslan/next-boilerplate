import CouponCrudService from './coupon.crud.service';
import CouponValidationService from './coupon.validation.service';

export { CouponCrudService, CouponValidationService };
export type { CouponAnalytics, CouponRevenueAttribution, CsvImportResult } from './coupon.crud.service';

export default class CouponService {

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────

  static create                  = CouponCrudService.create.bind(CouponCrudService);
  static getAll                  = CouponCrudService.getAll.bind(CouponCrudService);
  static getById                 = CouponCrudService.getById.bind(CouponCrudService);
  static getByCode               = CouponCrudService.getByCode.bind(CouponCrudService);
  static update                  = CouponCrudService.update.bind(CouponCrudService);
  static archive                 = CouponCrudService.archive.bind(CouponCrudService);
  static getRedemptionsByTenant  = CouponCrudService.getRedemptionsByTenant.bind(CouponCrudService);
  static getRedemptionCount      = CouponCrudService.getRedemptionCount.bind(CouponCrudService);
  static getRedemptionCountByUser = CouponCrudService.getRedemptionCountByUser.bind(CouponCrudService);

  // ──────────────────────────────────────────────
  // Bulk & import
  // ──────────────────────────────────────────────

  static bulkCreate              = CouponCrudService.bulkCreate.bind(CouponCrudService);
  static importFromCsv           = CouponCrudService.importFromCsv.bind(CouponCrudService);

  // ──────────────────────────────────────────────
  // Analytics & attribution
  // ──────────────────────────────────────────────

  static getAnalytics            = CouponCrudService.getAnalytics.bind(CouponCrudService);
  static getRevenueAttribution   = CouponCrudService.getRevenueAttribution.bind(CouponCrudService);

  // ──────────────────────────────────────────────
  // Validation & Apply
  // ──────────────────────────────────────────────

  static validate                = CouponValidationService.validate.bind(CouponValidationService);
  static scopeApplies            = CouponValidationService.scopeApplies.bind(CouponValidationService);
  static calculateDiscount       = CouponValidationService.calculateDiscount.bind(CouponValidationService);
  static apply                   = CouponValidationService.apply.bind(CouponValidationService);
}
