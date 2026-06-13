import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { makeSeedContext, type ModuleSeeder, type SeedContext } from './seed.context';

// Identity / system base ------------------------------------------------------
import { seedUser } from '@/modules/user/user.seed';
import { seedUserProfile } from '@/modules/user_profile/user_profile.seed';
import { seedUserSecurity } from '@/modules/user_security/user_security.seed';
import { seedUserPreferences } from '@/modules/user_preferences/user_preferences.seed';
import { seedUserSession } from '@/modules/user_session/user_session.seed';
import { seedUserSocialAccount } from '@/modules/user_social_account/user_social_account.seed';
import { seedTenant } from '@/modules/tenant/tenant.seed';
import { seedTenantDomain } from '@/modules/tenant_domain/tenant_domain.seed';
import { seedTenantMember } from '@/modules/tenant_member/tenant_member.seed';
import { seedTenantInvitation } from '@/modules/tenant_invitation/tenant_invitation.seed';
import { seedTenantSubscription } from '@/modules/tenant_subscription/tenant_subscription.seed';
import { seedTenantUsage } from '@/modules/tenant_usage/tenant_usage.seed';
import { seedSetting } from '@/modules/setting/setting.seed';
import { seedApiKey } from '@/modules/api_key/api_key.seed';
import { seedAuthSaml } from '@/modules/auth_saml/auth_saml.seed';
import { seedESignature } from '@/modules/e_signature/e_signature.seed';
import { seedStorage } from '@/modules/storage/storage.seed';
import { seedWebhook } from '@/modules/webhook/webhook.seed';
import { seedAi } from '@/modules/ai/ai.seed';
import { seedNotificationLog } from '@/modules/notification_log/notification_log.seed';
import { seedNotificationPush } from '@/modules/notification_push/notification_push.seed';

// Catalog ---------------------------------------------------------------------
import { seedStore } from '@/modules/store/store.seed';

// Pricing infra ---------------------------------------------------------------
import { seedPaymentShipping } from '@/modules/payment_shipping/payment_shipping.seed';
import { seedPaymentTax } from '@/modules/payment_tax/payment_tax.seed';

// Payments & subscriptions ----------------------------------------------------
import { seedPayment } from '@/modules/payment/payment.seed';
// NOTE: `payment_sell` and `payment_subscription` also ship <module>.seed.ts files,
// but their entities duplicate the canonical `payment` module's tables (payments,
// payment_transactions, subscription_plans, plan_features) and are NOT registered in
// the DataSource (modules/db/db.ts). Running them here would collide on those tables,
// so they are intentionally excluded from the runner.

// Promotions ------------------------------------------------------------------
import { seedCoupon } from '@/modules/coupon/coupon.seed';

// Orders ----------------------------------------------------------------------
import { seedOrderFulfillment } from '@/modules/order_fulfillment/order_fulfillment.seed';

// Order-dependent commerce ----------------------------------------------------
import { seedPaymentCart } from '@/modules/payment_cart/payment_cart.seed';
import { seedPaymentReturnRma } from '@/modules/payment_return_rma/payment_return_rma.seed';
import { seedPaymentLoyaltyPoints } from '@/modules/payment_loyalty_points/payment_loyalty_points.seed';

// Catalog-dependent commerce --------------------------------------------------
import { seedPaymentWishlist } from '@/modules/payment_wishlist/payment_wishlist.seed';
import { seedProductReview } from '@/modules/product_review/product_review.seed';

// Billing docs ----------------------------------------------------------------
import { seedInvoice } from '@/modules/invoice/invoice.seed';

// Content ---------------------------------------------------------------------
import { seedMediaGallery } from '@/modules/media_gallery/media_gallery.seed';
import { seedSeo } from '@/modules/seo/seo.seed';
import { seedDynamicPage } from '@/modules/dynamic_page/dynamic_page.seed';
import { seedBlog } from '@/modules/blog/blog.seed';

// Cross-cutting (references many other ids — runs last) -----------------------
import { seedAuditLog } from '@/modules/audit_log/audit_log.seed';

/**
 * Module seeders in dependency order: a seeder may read any `ctx.refs.*` that a
 * seeder *earlier* in this list published. Cross-references also have constant
 * fallbacks, so order affects how connected the data is, not correctness.
 */
export const SEEDERS: Array<{ name: string; run: ModuleSeeder }> = [
  // identity / system base
  { name: 'user', run: seedUser },
  { name: 'user_profile', run: seedUserProfile },
  { name: 'user_security', run: seedUserSecurity },
  { name: 'user_preferences', run: seedUserPreferences },
  { name: 'user_session', run: seedUserSession },
  { name: 'user_social_account', run: seedUserSocialAccount },
  { name: 'tenant', run: seedTenant },
  { name: 'tenant_domain', run: seedTenantDomain },
  { name: 'tenant_member', run: seedTenantMember },
  { name: 'tenant_invitation', run: seedTenantInvitation },
  { name: 'tenant_subscription', run: seedTenantSubscription },
  { name: 'tenant_usage', run: seedTenantUsage },
  { name: 'setting', run: seedSetting },
  { name: 'api_key', run: seedApiKey },
  { name: 'auth_saml', run: seedAuthSaml },
  { name: 'e_signature', run: seedESignature },
  { name: 'storage', run: seedStorage },
  { name: 'webhook', run: seedWebhook },
  { name: 'ai', run: seedAi },
  { name: 'notification_log', run: seedNotificationLog },
  { name: 'notification_push', run: seedNotificationPush },
  // catalog
  { name: 'store', run: seedStore },
  // pricing infra
  { name: 'payment_shipping', run: seedPaymentShipping },
  { name: 'payment_tax', run: seedPaymentTax },
  // payments & subscriptions
  { name: 'payment', run: seedPayment },
  // promotions
  { name: 'coupon', run: seedCoupon },
  // orders
  { name: 'order_fulfillment', run: seedOrderFulfillment },
  // order-dependent commerce
  { name: 'payment_cart', run: seedPaymentCart },
  { name: 'payment_return_rma', run: seedPaymentReturnRma },
  { name: 'payment_loyalty_points', run: seedPaymentLoyaltyPoints },
  // catalog-dependent commerce
  { name: 'payment_wishlist', run: seedPaymentWishlist },
  { name: 'product_review', run: seedProductReview },
  // billing docs
  { name: 'invoice', run: seedInvoice },
  // content
  { name: 'media_gallery', run: seedMediaGallery },
  { name: 'seo', run: seedSeo },
  { name: 'dynamic_page', run: seedDynamicPage },
  { name: 'blog', run: seedBlog },
  // cross-cutting, last
  { name: 'audit_log', run: seedAuditLog },
];

/**
 * Seed the demo dataset for one tenant. Idempotent: every seeder uses
 * find-or-create, so re-running reuses existing rows.
 *
 * A failing seeder is logged and skipped (the rest still run) so one bad module
 * never blocks the whole dataset; the first error is rethrown at the end.
 */
export async function runSeed(tenantId?: string): Promise<SeedContext> {
  const target = tenantId || process.env.SEED_TENANT_ID || ROOT_TENANT_ID;
  const systemDs = await getDataSource();
  const ds = await tenantDataSourceFor(target);
  const ctx = makeSeedContext(ds, systemDs, target);
  ctx.log(`target tenant: ${target}`);

  let ok = 0;
  let firstError: unknown;
  for (const seeder of SEEDERS) {
    try {
      await seeder.run(ctx);
      ok += 1;
    } catch (err) {
      ctx.log(`✗ ${seeder.name} failed: ${(err as Error).message}`);
      firstError ??= err;
    }
  }

  ctx.log(`done — ${ok}/${SEEDERS.length} module(s) seeded for ${target}`);
  if (firstError) throw firstError;
  return ctx;
}
