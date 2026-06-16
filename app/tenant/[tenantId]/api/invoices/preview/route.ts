import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import InvoicePdfService from '@nb/invoice/server/invoice.pdf.service';

/**
 * GET /tenant/[tenantId]/api/invoices/preview — render a sample invoice
 * with the tenant's current PDF template settings. Used by the Settings
 * → Invoice Template UI for live preview.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const buffer = await InvoicePdfService.renderPreview(tenantId);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="invoice-preview.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message ?? 'Preview render failed' },
      { status: 500 },
    );
  }
}
