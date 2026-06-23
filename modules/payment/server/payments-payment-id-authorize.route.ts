import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import PaymentService from '@kuraykaraaslan/payment/server/payment.service';

type Ctx = { params: Promise<{ tenantId: string; paymentId: string }> };

/** POST /tenant/[tenantId]/api/payments/[paymentId]/authorize — PENDING -> PROCESSING (authorized). */
export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  const { tenantId, paymentId } = await params;
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }); }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }); }
  try {
    const item = await PaymentService.authorize(tenantId, paymentId);
    return NextResponse.json({ item });
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }); }
}
