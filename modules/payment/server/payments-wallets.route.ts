import { NextRequest, NextResponse } from 'next/server';
import PaymentService from '@nb/payment/server/payment.service';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';

/**
 * GET /tenant/[tenantId]/api/payments/wallets
 * The wallet / alternative-payment-method capability matrix across all providers
 * (MasterPass, BKM Express, Apple/Google Pay, Click to Pay, …). Drives the checkout UI.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    return NextResponse.json({ success: true, matrix: PaymentService.getWalletMatrix() }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
