import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { TenantDatabase } from './entities/tenant_database.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { TenantDomain } from '@/modules/tenant_domain/entities/tenant_domain.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { TenantInvitation } from '@/modules/tenant_invitation/entities/tenant_invitation.entity';
import { TenantSetting } from '@/modules/tenant_setting/entities/tenant_setting.entity';
import { TenantSubscription } from '@/modules/tenant_subscription/entities/tenant_subscription.entity';
import { Payment } from '@/modules/payment/entities/payment.entity';
import { PaymentTransaction } from '@/modules/payment/entities/payment_transaction.entity';
import { TenantAuditLog } from '@/modules/audit_log/entities/audit_log_tenant.entity';
import { ApiKey } from '@/modules/api_key/entities/api_key.entity';
import { CouponRedemption } from '@/modules/coupon/entities/coupon_redemption.entity';
import { Webhook } from '@/modules/webhook/entities/webhook.entity';
import { WebhookDelivery } from '@/modules/webhook/entities/webhook_delivery.entity';
import { SamlConfig } from '@/modules/auth_saml/entities/saml_config.entity';

const TENANT_ENTITIES = [
  Tenant,
  TenantDomain,
  TenantMember,
  TenantInvitation,
  TenantSetting,
  TenantSubscription,
  Payment,
  PaymentTransaction,
  TenantAuditLog,
  ApiKey,
  CouponRedemption,
  Webhook,
  WebhookDelivery,
  SamlConfig,
];

function parseDbUrl(raw: string): { url: string; schema?: string } {
  const match = raw.match(/[?&]schema=([^&]+)/);
  const schema = match?.[1];
  const url = raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, '');
  return { url, schema };
}

const { url: DEFAULT_TENANT_DB_URL, schema: DEFAULT_TENANT_SCHEMA } = parseDbUrl(env.TENANT_DATABASE_URL);

const MAX_CACHED = 100;
const tenantCache = new Map<string, DataSource>();

function evictOldest(): void {
  const [key, ds] = tenantCache.entries().next().value!;
  tenantCache.delete(key);
  ds.destroy().catch(() => {});
}

export async function tenantDataSourceFor(tenantId: string): Promise<DataSource> {
  if (tenantCache.has(tenantId)) return tenantCache.get(tenantId)!;

  const { getSystemDataSource } = await import('./db.system');
  const sys = await getSystemDataSource();
  const row = await sys.getRepository(TenantDatabase).findOne({ where: { tenantId } });

  const { url, schema } = parseDbUrl(row?.databaseUrl ?? env.TENANT_DATABASE_URL);

  if (tenantCache.size >= MAX_CACHED) evictOldest();

  const ds = new DataSource({
    type: 'postgres',
    url,
    schema,
    synchronize: false,
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

export const defaultTenantDataSource = new DataSource({
  type: 'postgres',
  url: DEFAULT_TENANT_DB_URL,
  schema: DEFAULT_TENANT_SCHEMA,
  synchronize: false,
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
