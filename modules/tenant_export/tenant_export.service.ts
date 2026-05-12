import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { TenantDomain } from '@/modules/tenant_domain/entities/tenant_domain.entity';
import { TenantAuditLog } from '@/modules/audit_log/entities/audit_log_tenant.entity';
import { Webhook } from '@/modules/webhook/entities/webhook.entity';
import { TenantSetting } from '@/modules/tenant_setting/entities/tenant_setting.entity';
import Logger from '@/modules/logger';

export interface TenantExportData {
  exportedAt: string;
  tenantId: string;
  members: object[];
  domains: object[];
  auditLogs: object[];
  webhooks: object[];
  settings: object[] | null;
}

export default class TenantExportService {

  static async exportTenantData(tenantId: string): Promise<Buffer> {
    const ds = await tenantDataSourceFor(tenantId);

    Logger.info(`[TenantExport] Starting export for tenant ${tenantId}`);

    const [members, domains, auditLogs, webhooks, settings] = await Promise.all([
      ds.getRepository(TenantMember).find({ where: { tenantId } }),
      ds.getRepository(TenantDomain).find({ where: { tenantId } }),
      ds.getRepository(TenantAuditLog).find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 1000,
      }),
      ds.getRepository(Webhook).find({ where: { tenantId } }),
      ds.getRepository(TenantSetting).find({ where: { tenantId } }),
    ]);

    // Members have no passwords — passwords are stored on User entity in system DB
    const safeMembers = members.map(({ ...m }) => m);

    // Strip HMAC signing secrets from webhooks before export
    const safeWebhooks = webhooks.map((w) => {
      const safe = { ...(w as unknown as Record<string, unknown>) };
      delete safe['secret'];
      return safe;
    });

    const exportData: TenantExportData = {
      exportedAt: new Date().toISOString(),
      tenantId,
      members: safeMembers,
      domains,
      auditLogs,
      webhooks: safeWebhooks,
      settings: settings.length > 0 ? settings : null,
    };

    Logger.info(
      `[TenantExport] Export complete for tenant ${tenantId}: ` +
      `${members.length} members, ${auditLogs.length} audit logs, ` +
      `${webhooks.length} webhooks, ${settings.length} settings`,
    );

    return Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
  }
}
