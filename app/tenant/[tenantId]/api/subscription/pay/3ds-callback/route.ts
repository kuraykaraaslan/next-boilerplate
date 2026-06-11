import { NextRequest, NextResponse } from 'next/server';
import TenantCardCheckoutService from '@/modules/tenant_subscription/tenant_subscription.card.service';
import PaymentService from '@/modules/payment/payment.service';
import Logger from '@/modules/logger';

/**
 * POST /tenant/[tenantId]/api/subscription/pay/3ds-callback
 *
 * Bank/iyzico return URL after the 3D Secure challenge. **Unauthenticated** (the
 * caller is the bank, not our admin) — instead it is protected by the unguessable
 * `conversationId` (= our paymentId UUID) and a server-side re-validation against
 * iyzico (`/payment/3dsecure/auth`), so a success cannot be forged.
 *
 * On success the subscription is activated and the browser is redirected back to
 * the subscription page (where the existing, idempotent confirm/refresh runs).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}/tenant/${tenantId}/admin/subscription`;

  const ok = (paymentId: string) =>
    NextResponse.redirect(`${base}?paymentSuccess=true&paymentId=${encodeURIComponent(paymentId)}`, 303);
  const fail = (message?: string) =>
    NextResponse.redirect(`${base}?paymentCancelled=true${message ? `&message=${encodeURIComponent(message)}` : ''}`, 303);

  let conversationId = '';
  try {
    const form = await request.formData();
    conversationId = String(form.get('conversationId') ?? '');
    const providerPaymentId = String(form.get('paymentId') ?? '');
    const status = String(form.get('status') ?? '');
    const mdStatus = String(form.get('mdStatus') ?? '');

    if (!conversationId || !providerPaymentId) {
      return fail();
    }

    // mdStatus '1' = full 3DS auth; anything else is a failed/abandoned challenge.
    if (status !== 'success' || (mdStatus && mdStatus !== '1')) {
      await PaymentService.markAsFailed(conversationId, mdStatus || status).catch(() => {});
      return fail();
    }

    await TenantCardCheckoutService.complete3dsCardPayment({
      tenantId,
      conversationId,
      providerPaymentId,
    });

    return ok(conversationId);
  } catch (error: any) {
    Logger.error(`3DS callback failed (conv ${conversationId}): ${error instanceof Error ? error.message : String(error)}`);
    return fail(error?.message);
  }
}
