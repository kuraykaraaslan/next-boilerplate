import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { AgreementService, CreateVersionDTO } from '@kuraykaraaslan/terms_consent';

type Ctx = { params: Promise<{ tenantId: string; agreementId: string }> };

/** GET …/agreements/[agreementId]/versions — list versions (admin). */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, agreementId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    return NextResponse.json({ data: await AgreementService.listVersions(tenantId, agreementId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/** POST …/agreements/[agreementId]/versions — create a draft version (admin). */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, agreementId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = CreateVersionDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ version: await AgreementService.createVersion(tenantId, agreementId, parsed.data, user.userId) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
