import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { WalletService } from '@/modules/wallet';

/**
 * GET /tenant/[tenantId]/api/wallet/accounts/[accountId]
 * Fetch a single wallet account (admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; accountId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, accountId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    return NextResponse.json({ account: await WalletService.getAccount(tenantId, accountId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
