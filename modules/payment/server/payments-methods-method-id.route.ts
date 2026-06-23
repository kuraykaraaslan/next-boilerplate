import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import PaymentMethodService from '@kuraykaraaslan/payment/server/payment.method.service';
import { UpdatePaymentMethodDTO } from '@kuraykaraaslan/payment/server/payment.method.dto';

type Ctx = { params: Promise<{ tenantId: string; methodId: string }> };

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  const { tenantId, methodId } = await params;
  try { await auth(request, tenantId); } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }); }
  try {
    const item = await PaymentMethodService.getById(tenantId, methodId);
    return NextResponse.json({ item });
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 404 }); }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  const { tenantId, methodId } = await params;
  try { await auth(request, tenantId); } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }); }
  try {
    const dto = UpdatePaymentMethodDTO.parse(await request.json());
    const item = await PaymentMethodService.update(tenantId, methodId, dto);
    return NextResponse.json({ item });
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }); }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  const { tenantId, methodId } = await params;
  try { await auth(request, tenantId); } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }); }
  try {
    await PaymentMethodService.delete(tenantId, methodId);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }); }
}
