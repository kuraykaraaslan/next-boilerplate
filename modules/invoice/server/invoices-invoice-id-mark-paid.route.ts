import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@nb/invoice/server/invoice.service';
import InvoiceMessages from '@nb/invoice/server/invoice.messages';

type Params = { params: Promise<{ tenantId: string; invoiceId: string }> };

/** Manual mark-paid for offline / bank-transfer settlement. Stripe webhooks
 *  auto-mark paid; this endpoint is for cases where the admin received funds
 *  out of band. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, invoiceId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const body = await request.json().catch(() => ({}));
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : undefined;

    const invoice = await InvoiceService.markPaid(tenantId, invoiceId, paymentId);
    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    const status = error.message === InvoiceMessages.NOT_FOUND ? 404 : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? 'Mark-paid failed' },
      { status },
    );
  }
}
