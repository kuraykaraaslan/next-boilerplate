import TenantSubscriptionLifecycleService from './tenant_subscription.lifecycle.service';
import TenantSubscriptionGraceService from './tenant_subscription.grace.service';

export { TenantSubscriptionLifecycleService, TenantSubscriptionGraceService };

export default class TenantSubscriptionService {

  // Lifecycle
  static assignPlan                 = TenantSubscriptionLifecycleService.assignPlan.bind(TenantSubscriptionLifecycleService);
  static getSubscription            = TenantSubscriptionLifecycleService.getSubscription.bind(TenantSubscriptionLifecycleService);
  static cancelSubscription         = TenantSubscriptionLifecycleService.cancelSubscription.bind(TenantSubscriptionLifecycleService);
  static confirmPayment             = TenantSubscriptionLifecycleService.confirmPayment.bind(TenantSubscriptionLifecycleService);

  // Grace period
  static startGracePeriod           = TenantSubscriptionGraceService.startGracePeriod.bind(TenantSubscriptionGraceService);
  static getGracePeriodStatus       = TenantSubscriptionGraceService.getGracePeriodStatus.bind(TenantSubscriptionGraceService);
  static expireOverdueSubscriptions = TenantSubscriptionGraceService.expireOverdueSubscriptions.bind(TenantSubscriptionGraceService);
}
