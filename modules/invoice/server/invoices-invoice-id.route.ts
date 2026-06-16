import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@nb/invoice/server/invoice.service';
import InvoiceMessages from '@nb/invoice/server/invoice.messages';

type Params = { params: Promise<{ tenantId: string; invoiceId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, invoiceId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const [invoice, lines] = await Promise.all([
      InvoiceService.getById(tenantId, invoiceId),
      InvoiceService.getLines(tenantId, invoiceId),
    ]);
    return NextResponse.json({ success: true, invoice, lines });
  } catch (error: any) {
    const status = error.message === InvoiceMessages.NOT_FOUND ? 404 : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? InvoiceMessages.FETCH_FAILED },
      { status },
    );
  }
}
