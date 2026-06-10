import 'reflect-metadata';
import { ILike, type FindOptionsWhere } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { AuditLog as AuditLogRow } from './entities/audit_log.entity';
import Logger from '@/modules/logger';
import { AuditLogSchema, type AuditLog } from './audit_log.types';
import { CreateAuditLogDTO, GetAuditLogsDTO, type CreateAuditLogInput, type GetAuditLogsInput } from './audit_log.dto';
import AuditLogMessages from './audit_log.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

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
    const parsed = GetAuditLogsDTO.safeParse(input);
    if (!parsed.success) {
      throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
    }
    const { tenantId: rawTenantId, actorId, action, resourceType, resourceId, page, pageSize } = parsed.data;
    const tenantId = rawTenantId ?? ROOT_TENANT_ID;

    const where: FindOptionsWhere<AuditLogRow> = { tenantId };
    if (actorId) where.actorId = actorId;
    if (action) where.action = ILike(`%${action}%`);
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;

    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AuditLogRow);
      const [rows, total] = await Promise.all([
        repo.find({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize }),
        repo.count({ where }),
      ]);
      return { logs: rows.map((r) => AuditLogSchema.parse(r)), total };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`[AuditLog] getAll failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(AuditLogMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

}
