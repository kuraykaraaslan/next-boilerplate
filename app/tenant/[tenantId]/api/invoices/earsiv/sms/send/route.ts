import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import InvoiceService from '@/modules/invoice/invoice.service';
import InvoiceMessages from '@/modules/invoice/invoice.messages';

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
