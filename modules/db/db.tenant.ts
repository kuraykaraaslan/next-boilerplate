import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { parseDbUrl, typeormLogging } from './db.utils';
import { getSystemDataSource } from './db.system';
import { TenantDatabase } from './entities/tenant_database.entity';
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

const TENANT_ENTITIES = [
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
];

const { url: DEFAULT_TENANT_DB_URL, schema: DEFAULT_TENANT_SCHEMA } = parseDbUrl(env.TENANT_DATABASE_URL);

export const defaultTenantDataSource = new DataSource({
  type: 'postgres',
  url: DEFAULT_TENANT_DB_URL,
  schema: DEFAULT_TENANT_SCHEMA,
  synchronize: env.NODE_ENV === 'development',
  logging: typeormLogging(env.NODE_ENV),
  entities: TENANT_ENTITIES,
  migrations: [],
});

let defaultInitialized = false;

export async function getDefaultTenantDataSource(): Promise<DataSource> {
  if (!defaultInitialized) {
    await defaultTenantDataSource.initialize();
    defaultInitialized = true;
  }
  return defaultTenantDataSource;
}

const MAX_CACHED = 100;
const tenantCache = new Map<string, DataSource>();

function evictOldest(): void {
  const [key, ds] = tenantCache.entries().next().value!;
  tenantCache.delete(key);
  ds.destroy().catch(() => {});
}

export async function tenantDataSourceFor(tenantId: string): Promise<DataSource> {
  if (tenantCache.has(tenantId)) return tenantCache.get(tenantId)!;

  const sys = await getSystemDataSource();
  const row = await sys.getRepository(TenantDatabase).findOne({ where: { tenantId } });

  const { url, schema } = parseDbUrl(row?.databaseUrl ?? env.TENANT_DATABASE_URL);

  if (tenantCache.size >= MAX_CACHED) evictOldest();

  const ds = new DataSource({
    type: 'postgres',
    url,
    schema,
    synchronize: env.NODE_ENV === 'development',
    logging: typeormLogging(env.NODE_ENV),
    entities: TENANT_ENTITIES,
    migrations: [],
  });
  await ds.initialize();
  tenantCache.set(tenantId, ds);
  return ds;
}

export function clearTenantDsCache(tenantId: string): void {
  const ds = tenantCache.get(tenantId);
  tenantCache.delete(tenantId);
  ds?.destroy().catch(() => {});
}
