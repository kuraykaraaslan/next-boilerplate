import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/modules/payment/payment.service";
import { GetProviderStatusRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/modules_next/limiter/limiter.service.next";

import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
/**
 * POST /tenant/[tenantId]/api/payments/provider-status
 */
export async function POST(
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
    const body = await request.json();
    const parsed = GetProviderStatusRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const status = await PaymentService.getProviderStatus(parsed.data);
    return NextResponse.json({ status }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
