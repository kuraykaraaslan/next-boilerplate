import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import TenantFeatureGateService from '@nb/tenant_subscription/server/tenant_subscription.feature.service';
import { SUBSCRIPTION_MESSAGES } from '@nb/tenant_subscription/server/tenant_subscription.messages';
import Limiter from '@nb/limiter/server/limiter.service.next';
import { authenticateAdminRequest } from '@nb/auth/server/auth.admin-guard.next';

const SetDefaultPlanSchema = z.object({
  planId: z.string().uuid().nullable(),
});

/**
 * GET /tenant/[tenantId]/api/plans/default
 * Root-admin: read the currently configured default (free) plan id.
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const defaultPlanId = await TenantFeatureGateService.getDefaultPlanId();
    return NextResponse.json({ success: true, defaultPlanId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 },
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/plans/default
 * Root-admin: set (or clear, with planId=null) the default plan that newly
 * created tenants are auto-assigned. Only a free plan may be set as default.
 */
export async function PUT(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = SetDefaultPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    await TenantFeatureGateService.setDefaultPlanId(parsed.data.planId);
    return NextResponse.json({ success: true, defaultPlanId: parsed.data.planId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to set default plan.' },
      { status: 400 },
    );
  }
}
