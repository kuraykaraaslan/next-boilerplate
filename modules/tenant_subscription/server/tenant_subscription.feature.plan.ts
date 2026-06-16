import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import TenantPlanService from './tenant_subscription.plan.service';

/**
 * The ROOT-catalogue plan auto-assigned (for free) to newly created tenants.
 * Returns null when no default has been configured. System-level setting,
 * read from the ROOT tenant like the other subscription settings.
 */
export async function getDefaultPlanId(): Promise<string | null> {
  try {
    const SettingService = (await import('@nb/setting/server/setting.service')).default;
    const val = await SettingService.getValue(ROOT_TENANT_ID, 'defaultPlanId');
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Set (or clear, when `planId` is null) the default plan. Only a *free* plan
 * — a ROOT plan whose wrapped product has a base price of 0 — may be made the
 * default, so newly created tenants are never silently placed on a paid plan.
 */
export async function setDefaultPlanId(planId: string | null): Promise<void> {
  if (planId) {
    const plan = await TenantPlanService.getPlanById(ROOT_TENANT_ID, planId);
    if (!plan.product) {
      throw new AppError(SUBSCRIPTION_MESSAGES.DEFAULT_PLAN_DELETED_PRODUCT, 422, ErrorCode.VALIDATION_ERROR);
    }
    if (plan.product.basePrice !== 0) {
      throw new AppError(SUBSCRIPTION_MESSAGES.DEFAULT_PLAN_NOT_FREE, 422, ErrorCode.VALIDATION_ERROR);
    }
  }
  const SettingService = (await import('@nb/setting/server/setting.service')).default;
  await SettingService.updateMany(ROOT_TENANT_ID, { defaultPlanId: planId ?? '' });
}
