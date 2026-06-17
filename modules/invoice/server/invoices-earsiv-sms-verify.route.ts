import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@kuraykaraaslan/invoice/server/invoice.service';
import InvoiceMessages from '@kuraykaraaslan/invoice/server/invoice.messages';

type Params = { params: Promise<{ tenantId: string }> };

/**
 * POST /tenant/[tenantId]/api/invoices/earsiv/sms/verify
 * Step 2 of e-Arşiv finalisation — verifies the OTP and signs the unsigned
 * drafts. Body: { oid, code, invoiceIds? }. Omitting invoiceIds signs all
 * 'submitted' (created-but-unsigned) TR invoices.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const body = await request.json().catch(() => ({}));
    const oid = typeof body?.oid === 'string' ? body.oid : '';
    const code = typeof body?.code === 'string' ? body.code : '';
    const invoiceIds = Array.isArray(body?.invoiceIds)
      ? body.invoiceIds.filter((x: unknown): x is string => typeof x === 'string')
      : undefined;

    if (!oid || !code) {
      return NextResponse.json({ success: false, message: 'oid and code are required' }, { status: 400 });
    }

    const result = await InvoiceService.confirmEarsivSms(tenantId, oid, code, invoiceIds);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const status =
      error.message === InvoiceMessages.EARSIV_NOT_GIB_DIRECT ? 400
      : error.message === InvoiceMessages.EARSIV_NOT_CONFIGURED ? 400
      : error.message === InvoiceMessages.EARSIV_NO_DRAFTS ? 404
      : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? InvoiceMessages.EARSIV_SMS_VERIFY_FAILED },
      { status },
    );
  }
}
