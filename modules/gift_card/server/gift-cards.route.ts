import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import GiftCardService from '@kuraykaraaslan/gift_card/server/gift_card.service';
import { IssueGiftCardRequestSchema, GetGiftCardsQuerySchema } from '@kuraykaraaslan/gift_card/server/gift_card.dto';
import { GIFT_CARD_MESSAGES } from '@kuraykaraaslan/gift_card/server/gift_card.messages';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

/**
 * GET /tenant/[tenantId]/api/gift-cards
 * Lists this tenant's gift cards (admin only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = GetGiftCardsQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      status: searchParams.get('status') || undefined,
      purchaserUserId: searchParams.get('purchaserUserId') || undefined,
      search: searchParams.get('search') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const result = await GiftCardService.getAll(tenantId, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.FETCH_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * POST /tenant/[tenantId]/api/gift-cards
 * Issues one or more gift cards (admin only). Raw codes are returned once.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = IssueGiftCardRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const result = await GiftCardService.issue(tenantId, parsed.data);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || GIFT_CARD_MESSAGES.CREATE_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
