import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import GiftCardService from '@kuraykaraaslan/gift_card/server/gift_card.service';
import { CheckBalanceRequestSchema } from '@kuraykaraaslan/gift_card/server/gift_card.dto';
import { GIFT_CARD_MESSAGES } from '@kuraykaraaslan/gift_card/server/gift_card.messages';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

/**
 * POST /tenant/[tenantId]/api/gift-cards/balance
 * Read-only balance lookup for a gift card code (authenticated user).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'USER',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CheckBalanceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const balance = await GiftCardService.checkBalance(tenantId, parsed.data.code);
    return NextResponse.json({ success: true, balance });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.INVALID_CODE },
      { status: error.statusCode || 500 },
    );
  }
}
