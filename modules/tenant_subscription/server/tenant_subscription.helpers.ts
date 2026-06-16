import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '@nb/payment/server/entities/subscription_plan.entity';
import { StoreProduct as ProductEntity } from '@nb/store/server/entities/store_product.entity';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { PlanProductSummarySchema } from './tenant_subscription.types';
import type { PlanProductSummary } from './tenant_subscription.types';
import type { WebhookEvent } from '@nb/webhook/server/webhook.enums';

/**
 * Shared low-level helpers for the tenant_subscription service family
 * (plan / checkout / feature-gate / core). Kept dependency-light so every
 * sub-service can import them without forming a cycle.
 */

export function productSummary(p: ProductEntity): PlanProductSummary {
  return PlanProductSummarySchema.parse({
    productId: p.productId,
    name: p.name,
    slug: p.slug,
    currency: p.currency,
    basePrice: p.basePrice,
    shortDescription: p.shortDescription ?? null,
    status: p.status,
  });
}

export async function fetchProductOrThrow(tenantId: string, productId: string): Promise<ProductEntity> {
  const ds = await tenantDataSourceFor(tenantId);
  const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } });
  if (!product) throw new AppError(SUBSCRIPTION_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  return product;
}

// Read-side counterpart to fetchProductOrThrow: a plan may reference a product
// that has since been deleted. Listing/detail views must degrade to a null
// product rather than 500, so they use this instead.
export async function fetchProductOrNull(tenantId: string, productId: string): Promise<ProductEntity | null> {
  const ds = await tenantDataSourceFor(tenantId);
  return ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } });
}

export async function attachProducts(tenantId: string, plans: SubscriptionPlanEntity[]): Promise<Map<string, ProductEntity>> {
  if (plans.length === 0) return new Map();
  const productIds = Array.from(new Set(plans.map((p) => p.productId)));
  const ds = await tenantDataSourceFor(tenantId);
  const products = await ds.getRepository(ProductEntity)
    .findBy(productIds.map((productId) => ({ tenantId, productId })));
  return new Map(products.map((p) => [p.productId, p]));
}

/**
 * Fire a webhook event via a lazy import. webhook.service statically imports
 * the feature-gate service for its billing gate, so importing it back at module
 * scope would form an init-time cycle — we load it on demand instead. Best-effort:
 * dispatch never throws, and an import failure must not break the caller.
 */
export async function emitWebhook(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { default: WebhookService } = await import('@nb/webhook/server/webhook.service');
    await WebhookService.dispatchEvent(tenantId, event, payload);
  } catch (err) {
    Logger.warn(`[TenantSubscription] webhook emit failed event=${event}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
