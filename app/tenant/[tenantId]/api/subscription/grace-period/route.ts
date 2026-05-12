import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  const { tenantId } = await params;

  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });
    const status = await TenantSubscriptionService.getGracePeriodStatus(tenantId);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch grace period status';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
