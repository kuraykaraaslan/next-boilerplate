import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { AgreementService } from '@/modules/terms_consent';

type Ctx = { params: Promise<{ tenantId: string; agreementId: string; versionId: string }> };

/** POST …/versions/[versionId]/publish — freeze + make this version current (admin). */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, agreementId, versionId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    return NextResponse.json({ version: await AgreementService.publishVersion(tenantId, agreementId, versionId, user.userId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
