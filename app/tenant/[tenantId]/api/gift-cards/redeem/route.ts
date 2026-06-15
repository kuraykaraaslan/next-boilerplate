import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import GiftCardService from '@/modules/gift_card/gift_card.service';
import { RedeemGiftCardRequestSchema } from '@/modules/gift_card/gift_card.dto';
import { GIFT_CARD_MESSAGES } from '@/modules/gift_card/gift_card.messages';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { withIdempotency } from '@/modules_next/redis_idempotency/withIdempotency';

/**
 * POST /tenant/[tenantId]/api/gift-cards/redeem
 * Redeem a gift card code into the authenticated user's wallet. Idempotent via
 * the `Idempotency-Key` header.
 */
export const POST = withIdempotency(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params;
    let user: { userId: string };
    try {
      const session = await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'USER',
      });
      user = session.user;
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = RedeemGiftCardRequestSchema.safeParse({ ...body, userId: user.userId });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const result = await GiftCardService.redeem(tenantId, parsed.data);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.REDEEM_FAILED },
      { status: error.statusCode || 500 },
    );
  }
});
