import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { CreatePlanRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'

/**
 * GET /tenant/[tenantId]/api/plans
 * Lists this tenant's subscription plan catalog (admin only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params
    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const includeFeatures = searchParams.get('includeFeatures') === 'true'

    const plans = includeFeatures
      ? await TenantSubscriptionService.getPlansWithFeatures(tenantId, status || undefined)
      : await TenantSubscriptionService.getPlans(tenantId, status || undefined)

    return NextResponse.json({ success: true, plans })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /tenant/[tenantId]/api/plans
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params
    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
    const body = await request.json()
    const parsed = CreatePlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const plan = await TenantSubscriptionService.createPlan(tenantId, parsed.data)
    return NextResponse.json({ success: true, plan }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED },
      { status: 500 }
    )
  }
}
