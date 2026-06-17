import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import GiftCardService from '@kuraykaraaslan/gift_card/server/gift_card.service';
import { AdjustGiftCardRequestSchema } from '@kuraykaraaslan/gift_card/server/gift_card.dto';
import { GIFT_CARD_MESSAGES } from '@kuraykaraaslan/gift_card/server/gift_card.messages';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

type Params = { params: Promise<{ tenantId: string; giftCardId: string }> };

/** GET /tenant/[tenantId]/api/gift-cards/[giftCardId] */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId, giftCardId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const giftCard = await GiftCardService.getById(tenantId, giftCardId);
    return NextResponse.json({ success: true, giftCard });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.FETCH_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}

/** PATCH /tenant/[tenantId]/api/gift-cards/[giftCardId] — adjust balance (admin). */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, giftCardId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = AdjustGiftCardRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const giftCard = await GiftCardService.adjust(tenantId, giftCardId, parsed.data);
    return NextResponse.json({ success: true, giftCard });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.ADJUST_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}

/** DELETE /tenant/[tenantId]/api/gift-cards/[giftCardId] — void (admin). */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, giftCardId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const giftCard = await GiftCardService.void(tenantId, giftCardId);
    return NextResponse.json({ success: true, giftCard });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.VOID_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
