import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { TenantDomain } from '@/modules/tenant_domain/entities/tenant_domain.entity';
import { AuditLog } from '@/modules/audit_log/entities/audit_log.entity';
import { Webhook } from '@/modules/webhook/entities/webhook.entity';
import { WebhookDelivery } from '@/modules/webhook/entities/webhook_delivery.entity';
import { Setting } from '@/modules/setting/entities/setting.entity';
import { Payment } from '@/modules/payment/entities/payment.entity';
import { PaymentTransaction } from '@/modules/payment/entities/payment_transaction.entity';
import { SubscriptionPlan } from '@/modules/payment/entities/subscription_plan.entity';
import { PlanFeature } from '@/modules/payment/entities/plan_feature.entity';
import { TenantSubscription } from '@/modules/tenant_subscription/entities/tenant_subscription.entity';
import { Coupon } from '@/modules/coupon/entities/coupon.entity';
import { CouponRedemption } from '@/modules/coupon/entities/coupon_redemption.entity';
import { ApiKey } from '@/modules/api_key/entities/api_key.entity';
import { SamlConfig } from '@/modules/auth_saml/entities/saml_config.entity';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';
import { AiUsageLog } from '@/modules/ai/entities/ai_usage_log.entity';
import { NotificationLog } from '@/modules/notification_log/entities/notification_log.entity';
import { TenantUsage } from '@/modules/tenant_usage/entities/tenant_usage.entity';
import Logger from '@/modules/logger';
import { createHash } from 'node:crypto';
import redis from '@/modules/redis';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export interface TenantExportData {
  exportedAt: string;
  tenantId: string;
  members: object[];
  domains: object[];
  auditLogs: object[];
  webhooks: object[];
  webhookDeliveries: object[];
  settings: object[] | null;
  payments: object[];
  paymentTransactions: object[];
  subscriptions: object[];
  subscriptionPlans: object[];
  planFeatures: object[];
  coupons: object[];
  couponRedemptions: object[];
  apiKeys: object[];
  samlConfigs: object[];
  uploadedFiles: object[];
  aiUsageLogs: object[];
  notificationLogs: object[];
  tenantUsage: object[];
}

function stripFields<T>(rows: T[], fields: string[]): object[] {
  return rows.map((row) => {
    const safe = { ...(row as unknown as Record<string, unknown>) };
    for (const f of fields) delete safe[f];
    return safe;
  });
}

export interface ExportOptions {
  /** GDPR redaction: pseudonymise direct identifiers (email/phone/IP/recipient). */
  redactPii?: boolean;
}

export interface ExportManifest {
  exportedAt: string;
  tenantId: string;
  redacted: boolean;
  sha256: string;
  sizeBytes: number;
  counts: Record<string, number>;
}

const PII_FIELDS = ['email', 'phone', 'recipient', 'ipAddress', 'lastUsedIp', 'lastLoginIp', 'customerEmail'];

function redactPiiDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPiiDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_FIELDS.includes(k) && v ? '[redacted]' : redactPiiDeep(v);
    }
    return out;
  }
  return value;
}

export default class TenantExportService {

  static async exportTenantData(tenantId: string, opts: ExportOptions = {}): Promise<Buffer> {
    const ds = await tenantDataSourceFor(tenantId);

    Logger.info(`[TenantExport] Starting export for tenant ${tenantId}`);

    const [
      members,
      domains,
      auditLogs,
      webhooks,
      webhookDeliveries,
      settings,
      payments,
      paymentTransactions,
      subscriptions,
      subscriptionPlans,
      planFeatures,
      coupons,
      couponRedemptions,
      apiKeys,
      samlConfigs,
      uploadedFiles,
      aiUsageLogs,
      notificationLogs,
      tenantUsage,
    ] = await Promise.all([
      ds.getRepository(TenantMember).find({ where: { tenantId } }),
      ds.getRepository(TenantDomain).find({ where: { tenantId } }),
      ds.getRepository(AuditLog).find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 1000,
      }),
      ds.getRepository(Webhook).find({ where: { tenantId } }),
      ds.getRepository(WebhookDelivery).find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 5000 }),
      ds.getRepository(Setting).find({ where: { tenantId } }),
      ds.getRepository(Payment).find({ where: { tenantId } }),
      // PaymentTransaction has no direct tenantId — join via Payment.
      ds
        .getRepository(PaymentTransaction)
        .createQueryBuilder('pt')
        .innerJoin(Payment, 'p', 'p.paymentId = pt.paymentId')
        .where('p.tenantId = :tenantId', { tenantId })
        .orderBy('pt.createdAt', 'DESC')
        .take(5000)
        .getMany(),
      ds.getRepository(TenantSubscription).find({ where: { tenantId } }),
      ds.getRepository(SubscriptionPlan).find({ where: { tenantId } }),
      ds.getRepository(PlanFeature).find({ where: { tenantId } }),
      ds.getRepository(Coupon).find({ where: { tenantId } }),
      ds.getRepository(CouponRedemption).find({ where: { tenantId } }),
      ds.getRepository(ApiKey).find({ where: { tenantId } }),
      ds.getRepository(SamlConfig).find({ where: { tenantId } }),
      ds.getRepository(UploadedFile).find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 5000 }),
      ds.getRepository(AiUsageLog).find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 5000 }),
      ds.getRepository(NotificationLog).find({ where: { tenantId }, order: { sentAt: 'DESC' }, take: 5000 }),
      ds.getRepository(TenantUsage).find({ where: { tenantId } }),
    ]);

    // Members have no passwords — passwords are stored on User entity in system DB
    const safeMembers = members.map(({ ...m }) => m);

    // Strip HMAC signing secrets from webhooks before export
    const safeWebhooks = stripFields(webhooks, ['secret']);

    // Strip raw key hashes from API keys — only metadata leaves the tenant
    const safeApiKeys = stripFields(apiKeys, ['keyHash']);

    // Strip SAML SP private keys before export
    const safeSamlConfigs = stripFields(samlConfigs, ['spPrivateKey']);

    const exportData: TenantExportData = {
      exportedAt: new Date().toISOString(),
      tenantId,
      members: safeMembers,
      domains,
      auditLogs,
      webhooks: safeWebhooks,
      webhookDeliveries,
      settings: settings.length > 0 ? settings : null,
      payments,
      paymentTransactions,
      subscriptions,
      subscriptionPlans,
      planFeatures,
      coupons,
      couponRedemptions,
      apiKeys: safeApiKeys,
      samlConfigs: safeSamlConfigs,
      uploadedFiles,
      aiUsageLogs,
      notificationLogs,
      tenantUsage,
    };

    Logger.info(
      `[TenantExport] Export complete for tenant ${tenantId}: ` +
      `${members.length} members, ${auditLogs.length} audit logs, ` +
      `${webhooks.length} webhooks, ${settings.length} settings, ` +
      `${payments.length} payments, ${subscriptions.length} subscriptions, ` +
      `${coupons.length} coupons, ${apiKeys.length} api keys, ` +
      `${uploadedFiles.length} uploaded files, ${aiUsageLogs.length} ai usage logs, ` +
      `${notificationLogs.length} notification logs`,
    );

    const finalData = opts.redactPii ? (redactPiiDeep(exportData) as TenantExportData) : exportData;
    return Buffer.from(JSON.stringify(finalData, null, 2), 'utf-8');
  }

  /**
   * Per-tenant export rate limit (one export per `windowSeconds`, default 1h).
   * Throws 429 when called too soon. Exports are heavy and contain sensitive
   * data, so they must not be triggerable on a tight loop.
   */
  static async assertNotRateLimited(tenantId: string, windowSeconds = 3600): Promise<void> {
    const key = `tenant_export:rate:${tenantId}`;
    const ok = await redis.set(key, '1', 'EX', windowSeconds, 'NX').catch(() => 'OK');
    if (ok !== 'OK') {
      throw new AppError('An export was requested recently. Please try again later.', 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }
  }

  /**
   * Rate-limited export that also returns a completeness/integrity manifest:
   * a SHA-256 checksum, byte size, and per-collection row counts. The manifest
   * lets the downloader verify the archive was not truncated or tampered with.
   */
  static async exportWithManifest(
    tenantId: string,
    opts: ExportOptions & { skipRateLimit?: boolean } = {},
  ): Promise<{ buffer: Buffer; manifest: ExportManifest }> {
    if (!opts.skipRateLimit) await this.assertNotRateLimited(tenantId);
    const buffer = await this.exportTenantData(tenantId, opts);
    const parsed = JSON.parse(buffer.toString('utf-8')) as Record<string, unknown>;
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) counts[k] = v.length;
    }
    const manifest: ExportManifest = {
      exportedAt: new Date().toISOString(),
      tenantId,
      redacted: Boolean(opts.redactPii),
      sha256: createHash('sha256').update(buffer).digest('hex'),
      sizeBytes: buffer.length,
      counts,
    };
    return { buffer, manifest };
  }
}
