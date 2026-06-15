import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import GiftCardService from '@/modules/gift_card/gift_card.service';
import { GIFT_CARD_MESSAGES } from '@/modules/gift_card/gift_card.messages';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';

type Params = { params: Promise<{ tenantId: string; giftCardId: string }> };

/** GET /tenant/[tenantId]/api/gift-cards/[giftCardId]/transactions (admin). */
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

    const transactions = await GiftCardService.listTransactions(tenantId, giftCardId);
    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.FETCH_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
