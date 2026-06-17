import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import InvoiceService from '@kuraykaraaslan/invoice/server/invoice.service';
import { CreateInvoiceInputSchema } from '@kuraykaraaslan/invoice/server/invoice.types';
import InvoiceMessages from '@kuraykaraaslan/invoice/server/invoice.messages';
import { withIdempotency } from '@kuraykaraaslan/redis_idempotency/server/withIdempotency';

/**
 * GET /tenant/[tenantId]/api/invoices?status=&page=&pageSize=
 * POST /tenant/[tenantId]/api/invoices
 *
 * Admin-only; tenant-scoped. Feature gated by FEATURE_INVOICING inside
 * InvoiceService.create — caller will get a clean 402 if the plan does not
 * include invoicing.
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

    const url = new URL(request.url);
    const result = await InvoiceService.list(tenantId, {
      page: Number(url.searchParams.get('page') ?? 0),
      pageSize: Number(url.searchParams.get('pageSize') ?? 20),
      status: url.searchParams.get('status') ?? undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message ?? InvoiceMessages.FETCH_FAILED },
      { status: 500 },
    );
  }
}

export const POST = withIdempotency(async function POST(
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

    const body = await request.json();
    const parsed = CreateInvoiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const invoice = await InvoiceService.create(tenantId, parsed.data);
    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error: any) {
    const status = /feature/i.test(error.message) ? 402 : 500;
    return NextResponse.json(
      { success: false, message: error.message ?? InvoiceMessages.CREATE_FAILED },
      { status },
    );
  }
})
