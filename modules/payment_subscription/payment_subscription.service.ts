import PaymentSubscriptionPlanService from './payment_subscription.plan.service';
import PaymentSubscriptionLifecycleService from './payment_subscription.lifecycle.service';

export { PaymentSubscriptionPlanService, PaymentSubscriptionLifecycleService };

export default class PaymentSubscriptionService {

  // ──────────────────────────────────────────────
  // Plans & Features
  // ──────────────────────────────────────────────

  static createPlan    = PaymentSubscriptionPlanService.createPlan.bind(PaymentSubscriptionPlanService);
  static updatePlan    = PaymentSubscriptionPlanService.updatePlan.bind(PaymentSubscriptionPlanService);
  static getPlan       = PaymentSubscriptionPlanService.getPlan.bind(PaymentSubscriptionPlanService);
  static listPlans     = PaymentSubscriptionPlanService.listPlans.bind(PaymentSubscriptionPlanService);
  static deletePlan    = PaymentSubscriptionPlanService.deletePlan.bind(PaymentSubscriptionPlanService);
  static upsertFeature = PaymentSubscriptionPlanService.upsertFeature.bind(PaymentSubscriptionPlanService);
  static deleteFeature = PaymentSubscriptionPlanService.deleteFeature.bind(PaymentSubscriptionPlanService);
  static checkFeature  = PaymentSubscriptionPlanService.checkFeature.bind(PaymentSubscriptionPlanService);

  // ──────────────────────────────────────────────
  // Subscription Lifecycle
  // ──────────────────────────────────────────────

  static createSubscription  = PaymentSubscriptionLifecycleService.createSubscription.bind(PaymentSubscriptionLifecycleService);
  static getSubscription     = PaymentSubscriptionLifecycleService.getSubscription.bind(PaymentSubscriptionLifecycleService);
  static listSubscriptions   = PaymentSubscriptionLifecycleService.listSubscriptions.bind(PaymentSubscriptionLifecycleService);
  static cancelSubscription  = PaymentSubscriptionLifecycleService.cancelSubscription.bind(PaymentSubscriptionLifecycleService);
  static pauseSubscription   = PaymentSubscriptionLifecycleService.pauseSubscription.bind(PaymentSubscriptionLifecycleService);
  static resumeSubscription  = PaymentSubscriptionLifecycleService.resumeSubscription.bind(PaymentSubscriptionLifecycleService);
  static changePlan          = PaymentSubscriptionLifecycleService.changePlan.bind(PaymentSubscriptionLifecycleService);
  static prorationPreview    = PaymentSubscriptionLifecycleService.prorationPreview.bind(PaymentSubscriptionLifecycleService);
}
