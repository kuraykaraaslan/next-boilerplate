import CouponCrudService from './coupon.crud.service';
import CouponValidationService from './coupon.validation.service';

export { CouponCrudService, CouponValidationService };

export default class CouponService {

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────

  static create                = CouponCrudService.create.bind(CouponCrudService);
  static getAll                = CouponCrudService.getAll.bind(CouponCrudService);
  static getById               = CouponCrudService.getById.bind(CouponCrudService);
  static getByCode             = CouponCrudService.getByCode.bind(CouponCrudService);
  static update                = CouponCrudService.update.bind(CouponCrudService);
  static archive               = CouponCrudService.archive.bind(CouponCrudService);
  static getRedemptionsByTenant = CouponCrudService.getRedemptionsByTenant.bind(CouponCrudService);

  // ──────────────────────────────────────────────
  // Validation & Apply
  // ──────────────────────────────────────────────

  static validate          = CouponValidationService.validate.bind(CouponValidationService);
  static scopeApplies      = CouponValidationService.scopeApplies.bind(CouponValidationService);
  static calculateDiscount = CouponValidationService.calculateDiscount.bind(CouponValidationService);
  static apply             = CouponValidationService.apply.bind(CouponValidationService);
}
