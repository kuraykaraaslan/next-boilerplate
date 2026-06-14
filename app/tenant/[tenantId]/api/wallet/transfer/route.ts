import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { WalletService, TransferCreditsDTO } from '@/modules/wallet';

/**
 * POST /tenant/[tenantId]/api/wallet/transfer
 * Peer-to-peer credit transfer. The authenticated user is always the sender;
 * the body supplies the recipient and amount.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = TransferCreditsDTO.safeParse({ ...body, fromUserId: user.userId });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ transaction: await WalletService.transfer(tenantId, parsed.data) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
