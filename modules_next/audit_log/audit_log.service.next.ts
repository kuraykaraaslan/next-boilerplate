import { NextRequest } from 'next/server';
import AuditLogService from '@/modules/audit_log/audit_log.service';

export default class AuditLogNextService extends AuditLogService {

  static extractRequestContext(req: NextRequest): { ipAddress: string | null; userAgent: string | null } {
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      null;
    const userAgent = req.headers.get('user-agent') ?? null;
    return { ipAddress, userAgent };
  }
}
