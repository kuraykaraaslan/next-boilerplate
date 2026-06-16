import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { env } from '@/modules/env';
import { makeSeedContext, type ModuleSeeder, type SeedContext, type SeedProfile } from './seed.context';

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
import { seedAuthESignature } from '@/modules/auth_e_signature/auth_e_signature.seed';
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
import { seedSeo } from '@nb/seo/server';
import { seedDynamicPage } from '@/modules/dynamic_page/dynamic_page.seed';
import { seedBlog } from '@/modules/blog/blog.seed';

// Cross-cutting (references many other ids — runs last) -----------------------
import { seedAuditLog } from '@/modules/audit_log/audit_log.seed';

/**
 * Module seeders in dependency order: a seeder may read any `ctx.refs.*` that a
 * seeder *earlier* in this list published. Cross-references also have constant
 * fallbacks, so order affects how connected the data is, not correctness.
 */
/**
 * Seeders annotated with a dependency `tier`. Seeders within a tier are
 * independent (or rely only on earlier tiers) and run in parallel; tiers run
 * sequentially. `deps` documents the upstream modules a seeder links to.
 * Correctness holds regardless of order (every seeder find-or-creates with
 * constant-id fallbacks) — tiers maximise cross-linking + throughput.
 */
export interface SeederEntry { name: string; run: ModuleSeeder; tier: number; deps?: string[] }

export const SEEDERS: SeederEntry[] = [
  // tier 0 — roots
  { name: 'user', run: seedUser, tier: 0 },
  { name: 'tenant', run: seedTenant, tier: 0 },
  // tier 1 — identity / system base (depend on user/tenant)
  { name: 'user_profile', run: seedUserProfile, tier: 1, deps: ['user'] },
  { name: 'user_security', run: seedUserSecurity, tier: 1, deps: ['user'] },
  { name: 'user_preferences', run: seedUserPreferences, tier: 1, deps: ['user'] },
  { name: 'user_session', run: seedUserSession, tier: 1, deps: ['user'] },
  { name: 'user_social_account', run: seedUserSocialAccount, tier: 1, deps: ['user'] },
  { name: 'tenant_domain', run: seedTenantDomain, tier: 1, deps: ['tenant'] },
  { name: 'tenant_member', run: seedTenantMember, tier: 1, deps: ['tenant', 'user'] },
  { name: 'tenant_invitation', run: seedTenantInvitation, tier: 1, deps: ['tenant'] },
  { name: 'tenant_subscription', run: seedTenantSubscription, tier: 1, deps: ['tenant'] },
  { name: 'tenant_usage', run: seedTenantUsage, tier: 1, deps: ['tenant'] },
  { name: 'setting', run: seedSetting, tier: 1, deps: ['tenant'] },
  { name: 'api_key', run: seedApiKey, tier: 1, deps: ['tenant'] },
  { name: 'auth_saml', run: seedAuthSaml, tier: 1, deps: ['tenant'] },
  { name: 'e_signature', run: seedESignature, tier: 1, deps: ['tenant'] },
  { name: 'auth_e_signature', run: seedAuthESignature, tier: 1, deps: ['tenant', 'user'] },
  { name: 'storage', run: seedStorage, tier: 1, deps: ['tenant'] },
  { name: 'webhook', run: seedWebhook, tier: 1, deps: ['tenant'] },
  { name: 'ai', run: seedAi, tier: 1, deps: ['tenant'] },
  { name: 'notification_log', run: seedNotificationLog, tier: 1, deps: ['tenant'] },
  { name: 'notification_push', run: seedNotificationPush, tier: 1, deps: ['user'] },
  // tier 2 — catalog + pricing infra
  { name: 'store', run: seedStore, tier: 2, deps: ['tenant'] },
  { name: 'payment_shipping', run: seedPaymentShipping, tier: 2, deps: ['tenant'] },
  { name: 'payment_tax', run: seedPaymentTax, tier: 2, deps: ['tenant'] },
  // tier 3 — payments, promotions, orders
  { name: 'payment', run: seedPayment, tier: 3, deps: ['tenant', 'user'] },
  { name: 'coupon', run: seedCoupon, tier: 3, deps: ['tenant'] },
  { name: 'order_fulfillment', run: seedOrderFulfillment, tier: 3, deps: ['store'] },
  // tier 4 — order/catalog-dependent commerce
  { name: 'payment_cart', run: seedPaymentCart, tier: 4, deps: ['store', 'user'] },
  { name: 'payment_return_rma', run: seedPaymentReturnRma, tier: 4, deps: ['order_fulfillment'] },
  { name: 'payment_loyalty_points', run: seedPaymentLoyaltyPoints, tier: 4, deps: ['user'] },
  { name: 'payment_wishlist', run: seedPaymentWishlist, tier: 4, deps: ['store', 'user'] },
  { name: 'product_review', run: seedProductReview, tier: 4, deps: ['store', 'user'] },
  // tier 5 — billing docs + content
  { name: 'invoice', run: seedInvoice, tier: 5, deps: ['payment'] },
  { name: 'media_gallery', run: seedMediaGallery, tier: 5, deps: ['storage'] },
  { name: 'seo', run: seedSeo, tier: 5, deps: ['store'] },
  { name: 'dynamic_page', run: seedDynamicPage, tier: 5, deps: ['tenant'] },
  { name: 'blog', run: seedBlog, tier: 5, deps: ['tenant'] },
  // tier 6 — cross-cutting, last
  { name: 'audit_log', run: seedAuditLog, tier: 6 },
];

export interface RunSeedOptions {
  profile?: SeedProfile;
  locale?: string;
  country?: string;
  currencies?: string[];
  /** Run independent seeders within a tier in parallel (default true). */
  parallel?: boolean;
  /** Allow seeding in production (otherwise refused unless SEED_ALLOW_PRODUCTION). */
  force?: boolean;
}

/** Environment-aware guard: never seed production data by accident. */
function assertSeedAllowed(force: boolean): void {
  const prod = env.NODE_ENV === 'production';
  if (prod && !force && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('[seed] Refusing to seed in production. Set SEED_ALLOW_PRODUCTION=true or pass { force: true }.');
  }
}

/** Validate that every declared dependency targets an earlier tier. */
export function validateSeederDependencies(): string[] {
  const tierByName = new Map(SEEDERS.map((s) => [s.name, s.tier]));
  const problems: string[] = [];
  for (const s of SEEDERS) {
    for (const dep of s.deps ?? []) {
      const dt = tierByName.get(dep);
      if (dt === undefined) problems.push(`${s.name} depends on unknown seeder '${dep}'`);
      else if (dt >= s.tier) problems.push(`${s.name} (tier ${s.tier}) depends on '${dep}' (tier ${dt}) — not an earlier tier`);
    }
  }
  return problems;
}

/**
 * Seed a dataset for one tenant. Idempotent (find-or-create). Supports named
 * profiles (minimal/demo/stress), locale/country-aware + multi-currency data,
 * env-guarded execution, and parallel tier execution. A failing seeder is
 * logged and skipped; the first error is rethrown after the run.
 */
export async function runSeed(tenantId?: string, opts: RunSeedOptions = {}): Promise<SeedContext> {
  const target = tenantId || process.env.SEED_TENANT_ID || ROOT_TENANT_ID;
  const profile = opts.profile ?? (process.env.SEED_PROFILE as SeedProfile | undefined) ?? 'demo';
  assertSeedAllowed(opts.force ?? false);

  const systemDs = await getDataSource();
  const ds = await tenantDataSourceFor(target);
  const ctx = makeSeedContext(ds, systemDs, target, {
    profile, locale: opts.locale, country: opts.country, currencies: opts.currencies,
  });
  ctx.log(`target tenant: ${target} | profile: ${profile} | locale: ${ctx.locale}/${ctx.country}`);

  const parallel = opts.parallel ?? true;
  const tiers = [...new Set(SEEDERS.map((s) => s.tier))].sort((a, b) => a - b);
  let ok = 0;
  let firstError: unknown;

  for (const tier of tiers) {
    const group = SEEDERS.filter((s) => s.tier === tier);
    const runOne = async (seeder: SeederEntry) => {
      try { await seeder.run(ctx); ok += 1; }
      catch (err) { ctx.log(`✗ ${seeder.name} failed: ${(err as Error).message}`); firstError ??= err; }
    };
    if (parallel) await Promise.all(group.map(runOne));
    else for (const s of group) await runOne(s);
  }

  ctx.log(`done — ${ok}/${SEEDERS.length} module(s) seeded for ${target}`);
  if (firstError) throw firstError;
  return ctx;
}

/**
 * Post-run assertion suite: verify the seed produced rows in key tables. Returns
 * pass/fail per check; a failing suite signals a broken seeder. Designed to run
 * in CI after `runSeed`.
 */
export async function assertSeeded(tenantId?: string): Promise<{ ok: boolean; checks: Array<{ name: string; ok: boolean; count: number }> }> {
  const target = tenantId || process.env.SEED_TENANT_ID || ROOT_TENANT_ID;
  const ds = await tenantDataSourceFor(target);
  const checks: Array<{ name: string; ok: boolean; count: number }> = [];
  const tables = ['store_products', 'tenant_members', 'settings', 'dynamic_pages'];
  for (const table of tables) {
    try {
      const rows = await ds.query(`SELECT COUNT(*)::int AS c FROM ${table} WHERE "tenantId" = $1`, [target]);
      const count = Number(rows?.[0]?.c ?? 0);
      checks.push({ name: table, ok: count > 0, count });
    } catch (e) {
      checks.push({ name: table, ok: false, count: 0 });
      void e;
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/**
 * Snapshot the seeded dataset for a tenant as a JSON fixture (for tests). Reuses
 * the tenant_export pipeline so the snapshot stays in sync with the schema.
 */
export async function snapshotSeed(tenantId?: string): Promise<Buffer> {
  const target = tenantId || process.env.SEED_TENANT_ID || ROOT_TENANT_ID;
  const { default: TenantExportService } = await import('@/modules/tenant_export/tenant_export.service');
  return TenantExportService.exportTenantData(target, {});
}
