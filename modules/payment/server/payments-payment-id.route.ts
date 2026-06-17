import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@kuraykaraaslan/payment/server/payment.service";
import TenantPlanService from "@kuraykaraaslan/tenant_subscription/server/tenant_subscription.plan.service";
import { UpdatePaymentRequestSchema } from "@kuraykaraaslan/payment/server/payment.dto";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

/**
 * Resolve "what is this payment for" from its metadata: a subscription (plan +
 * product name), a store sale (order), or a plain payment. Best-effort — a deleted
 * plan just degrades to the stored description.
 */
async function buildPaymentSubject(routeTenantId: string, payment: { description?: string | null; metadata?: unknown }) {
  const md = (payment.metadata ?? {}) as Record<string, unknown>;
  const type = typeof md.type === 'string' ? md.type : undefined;

  if (type === 'subscription') {
    const subject: {
      kind: 'SUBSCRIPTION'; label: string; title: string | null;
      planId?: string; productName?: string | null; billingInterval?: string;
    } = {
      kind: 'SUBSCRIPTION',
      label: 'Subscription',
      title: payment.description ?? null,
      planId: typeof md.planId === 'string' ? md.planId : undefined,
      billingInterval: typeof md.billingInterval === 'string' ? md.billingInterval : undefined,
    };
    const planTenantId = (typeof md.tenantId === 'string' && md.tenantId) || routeTenantId;
    if (subject.planId) {
      try {
        const plan = await TenantPlanService.getPlanById(planTenantId, subject.planId);
        subject.productName = plan.product?.name ?? null;
        if (plan.product?.name) {
          subject.title = `${plan.product.name}${subject.billingInterval ? ` (${subject.billingInterval.toLowerCase()})` : ''}`;
        }
      } catch { /* plan/product may have been deleted — keep the description */ }
    }
    return subject;
  }

  if (type === 'store_sale') {
    return {
      kind: 'STORE_SALE' as const,
      label: 'Store sale',
      title: payment.description ?? null,
      orderId: typeof md.orderId === 'string' ? md.orderId : undefined,
    };
  }

  return { kind: 'OTHER' as const, label: 'Payment', title: payment.description ?? null };
}
/**
 * GET /tenant/[tenantId]/api/payments/[paymentId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, paymentId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    const payment = await PaymentService.getByIdWithTransactions(paymentId);
    const subject = await buildPaymentSubject(tenantId, payment);
    return NextResponse.json({ payment, subject }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /tenant/[tenantId]/api/payments/[paymentId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, paymentId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    const body = await request.json();
    const parsed = UpdatePaymentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const payment = await PaymentService.update(paymentId, parsed.data);
    return NextResponse.json({ payment }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/payments/[paymentId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, paymentId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    await PaymentService.delete(paymentId);
    return NextResponse.json({ message: "Payment deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
