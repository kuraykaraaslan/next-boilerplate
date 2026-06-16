import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { AgreementService, UpdateAgreementDTO } from '@nb/terms_consent';

type Ctx = { params: Promise<{ tenantId: string; agreementId: string }> };

/** GET /tenant/[tenantId]/api/agreements/[agreementId] — agreement + its versions (admin). */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, agreementId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const [agreement, versions] = await Promise.all([
      AgreementService.get(tenantId, agreementId),
      AgreementService.listVersions(tenantId, agreementId),
    ]);
    return NextResponse.json({ agreement, versions }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/** PATCH /tenant/[tenantId]/api/agreements/[agreementId] — update an agreement (admin). */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, agreementId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = UpdateAgreementDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ agreement: await AgreementService.update(tenantId, agreementId, parsed.data, user.userId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
