import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { TermsConsentService, UpdateBannerConfigDTO } from '@nb/terms_consent';

/**
 * GET /tenant/[tenantId]/api/consent/config
 * PUBLIC — banner configuration so the consent banner can render for any visitor.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    return NextResponse.json({ config: await TermsConsentService.getBannerConfig(tenantId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * PATCH /tenant/[tenantId]/api/consent/config
 * ADMIN — update the banner configuration.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = UpdateBannerConfigDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ config: await TermsConsentService.updateBannerConfig(tenantId, parsed.data, user.userId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
