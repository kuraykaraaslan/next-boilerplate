import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@nb/invoice/server/invoice.service';
import InvoiceMessages from '@nb/invoice/server/invoice.messages';

type Params = { params: Promise<{ tenantId: string }> };

/**
 * POST /tenant/[tenantId]/api/invoices/earsiv/sms/send
 * Step 1 of e-Arşiv finalisation — asks the GİB portal to SMS an OTP to the
 * account's registered phone. Returns the `oid` to pass back to /verify.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const { oid } = await InvoiceService.requestEarsivSms(tenantId);
    return NextResponse.json({ success: true, oid });
  } catch (error: any) {
    const status =
      error.message === InvoiceMessages.EARSIV_NOT_GIB_DIRECT ? 400
      : error.message === InvoiceMessages.EARSIV_NOT_CONFIGURED ? 400
      : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? InvoiceMessages.EARSIV_SMS_SEND_FAILED },
      { status },
    );
  }
}
