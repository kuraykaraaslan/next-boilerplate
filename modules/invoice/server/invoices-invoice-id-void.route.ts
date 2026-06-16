import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@nb/invoice/server/invoice.service';
import InvoiceMessages from '@nb/invoice/server/invoice.messages';

type Params = { params: Promise<{ tenantId: string; invoiceId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, invoiceId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : undefined;

    const invoice = await InvoiceService.markVoid(tenantId, invoiceId, reason);
    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    const status =
      error.message === InvoiceMessages.NOT_FOUND ? 404
      : error.message === InvoiceMessages.CANNOT_VOID_PAID ? 409
      : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? 'Void failed' },
      { status },
    );
  }
}
