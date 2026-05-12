import 'reflect-metadata';
import { ILike } from 'typeorm';
import { getSystemDataSource, tenantDataSourceFor } from '@/modules/db';
import { AuditLog as AuditLogEntity } from './entities/audit_log.entity';
import { TenantAuditLog as TenantAuditLogEntity } from './entities/audit_log_tenant.entity';
import Logger from '@/modules/logger';
import { AuditLogSchema, type AuditLog } from './audit_log.types';
import { CreateAuditLogDTO, GetAuditLogsDTO, type CreateAuditLogInput, type GetAuditLogsInput } from './audit_log.dto';

export default class AuditLogService {

  static async log(input: CreateAuditLogInput): Promise<void> {
    try {
      const data = CreateAuditLogDTO.parse(input);

      if (data.tenantId) {
        const { tenantId, ...rest } = data;
        const ds = await tenantDataSourceFor(tenantId);
        const repo = ds.getRepository(TenantAuditLogEntity);
        await repo.save(repo.create({ ...rest, tenantId } as any));
      } else {
        const { tenantId: _t, ...systemData } = data;
        const ds = await getSystemDataSource();
        const repo = ds.getRepository(AuditLogEntity);
        await repo.save(repo.create(systemData as any));
      }

      Logger.info(
        `[AUDIT] ${data.actorType}:${data.actorId ?? 'system'} → ${data.action}` +
        (data.resourceType ? ` on ${data.resourceType}:${data.resourceId ?? '?'}` : '') +
        (data.tenantId ? ` [tenant:${data.tenantId}]` : '')
      );
    } catch (err: unknown) {
      Logger.error(`[AUDIT] Failed to write audit log: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  static async getAll(input: GetAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }> {
    const { tenantId, actorId, action, resourceType, resourceId, page, pageSize } = GetAuditLogsDTO.parse(input);

    const where: Record<string, unknown> = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = ILike(`%${action}%`);
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;

    if (tenantId) {
      where.tenantId = tenantId;
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(TenantAuditLogEntity);
      const [rows, total] = await Promise.all([
        repo.find({ where: where as any, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize }),
        repo.count({ where: where as any }),
      ]);
      return { logs: rows.map((r) => AuditLogSchema.parse(r)), total };
    }

    const ds = await getSystemDataSource();
    const repo = ds.getRepository(AuditLogEntity);
    const [rows, total] = await Promise.all([
      repo.find({ where: where as any, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize }),
      repo.count({ where: where as any }),
    ]);
    return { logs: rows.map((r) => AuditLogSchema.parse(r)), total };
  }

}
