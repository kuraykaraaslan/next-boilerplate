import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { WalletService } from '@nb/wallet';

/**
 * POST /tenant/[tenantId]/api/wallet/verify
 * Verify the per-account hash chain and reconcile balances (admin).
 * Optional body: { accountId?, currency? }.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = (await request.json().catch(() => ({}))) as { accountId?: string; currency?: string };
    const [chain, reconciliation] = await Promise.all([
      WalletService.verifyChain(tenantId, body.accountId),
      WalletService.reconcile(tenantId, body.currency),
    ]);
    return NextResponse.json({ chain, reconciliation }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
