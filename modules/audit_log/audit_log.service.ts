import { NextRequest } from 'next/server';
import { prisma } from '@/libs/prisma';
import type { Prisma } from '@/prisma/client';
import Logger from '@/libs/logger';
import { AuditLogSchema, type AuditLog } from './audit_log.types';
import { CreateAuditLogDTO, GetAuditLogsDTO, type CreateAuditLogInput, type GetAuditLogsInput } from './audit_log.dto';

export default class AuditLogService {

  /**
   * Record an audit event.
   * Fire-and-forget: never throws, never blocks the caller.
   */
  static async log(input: CreateAuditLogInput): Promise<void> {
    try {
      const data = CreateAuditLogDTO.parse(input);

      await prisma.auditLog.create({ data });

      Logger.info(
        `[AUDIT] ${data.actorType}:${data.actorId ?? 'system'} → ${data.action}` +
        (data.resourceType ? ` on ${data.resourceType}:${data.resourceId ?? '?'}` : '') +
        (data.tenantId ? ` [tenant:${data.tenantId}]` : '')
      );
    } catch (err: any) {
      // Audit log must never break the main flow
      Logger.error(`[AUDIT] Failed to write audit log: ${err?.message}`);
    }
  }

  /**
   * Query audit logs with optional filters and pagination.
   */
  static async getAll(input: GetAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }> {
    const { tenantId, actorId, action, resourceType, resourceId, page, pageSize } =
      GetAuditLogsDTO.parse(input);

    const where: Prisma.AuditLogWhereInput = {};

    if (tenantId !== undefined) where.tenantId = tenantId;
    if (actorId)      where.actorId      = actorId;
    if (action)       where.action       = { contains: action, mode: 'insensitive' };
    if (resourceType) where.resourceType = resourceType;
    if (resourceId)   where.resourceId   = resourceId;

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: rows.map(row => AuditLogSchema.parse(row)),
      total,
    };
  }

  /**
   * Extract IP address and User-Agent from a Next.js request.
   * Use the result as `ipAddress` / `userAgent` when calling log().
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
