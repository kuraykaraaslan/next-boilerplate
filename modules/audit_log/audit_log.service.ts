import 'reflect-metadata';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { AuditLog as AuditLogRow } from './entities/audit_log.entity';
import Logger from '@/modules/logger';
import { AuditLogSchema, type AuditLog } from './audit_log.types';
import { CreateAuditLogDTO, GetAuditLogsDTO, type CreateAuditLogInput, type GetAuditLogsInput } from './audit_log.dto';

export default class AuditLogService {

  /**
   * Write an audit-log row. Every log belongs to a tenant; when the caller
   * omits `tenantId` we fall back to the platform tenant (`ROOT_TENANT_ID`)
   * so platform-level events still land in a real tenant's audit table.
   */
  static async log(input: CreateAuditLogInput): Promise<void> {
    try {
      const data = CreateAuditLogDTO.parse(input);
      const tenantId = data.tenantId ?? ROOT_TENANT_ID;
      const { tenantId: _ignored, ...rest } = data;

      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AuditLogRow);
      await repo.save(repo.create({ ...rest, tenantId } as Partial<AuditLogRow>));

      Logger.info(
        `[AUDIT] ${data.actorType}:${data.actorId ?? 'system'} → ${data.action}` +
        (data.resourceType ? ` on ${data.resourceType}:${data.resourceId ?? '?'}` : '') +
        ` [tenant:${tenantId}]`
      );
    } catch (err: unknown) {
      Logger.error(`[AUDIT] Failed to write audit log: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  static async getAll(input: GetAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }> {
    const { tenantId: rawTenantId, actorId, action, resourceType, resourceId, page, pageSize } =
      GetAuditLogsDTO.parse(input);
    const tenantId = rawTenantId ?? ROOT_TENANT_ID;

    const where: Record<string, unknown> = { tenantId };
    if (actorId) where.actorId = actorId;
    if (action) where.action = ILike(`%${action}%`);
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AuditLogRow);
    const [rows, total] = await Promise.all([
      repo.find({ where: where as any, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize }),
      repo.count({ where: where as any }),
    ]);
    return { logs: rows.map((r) => AuditLogSchema.parse(r)), total };
  }

}
