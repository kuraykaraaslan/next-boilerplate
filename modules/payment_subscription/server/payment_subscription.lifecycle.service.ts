import 'reflect-metadata';
import type { Subscription, SubscriptionWithPlan, ProrationPreview } from './payment_subscription.types';
import type {
  CreateSubscriptionDTO, CancelSubscriptionDTO, PauseSubscriptionDTO,
  ChangePlanDTO, GetSubscriptionsQuery,
} from './payment_subscription.dto';
import { createSubscription, getSubscription, listSubscriptions } from './payment_subscription.crud.service';
import {
  cancelSubscription, pauseSubscription, resumeSubscription,
  changePlan, markPastDue, prorationPreview,
} from './payment_subscription.transitions.service';

/**
 * Subscription lifecycle service facade. The implementation is split across
 * focused modules (`payment_subscription.crud.service` create/get/list,
 * `payment_subscription.transitions.service` cancel/pause/resume/change/past-due/
 * proration-preview); this class preserves the single
 * `PaymentSubscriptionLifecycleService.*` entry point its callers depend on.
 */
export default class PaymentSubscriptionLifecycleService {
  static createSubscription(tenantId: string, data: CreateSubscriptionDTO): Promise<Subscription> {
    return createSubscription(tenantId, data);
  }

  static getSubscription(tenantId: string, subscriptionId: string, withPlan = false): Promise<Subscription | SubscriptionWithPlan> {
    return getSubscription(tenantId, subscriptionId, withPlan);
  }

  static listSubscriptions(tenantId: string, query: GetSubscriptionsQuery): Promise<{ data: Subscription[]; total: number }> {
    return listSubscriptions(tenantId, query);
  }

  static cancelSubscription(tenantId: string, subscriptionId: string, dto: CancelSubscriptionDTO): Promise<Subscription> {
    return cancelSubscription(tenantId, subscriptionId, dto);
  }

  static pauseSubscription(tenantId: string, subscriptionId: string, dto: PauseSubscriptionDTO): Promise<Subscription> {
    return pauseSubscription(tenantId, subscriptionId, dto);
  }

  static resumeSubscription(tenantId: string, subscriptionId: string): Promise<Subscription> {
    return resumeSubscription(tenantId, subscriptionId);
  }

  static changePlan(tenantId: string, subscriptionId: string, dto: ChangePlanDTO): Promise<Subscription> {
    return changePlan(tenantId, subscriptionId, dto);
  }

  static markPastDue(tenantId: string, subscriptionId: string): Promise<Subscription> {
    return markPastDue(tenantId, subscriptionId);
  }

  static prorationPreview(tenantId: string, subscriptionId: string, dto: ChangePlanDTO): Promise<ProrationPreview> {
    return prorationPreview(tenantId, subscriptionId, dto);
  }
}
