import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/modules/payment/payment.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";

import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
/**
 * GET /tenant/[tenantId]/api/payments/providers
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
    return NextResponse.json({
      providers: PaymentService.getAvailableProviders(),
      default: PaymentService.getDefaultProvider(),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
