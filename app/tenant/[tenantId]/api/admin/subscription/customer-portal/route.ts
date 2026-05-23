import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import PaymentService from '@/modules/payment/payment.service';
import type { PaymentProvider } from '@/modules/payment/payment.enums';
import { z } from 'zod';

const RequestSchema = z.object({
  provider: z.enum(['stripe', 'paypal', 'iyzico', 'cloudpayments', 'alipay', 'wechatpay', 'yookassa']).optional(),
  customerEmail: z.string().email().optional(),
  customerExternalId: z.string().optional(),
  returnUrl: z.string().url(),
});

/**
 * POST /tenant/[tenantId]/api/admin/subscription/customer-portal
 *
 * Provider-agnostic self-service portal. Each tenant's chosen payment
 * provider (Stripe → billing.portal.sessions, PayPal → subscription mgmt,
 * Iyzico/CloudPayments → no portal yet) returns a hosted URL. When the
 * provider can't deliver one, we surface a clear note so the UI can fall
 * back to in-app cancel/upgrade.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request, tenantId, requiredTenantRole: 'ADMIN',
    });

    const body = await request.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }
    const { provider, customerEmail, customerExternalId, returnUrl } = parsed.data;

    const result = await PaymentService.createCustomerPortalSession(tenantId, {
      provider: provider as PaymentProvider | undefined,
      customerEmail: customerEmail ?? user.email,
      customerExternalId,
      returnUrl,
    });

    if (!result.url) {
      return NextResponse.json(
        { success: false, message: result.note ?? 'Provider does not offer a customer portal', portal: null },
        { status: 501 },
      );
    }
    return NextResponse.json({ success: true, portal: { url: result.url, provider: result.provider } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message ?? 'Customer portal failed' },
      { status: 500 },
    );
  }
}
