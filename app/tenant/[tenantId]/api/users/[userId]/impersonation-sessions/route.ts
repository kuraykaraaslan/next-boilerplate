import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Not, IsNull, MoreThan } from 'typeorm';
import { authenticateAdminRequest } from '@/modules_next/auth/auth.admin-guard.next';
import { getDataSource } from '@/modules/db';
import { UserSession as UserSessionEntity } from '@/modules/user_session/entities/user_session.entity';
import { SafeUserSessionSchema } from '@/modules/user_session/user_session.types';

// GET /tenant/[tenantId]/api/users/[userId]/impersonation-sessions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { userId } = await params;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    const where: Record<string, unknown> = {
      userId,
      metadata: Not(IsNull()),
    };
    if (activeOnly) where.sessionExpiry = MoreThan(new Date());

    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);

    const [sessions, total] = await Promise.all([
      repo.find({ where: where as any, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize }),
      repo.count({ where: where as any }),
    ]);

    return NextResponse.json({
      sessions: sessions.map((s) => SafeUserSessionSchema.parse(s)),
      total,
      page,
      pageSize,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
