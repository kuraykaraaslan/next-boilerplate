import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@kuraykaraaslan/invoice/server/invoice.service';
import InvoiceMessages from '@kuraykaraaslan/invoice/server/invoice.messages';

type Params = { params: Promise<{ tenantId: string; invoiceId: string }> };

/** POST /tenant/[tenantId]/api/invoices/[invoiceId]/issue — draft → issued + regional submit. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, invoiceId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const invoice = await InvoiceService.issue(tenantId, invoiceId);
    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    const status =
      error.message === InvoiceMessages.NOT_FOUND ? 404
      : error.message === InvoiceMessages.ALREADY_ISSUED ? 409
      : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? InvoiceMessages.ISSUE_FAILED },
      { status },
    );
  }
}
