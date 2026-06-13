import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { parseDbUrl, typeormLogging, TenantContextLogger } from './db.utils';
import { TenantDatabase } from './entities/tenant_database.entity';
import { User } from '@/modules/user/entities/user.entity';
import { UserConsent } from '@/modules/auth/entities/user_consent.entity';
import { UserProfile } from '@/modules/user_profile/entities/user_profile.entity';
import { UserSecurity } from '@/modules/user_security/entities/user_security.entity';
import { UserPreferences } from '@/modules/user_preferences/entities/user_preferences.entity';
import { UserSession } from '@/modules/user_session/entities/user_session.entity';
import { UserSocialAccount } from '@/modules/user_social_account/entities/user_social_account.entity';
import { SigningCertificate } from '@/modules/e_signature/entities/signing_certificate.entity';
import { TrustListEntry } from '@/modules/e_signature/entities/trust_list_entry.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { TenantDomain } from '@/modules/tenant_domain/entities/tenant_domain.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { TenantInvitation } from '@/modules/tenant_invitation/entities/tenant_invitation.entity';
import { TenantSubscription } from '@/modules/tenant_subscription/entities/tenant_subscription.entity';
import { Payment } from '@/modules/payment/entities/payment.entity';
import { PaymentTransaction } from '@/modules/payment/entities/payment_transaction.entity';
import { AuditLog } from '@/modules/audit_log/entities/audit_log.entity';
import { ApiKey } from '@/modules/api_key/entities/api_key.entity';
import { CouponRedemption } from '@/modules/coupon/entities/coupon_redemption.entity';
import { Webhook } from '@/modules/webhook/entities/webhook.entity';
import { WebhookDelivery } from '@/modules/webhook/entities/webhook_delivery.entity';
import { SamlConfig } from '@/modules/auth_saml/entities/saml_config.entity';
import { Setting } from '@/modules/setting/entities/setting.entity';
import { SettingHistory } from '@/modules/setting/entities/setting_history.entity';
import { Coupon } from '@/modules/coupon/entities/coupon.entity';
import { SubscriptionPlan } from '@/modules/payment/entities/subscription_plan.entity';
import { PlanFeature } from '@/modules/payment/entities/plan_feature.entity';
import { PushSubscription } from '@/modules/notification_push/entities/push_subscription.entity';
import { Invoice } from '@/modules/invoice/entities/invoice.entity';
import { InvoiceLine } from '@/modules/invoice/entities/invoice_line.entity';
import { TenantUsage } from '@/modules/tenant_usage/entities/tenant_usage.entity';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';
import { AiUsageLog } from '@/modules/ai/entities/ai_usage_log.entity';
import { NotificationLog } from '@/modules/notification_log/entities/notification_log.entity';
import { StoreCategory } from '@/modules/store/entities/store_category.entity';
import { StoreCategorySpec } from '@/modules/store/entities/store_category_spec.entity';
import { StoreProduct } from '@/modules/store/entities/store_product.entity';
import { StoreProductImage } from '@/modules/store/entities/store_product_image.entity';
import { StoreProductSpecValue } from '@/modules/store/entities/store_product_spec_value.entity';
import { StoreVariantGroup } from '@/modules/store/entities/store_variant_group.entity';
import { StoreVariantGroupItem } from '@/modules/store/entities/store_variant_group_item.entity';
import { StoreBundle } from '@/modules/store/entities/store_bundle.entity';
import { StoreBundleItem } from '@/modules/store/entities/store_bundle_item.entity';
import { StoreVariationType } from '@/modules/store/entities/store_variation_type.entity';
import { StoreVariationOption } from '@/modules/store/entities/store_variation_option.entity';
import { StoreProductVariant } from '@/modules/store/entities/store_product_variant.entity';
import { SeoMeta } from '@/modules/seo/entities/seo_meta.entity';
import { MediaGallery } from '@/modules/media_gallery/entities/media_gallery.entity';
import { MediaGalleryItem } from '@/modules/media_gallery/entities/media_gallery_item.entity';
import { DynamicPage } from '@/modules/dynamic_page/entities/dynamic_page.entity';
import { DynamicPageTranslation } from '@/modules/dynamic_page/entities/dynamic_page_translation.entity';
import { DynamicPageBlock } from '@/modules/dynamic_page/entities/dynamic_page_block.entity';
import { DynamicCollection } from '@/modules/dynamic_page/entities/dynamic_collection.entity';
import { DynamicCollectionItem } from '@/modules/dynamic_page/entities/dynamic_collection_item.entity';
import { Fulfillment } from '@/modules/order_fulfillment/entities/fulfillment.entity';
import { FulfillmentItem } from '@/modules/order_fulfillment/entities/fulfillment_item.entity';
import { FulfillmentEvent } from '@/modules/order_fulfillment/entities/fulfillment_event.entity';
import { Cart } from '@/modules/payment_cart/entities/cart.entity';
import { CartItem } from '@/modules/payment_cart/entities/cart_item.entity';
import { ShippingMethod } from '@/modules/payment_shipping/entities/shipping_method.entity';
import { ShippingRate } from '@/modules/payment_shipping/entities/shipping_rate.entity';
import { TaxClass } from '@/modules/payment_tax/entities/tax_class.entity';
import { TaxRate } from '@/modules/payment_tax/entities/tax_rate.entity';
import { Wishlist } from '@/modules/payment_wishlist/entities/wishlist.entity';
import { WishlistItem } from '@/modules/payment_wishlist/entities/wishlist_item.entity';
import { ProductReview } from '@/modules/product_review/entities/product_review.entity';
import { ProductReviewVote } from '@/modules/product_review/entities/product_review_vote.entity';
import { ReturnRequest } from '@/modules/payment_return_rma/entities/return_request.entity';
import { ReturnItem } from '@/modules/payment_return_rma/entities/return_item.entity';
import { ReturnEvent } from '@/modules/payment_return_rma/entities/return_event.entity';
import { LoyaltyAccount } from '@/modules/payment_loyalty_points/entities/loyalty_account.entity';
import { LoyaltyTransaction } from '@/modules/payment_loyalty_points/entities/loyalty_transaction.entity';
import { LoyaltyTier } from '@/modules/payment_loyalty_points/entities/loyalty_tier.entity';
import { BlogCategory } from '@/modules/blog/entities/blog_category.entity';
import { BlogPost } from '@/modules/blog/entities/blog_post.entity';
import { BlogComment } from '@/modules/blog/entities/blog_comment.entity';

export const ENTITIES = [
  User,
  UserConsent,
  UserProfile,
  UserSecurity,
  UserPreferences,
  UserSession,
  UserSocialAccount,
  SigningCertificate,
  TrustListEntry,
  TenantDatabase,
  Tenant,
  TenantDomain,
  TenantMember,
  TenantInvitation,
  TenantSubscription,
  Payment,
  PaymentTransaction,
  AuditLog,
  ApiKey,
  CouponRedemption,
  Webhook,
  WebhookDelivery,
  SamlConfig,
  Setting,
  SettingHistory,
  Coupon,
  SubscriptionPlan,
  PlanFeature,
  PushSubscription,
  Invoice,
  InvoiceLine,
  TenantUsage,
  UploadedFile,
  AiUsageLog,
  NotificationLog,
  StoreCategory,
  StoreCategorySpec,
  StoreProduct,
  StoreProductImage,
  StoreProductSpecValue,
  StoreVariantGroup,
  StoreVariantGroupItem,
  StoreBundle,
  StoreBundleItem,
  StoreVariationType,
  StoreVariationOption,
  StoreProductVariant,
  SeoMeta,
  MediaGallery,
  MediaGalleryItem,
  DynamicPage,
  DynamicPageTranslation,
  DynamicPageBlock,
  DynamicCollection,
  DynamicCollectionItem,
  Fulfillment,
  FulfillmentItem,
  FulfillmentEvent,
  Cart,
  CartItem,
  ShippingMethod,
  ShippingRate,
  TaxClass,
  TaxRate,
  Wishlist,
  WishlistItem,
  ProductReview,
  ProductReviewVote,
  ReturnRequest,
  ReturnItem,
  ReturnEvent,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTier,
  BlogCategory,
  BlogPost,
  BlogComment,
];

const { url: DEFAULT_DB_URL, schema: DEFAULT_SCHEMA } = parseDbUrl(env.DATABASE_URL);

function buildDataSourceOptions(url: string, schema?: string): ConstructorParameters<typeof DataSource>[0] {
  return {
    type: 'postgres',
    url,
    schema,
    synchronize: env.NODE_ENV === 'development',
    logging: typeormLogging(env.NODE_ENV),
    logger: new TenantContextLogger(env.DB_SLOW_QUERY_THRESHOLD_MS),
    entities: ENTITIES,
    migrations: ['modules/db/migrations/*.ts'],
    // PgBouncer-compatible pool sizing via DB_POOL_MAX env var.
    extra: { max: env.DB_POOL_MAX },
  };
}

const defaultDataSource = new DataSource(buildDataSourceOptions(DEFAULT_DB_URL, DEFAULT_SCHEMA));

let defaultInitialized = false;

export async function getDataSource(): Promise<DataSource> {
  if (!defaultInitialized) {
    await defaultDataSource.initialize();
    defaultInitialized = true;
  }
  return defaultDataSource;
}

// ── Read replica routing ────────────────────────────────────────────────────
let readDataSource: DataSource | null = null;
let readInitialized = false;

export async function getReadDataSource(): Promise<DataSource> {
  if (!env.DATABASE_READ_REPLICA_URL) return getDataSource();
  if (!readInitialized) {
    const { url, schema } = parseDbUrl(env.DATABASE_READ_REPLICA_URL);
    readDataSource = new DataSource({
      ...buildDataSourceOptions(url, schema),
      synchronize: false,
    });
    await readDataSource.initialize();
    readInitialized = true;
  }
  return readDataSource!;
}

// ── System DataSource (bypasses RLS for cross-tenant cron / migrations) ─────
// Uses the default DataSource connection; callers must SET LOCAL app.bypass_rls = 'on'
// or use the BYPASSRLS Postgres role. This is a typed marker for grep/audit.
export async function getSystemDataSource(): Promise<DataSource> {
  return getDataSource();
}

// ── Health check ────────────────────────────────────────────────────────────
export async function checkDataSourceHealth(): Promise<{
  default: 'ok' | 'error';
  replica: 'ok' | 'error' | 'not_configured';
  error?: string;
}> {
  let defaultStatus: 'ok' | 'error' = 'error';
  let replicaStatus: 'ok' | 'error' | 'not_configured' = 'not_configured';
  let errorMsg: string | undefined;

  try {
    const ds = await getDataSource();
    await ds.query('SELECT 1');
    defaultStatus = 'ok';
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  if (env.DATABASE_READ_REPLICA_URL) {
    try {
      const ds = await getReadDataSource();
      await ds.query('SELECT 1');
      replicaStatus = 'ok';
    } catch {
      replicaStatus = 'error';
    }
  }

  return { default: defaultStatus, replica: replicaStatus, ...(errorMsg ? { error: errorMsg } : {}) };
}

// ── Per-tenant DataSource cache ─────────────────────────────────────────────
const MAX_CACHED = 100;
const tenantCache = new Map<string, DataSource>();

function evictOldest(): void {
  const [key, ds] = tenantCache.entries().next().value!;
  tenantCache.delete(key);
  ds.destroy().catch(() => {});
}

export async function tenantDataSourceFor(tenantId: string): Promise<DataSource> {
  if (tenantCache.has(tenantId)) return tenantCache.get(tenantId)!;

  const base = await getDataSource();
  const row = await base.getRepository(TenantDatabase).findOne({ where: { tenantId } });
  if (!row) return base;

  const { url, schema } = parseDbUrl(row.databaseUrl);
  if (tenantCache.size >= MAX_CACHED) evictOldest();

  const ds = new DataSource(buildDataSourceOptions(url, schema));
  await ds.initialize();
  tenantCache.set(tenantId, ds);
  return ds;
}

/**
 * Apply a per-statement timeout for the duration of `callback`.
 * Uses `SET LOCAL statement_timeout` so the timeout is transaction-scoped.
 * When DB_QUERY_TIMEOUT_MS is 0 (default) the call is a no-op pass-through.
 */
export async function withQueryTimeout<T>(
  tenantId: string,
  timeoutMs: number,
  callback: (qr: import('typeorm').QueryRunner) => Promise<T>,
): Promise<T> {
  const ds = await tenantDataSourceFor(tenantId);
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    if (timeoutMs > 0) {
      await qr.query('SET LOCAL statement_timeout = $1', [timeoutMs]);
    }
    const result = await callback(qr);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

export function clearTenantDsCache(tenantId: string): void {
  const ds = tenantCache.get(tenantId);
  tenantCache.delete(tenantId);
  ds?.destroy().catch(() => {});
}

/**
 * Run `callback` inside a transaction with `SET LOCAL app.current_tenant`
 * applied so PostgreSQL RLS policies in migration 001_tenant_rls.sql are
 * enforced on the shared DataSource.  Use this for any query that touches
 * the default DataSource with tenant-scoped rows.
 *
 * Per-tenant DataSources (separate DB per tenant) already provide isolation
 * at the database level and do not need this wrapper.
 */
export async function withTenantRLS<T>(
  tenantId: string,
  callback: (qr: import('typeorm').QueryRunner) => Promise<T>,
): Promise<T> {
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await qr.query('SET LOCAL app.current_tenant = $1', [tenantId]);
    const result = await callback(qr);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

/**
 * Run `callback` with RLS bypassed for cross-tenant system operations
 * (GDPR sweeps, cron jobs, migrations). Uses SET LOCAL so bypass is
 * transaction-scoped and cannot leak to other queries.
 */
export async function withSystemRLS<T>(
  callback: (qr: import('typeorm').QueryRunner) => Promise<T>,
): Promise<T> {
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await qr.query("SET LOCAL app.bypass_rls = 'on'");
    const result = await callback(qr);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}
