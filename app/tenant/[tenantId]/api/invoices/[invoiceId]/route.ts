import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import InvoiceService from '@/modules/invoice/invoice.service';
import InvoiceMessages from '@/modules/invoice/invoice.messages';

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
