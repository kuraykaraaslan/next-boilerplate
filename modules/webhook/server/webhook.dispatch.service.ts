import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import type { WebhookEvent } from './webhook.enums';
import Logger from '@nb/logger';
import TenantFeatureGateService from '@nb/tenant_subscription/server/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@nb/tenant_subscription/server/tenant_subscription.feature-keys';
import { isRootTenant, ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import { passesEventFilter } from './webhook.filters';
import { enqueueDelivery } from './webhook.queue';

/**
 * Defense-in-depth billing gate for webhooks. Tenants without the
 * `feature_webhooks` BOOLEAN feature on their active plan are skipped
 * silently — no enqueue, no audit row. Root tenant is short-circuited.
 *
 * Uses checkFeatureAccess (not assert) because dispatchEvent is called
 * from many event producers and must never propagate a 402 to a
 * non-billing code path.
 */
async function hasWebhookFeature(tenantId: string): Promise<boolean> {
  if (isRootTenant(tenantId)) return true;
  try {
    const result = await TenantFeatureGateService.checkFeatureAccess(
      tenantId,
      FEATURE_KEYS.FEATURE_WEBHOOKS,
    );
    return result.allowed;
  } catch (err) {
    Logger.warn(
      `[Webhook] hasWebhookFeature check failed for tenant=${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

export async function dispatchEvent(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    // Skip enqueue entirely when the tenant plan does not include webhooks.
    // Best-effort billing: a plan downgrade between dispatch and worker pick
    // is still caught at delivery time by the same check, but is
    // intentionally not atomic.
    if (!(await hasWebhookFeature(tenantId))) {
      return;
    }

    const ds = await tenantDataSourceFor(tenantId);
    const webhooks = await ds.getRepository(WebhookEntity).find({
      where: { tenantId, isActive: true },
    });

    const matching = webhooks.filter(
      (w) => w.events.includes(event) && passesEventFilter(w, event, payload),
    );
    await Promise.all(matching.map((w) => enqueueDelivery(w, event, payload)));
  } catch (err) {
    Logger.error(`[Webhook] dispatchEvent failed for tenant=${tenantId} event=${event}: ${err}`);
  }
}

/**
 * Dispatch a platform-wide event (user.*, tenant.*, plan.*, subscription.assigned)
 * to root-tenant webhooks. Thin wrapper over {@link dispatchEvent} pinned to
 * {@link ROOT_TENANT_ID} — platform producers call this instead of threading the
 * root tenant id through every call site. Fire-and-forget; never throws.
 */
export async function dispatchPlatformEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  return dispatchEvent(ROOT_TENANT_ID, event, payload);
}
