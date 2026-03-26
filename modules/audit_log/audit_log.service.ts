import { NextRequest } from 'next/server';
import { systemPrisma, tenantPrisma } from '@/libs/prisma';
import Logger from '@/libs/logger';
import { AuditLogSchema, type AuditLog } from './audit_log.types';
import { CreateAuditLogDTO, GetAuditLogsDTO, type CreateAuditLogInput, type GetAuditLogsInput } from './audit_log.dto';

export default class AuditLogService {

  /**
   * Record an audit event.
   * Routes to tenant DB when tenantId is present, system DB otherwise.
   * Fire-and-forget: never throws, never blocks the caller.
   */
  static async log(input: CreateAuditLogInput): Promise<void> {
    try {
      const data = CreateAuditLogDTO.parse(input);

      if (data.tenantId) {
        await tenantPrisma.auditLog.create({ data });
      } else {
        const { tenantId: _tenantId, ...systemData } = data;
        await systemPrisma.auditLog.create({ data: systemData });
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

  /**
   * Query audit logs. Pass tenantId to query tenant DB, omit for system DB.
   */
  static async getAll(input: GetAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }> {
    const { tenantId, actorId, action, resourceType, resourceId, page, pageSize } =
      GetAuditLogsDTO.parse(input);

    const where: Record<string, unknown> = {};
    if (actorId)      where.actorId      = actorId;
    if (action)       where.action       = { contains: action, mode: 'insensitive' };
    if (resourceType) where.resourceType = resourceType;
    if (resourceId)   where.resourceId   = resourceId;

    if (tenantId) {
      where.tenantId = tenantId;
      const [rows, total] = await Promise.all([
        tenantPrisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tenantPrisma.auditLog.count({ where }),
      ]);
      return { logs: rows.map((row: Record<string, unknown>) => AuditLogSchema.parse(row)), total };
    }

    const [rows, total] = await Promise.all([
      systemPrisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      systemPrisma.auditLog.count({ where }),
    ]);
    return { logs: rows.map((row: Record<string, unknown>) => AuditLogSchema.parse(row)), total };
  }

  /**
   * Extract IP address and User-Agent from a Next.js request.
   */
  static extractRequestContext(req: NextRequest): { ipAddress: string | null; userAgent: string | null } {
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      null;
    const userAgent = req.headers.get('user-agent') ?? null;
    return { ipAddress, userAgent };
  }
}
