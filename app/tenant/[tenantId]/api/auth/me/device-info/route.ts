// path: app/tenant/[tenantId]/api/auth/me/device-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import UserAgentService from '@nb/user_agent/server/user_agent.service';
import Limiter from '@nb/limiter/server/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/auth/me/device-info
 * Tenant-scoped /api/auth/me endpoint.
 * Parses the inbound user-agent + IP into a UA and geo block.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const userAgent = request.headers.get('user-agent');
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const { deviceInfo, geoLocation, location } = await UserAgentService.getDeviceAndLocation(userAgent, ip);

    return NextResponse.json({ deviceInfo, geoLocation, location }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
