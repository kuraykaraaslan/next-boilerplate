import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import PaymentService from '@kuraykaraaslan/payment/server/payment.service';
import { PaymentProviderEnum } from '@kuraykaraaslan/payment/server/payment.enums';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

const BinCheckRequestSchema = z.object({
  bin: z.string().regex(/^\d{6,8}$/, 'BIN must be 6–8 digits'),
  provider: PaymentProviderEnum.optional(),
});

/**
 * POST /tenant/[tenantId]/api/payments/bin-check
 * Look up a card BIN (brand / bank / country / Turkish?) for the live checkout
 * preview. Tenant admins only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const parsed = BinCheckRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const result = await PaymentService.checkBin(tenantId, parsed.data.bin, parsed.data.provider);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
