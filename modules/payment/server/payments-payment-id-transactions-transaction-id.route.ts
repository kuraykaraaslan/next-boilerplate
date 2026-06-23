import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import PaymentService from '@kuraykaraaslan/payment/server/payment.service';
import { UpdateTransactionRequestSchema } from '@kuraykaraaslan/payment/server/payment.dto';

type Ctx = { params: Promise<{ tenantId: string; paymentId: string; transactionId: string }> };

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
}

/** PATCH /tenant/[tenantId]/api/payments/[paymentId]/transactions/[transactionId] */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  const { tenantId, transactionId } = await params;
  try { await auth(request, tenantId); } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }); }
  try {
    const dto = UpdateTransactionRequestSchema.parse(await request.json());
    const item = await PaymentService.updateTransaction(transactionId, dto);
    return NextResponse.json({ item });
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }); }
}

/** DELETE /tenant/[tenantId]/api/payments/[paymentId]/transactions/[transactionId] */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  const { tenantId, transactionId } = await params;
  try { await auth(request, tenantId); } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }); }
  try {
    await PaymentService.deleteTransaction(transactionId);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }); }
}
