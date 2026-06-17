import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { TenantMember } from '@kuraykaraaslan/tenant_member/server/entities/tenant_member.entity';
import { TenantDomain } from '@kuraykaraaslan/tenant_domain/server/entities/tenant_domain.entity';
import { AuditLog } from '@kuraykaraaslan/audit_log/server/entities/audit_log.entity';
import { Webhook } from '@kuraykaraaslan/webhook/server/entities/webhook.entity';
import { WebhookDelivery } from '@kuraykaraaslan/webhook/server/entities/webhook_delivery.entity';
import { Setting } from '@kuraykaraaslan/setting/server/entities/setting.entity';
import { Payment } from '@kuraykaraaslan/payment/server/entities/payment.entity';
import { PaymentTransaction } from '@kuraykaraaslan/payment/server/entities/payment_transaction.entity';
import { SubscriptionPlan } from '@kuraykaraaslan/payment/server/entities/subscription_plan.entity';
import { PlanFeature } from '@kuraykaraaslan/payment/server/entities/plan_feature.entity';
import { TenantSubscription } from '@kuraykaraaslan/tenant_subscription/server/entities/tenant_subscription.entity';
import { Coupon } from '@kuraykaraaslan/coupon/server/entities/coupon.entity';
import { CouponRedemption } from '@kuraykaraaslan/coupon/server/entities/coupon_redemption.entity';
import { ApiKey } from '@kuraykaraaslan/api_key/server/entities/api_key.entity';
import { SamlConfig } from '@kuraykaraaslan/auth_saml/server/entities/saml_config.entity';
import { UploadedFile } from '@kuraykaraaslan/storage/server/entities/uploaded_file.entity';
import { AiUsageLog } from '@kuraykaraaslan/ai/server/entities/ai_usage_log.entity';
import { NotificationLog } from '@kuraykaraaslan/notification_log/server/entities/notification_log.entity';
import { TenantUsage } from '@kuraykaraaslan/tenant_usage/server/entities/tenant_usage.entity';
import Logger from '@kuraykaraaslan/logger';
import type { TenantExportData, ExportOptions } from './tenant_export.types';
import { stripFields, redactPiiDeep } from './tenant_export.helpers';

export async function exportTenantData(tenantId: string, opts: ExportOptions = {}): Promise<Buffer> {
  const ds = await tenantDataSourceFor(tenantId);

  // Configurable audit-log export cap (documented): opts override → setting → 1000.
  let auditCap = opts.auditLogCap;
  if (auditCap == null) {
    try {
      const { default: SettingService } = await import('@kuraykaraaslan/setting/server/setting.service');
      const raw = await SettingService.getValue(tenantId, 'exportAuditLogCap').catch(() => null);
      auditCap = Number(raw) > 0 ? Number(raw) : 1000;
    } catch { auditCap = 1000; }
  }

  Logger.info(`[TenantExport] Starting export for tenant ${tenantId} (auditCap=${auditCap})`);

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
      take: auditCap,
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

  let finalData: Record<string, unknown> = opts.redactPii ? (redactPiiDeep(exportData) as Record<string, unknown>) : (exportData as unknown as Record<string, unknown>);

  // Selective collection export: keep metadata keys + only the requested collections.
  if (opts.collections && opts.collections.length > 0) {
    const keep = new Set([...opts.collections, 'exportedAt', 'tenantId']);
    finalData = Object.fromEntries(Object.entries(finalData).filter(([k]) => keep.has(k)));
  }
  return Buffer.from(JSON.stringify(finalData, null, 2), 'utf-8');
}
