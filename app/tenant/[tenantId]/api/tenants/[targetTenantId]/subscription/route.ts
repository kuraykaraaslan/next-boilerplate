import { NextRequest, NextResponse } from "next/server";
import TenantSubscriptionService from "@/modules/tenant_subscription/tenant_subscription.service";
import TenantPlanService from "@/modules/tenant_subscription/tenant_subscription.plan.service";
import TenantPlatformPlanService from "@/modules/tenant_subscription/tenant_subscription.platform.service";
import { AssignPlatformPlanRequestSchema } from "@/modules/tenant_subscription/tenant_subscription.dto";
import { SUBSCRIPTION_MESSAGES } from "@/modules/tenant_subscription/tenant_subscription.messages";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { authenticateAdminRequest } from "@/modules_next/auth/auth.admin-guard.next";
import { ROOT_TENANT_ID } from "@/modules/tenant/tenant.constants";
import AuditLogService from "@/modules/audit_log/audit_log.service";

/**
 * GET /tenant/[tenantId]/api/tenants/[targetTenantId]/subscription
 * Root-tenant admin: get a tenant's current subscription plus the platform
 * plans that can be assigned to it for free.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const [subscription, allPlatformPlans] = await Promise.all([
      TenantSubscriptionService.getSubscription(targetTenantId),
      TenantPlanService.getPlansWithFeatures(ROOT_TENANT_ID, "ACTIVE"),
    ]);

    // Only plans whose product still exists are assignable.
    const platformPlans = allPlatformPlans.filter((p) => p.product !== null);

    return NextResponse.json({ subscription, platformPlans }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    );
  }
}

/**
 * POST /tenant/[tenantId]/api/tenants/[targetTenantId]/subscription
 * Root-tenant admin: assign a platform plan to the target tenant for free.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const body = await request.json();
    const parsed = AssignPlatformPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const subscription = await TenantPlatformPlanService.assignPlatformPlan(
      targetTenantId,
      parsed.data
    );

    // Record who granted which plan, to whom, and at what price.
    AuditLogService.log({
      tenantId: targetTenantId,
      actorId: auth.user.userId,
      actorType: "USER",
      action: "subscription.platform_plan.assigned",
      resourceType: "TenantSubscription",
      resourceId: subscription.subscriptionId,
      metadata: {
        sourcePlanId: parsed.data.planId,
        billingInterval: parsed.data.billingInterval ?? null,
        priceOverride: parsed.data.priceOverride ?? null,
        free: true,
      },
    }).catch(() => { /* audit failure must not block the assignment */ });

    return NextResponse.json(
      { subscription, message: "Plan assigned successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED },
      { status: 500 }
    );
  }
}
