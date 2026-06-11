import TenantPlanCrudService from './tenant_subscription.plan.crud.service';
import TenantPlanFeatureService from './tenant_subscription.plan.feature.service';

export { TenantPlanCrudService, TenantPlanFeatureService };

export default class TenantPlanService {

  // Plans
  static createPlan          = TenantPlanCrudService.createPlan.bind(TenantPlanCrudService);
  static updatePlan          = TenantPlanCrudService.updatePlan.bind(TenantPlanCrudService);
  static deletePlan          = TenantPlanCrudService.deletePlan.bind(TenantPlanCrudService);
  static getPlans            = TenantPlanCrudService.getPlans.bind(TenantPlanCrudService);
  static getPlanById         = TenantPlanCrudService.getPlanById.bind(TenantPlanCrudService);
  static getPlanWithFeatures = TenantPlanCrudService.getPlanWithFeatures.bind(TenantPlanCrudService);
  static getPlansWithFeatures = TenantPlanCrudService.getPlansWithFeatures.bind(TenantPlanCrudService);

  // Features
  static addFeature          = TenantPlanFeatureService.addFeature.bind(TenantPlanFeatureService);
  static updateFeature       = TenantPlanFeatureService.updateFeature.bind(TenantPlanFeatureService);
  static removeFeature       = TenantPlanFeatureService.removeFeature.bind(TenantPlanFeatureService);
  static getFeaturesByPlan   = TenantPlanFeatureService.getFeaturesByPlan.bind(TenantPlanFeatureService);
}
