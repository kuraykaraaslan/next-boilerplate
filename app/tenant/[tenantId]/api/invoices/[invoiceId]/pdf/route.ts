import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import InvoicePdfService from '@/modules/invoice/invoice.pdf.service';
import InvoiceService from '@/modules/invoice/invoice.service';
import InvoiceMessages from '@/modules/invoice/invoice.messages';

type Params = { params: Promise<{ tenantId: string; invoiceId: string }> };

/** GET /tenant/[tenantId]/api/invoices/[invoiceId]/pdf — stream the PDF. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, invoiceId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const invoice = await InvoiceService.getById(tenantId, invoiceId);
    const buffer = await InvoicePdfService.render(tenantId, invoiceId);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: any) {
    const status = error.message === InvoiceMessages.NOT_FOUND ? 404
      : error.message === InvoiceMessages.PROVIDER_PDF_UNAVAILABLE ? 502
      : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? 'PDF render failed' },
      { status },
    );
  }
}
