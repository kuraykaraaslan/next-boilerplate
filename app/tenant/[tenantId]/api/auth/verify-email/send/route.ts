// path: app/tenant/[tenantId]/api/auth/verify-email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import AuthService from "@/modules/auth/auth.service";
import TenantService from "@/modules/tenant/tenant.service";
import AuthMessages from "@/modules/auth/auth.messages";

/**
 * Email verification is an onboarding endpoint — the user may not yet be a
 * member of this tenant when verifying their address (especially during
 * self-registration). We only validate that the tenant exists and that the
 * caller is authenticated; tenant membership is NOT required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    await UserSessionNextService.authenticateUserByRequest({ request });

    const userId = request.user?.userId;
    const email = request.user?.email;

    if (!userId || !email) {
      return NextResponse.json({ error: AuthMessages.USER_NOT_AUTHENTICATED }, { status: 401 });
    }

    await AuthService.sendEmailVerification({ userId, email });

    return NextResponse.json({ message: AuthMessages.EMAIL_VERIFICATION_SENT }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
