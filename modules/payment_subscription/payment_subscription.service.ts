import PaymentSubscriptionPlanService from './payment_subscription.plan.service';
import PaymentSubscriptionLifecycleService from './payment_subscription.lifecycle.service';
import PaymentSubscriptionDunningService from './payment_subscription.dunning.service';
import PaymentSubscriptionMetricsService from './payment_subscription.metrics.service';
import PaymentSubscriptionMeteredService from './payment_subscription.metered.service';

export {
  PaymentSubscriptionPlanService,
  PaymentSubscriptionLifecycleService,
  PaymentSubscriptionDunningService,
  PaymentSubscriptionMetricsService,
  PaymentSubscriptionMeteredService,
};

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
  static markPastDue         = PaymentSubscriptionLifecycleService.markPastDue.bind(PaymentSubscriptionLifecycleService);

  // ──────────────────────────────────────────────
  // Dunning (failed-payment retry lifecycle)
  // ──────────────────────────────────────────────

  static recordFailedPayment = PaymentSubscriptionDunningService.recordFailedPayment.bind(PaymentSubscriptionDunningService);
  static recordRecovery      = PaymentSubscriptionDunningService.recordRecovery.bind(PaymentSubscriptionDunningService);
  static runDunningCycle     = PaymentSubscriptionDunningService.runDunningCycle.bind(PaymentSubscriptionDunningService);

  // ──────────────────────────────────────────────
  // Metrics (MRR / ARR)
  // ──────────────────────────────────────────────

  static getRecurringRevenue = PaymentSubscriptionMetricsService.getRecurringRevenue.bind(PaymentSubscriptionMetricsService);

  // ──────────────────────────────────────────────
  // Metered / usage billing
  // ──────────────────────────────────────────────

  static recordUsage         = PaymentSubscriptionMeteredService.recordUsage.bind(PaymentSubscriptionMeteredService);
  static getUsage            = PaymentSubscriptionMeteredService.getUsage.bind(PaymentSubscriptionMeteredService);
  static computeOverage      = PaymentSubscriptionMeteredService.computeOverage.bind(PaymentSubscriptionMeteredService);
  static resetUsage          = PaymentSubscriptionMeteredService.resetUsage.bind(PaymentSubscriptionMeteredService);
}
