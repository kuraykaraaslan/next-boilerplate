// path: app/tenant/[tenantId]/api/auth/verify-email/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";
import UserSessionNextService from "@kuraykaraaslan/user_session/server/user_session.service.next";
import AuthService from "@kuraykaraaslan/auth/server/auth.service";
import TenantService from "@kuraykaraaslan/tenant/server/tenant.service";
import { VerifyEmailDTO } from "@kuraykaraaslan/auth/server/auth.dto";
import AuthMessages from "@kuraykaraaslan/auth/server/auth.messages";

/**
 * Email verification is an onboarding endpoint — tenant membership is NOT
 * required at this stage; we only validate that the addressed tenant exists
 * and that the caller is authenticated.
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

    if (!userId) {
      return NextResponse.json({ error: AuthMessages.USER_NOT_AUTHENTICATED }, { status: 401 });
    }

    const parsedData = VerifyEmailDTO.safeParse(await request.json());

    if (!parsedData.success) {
      return NextResponse.json({
        error: parsedData.error.issues.map(err => err.message).join(", ")
      }, { status: 400 });
    }

    await AuthService.verifyEmail({ userId, token: parsedData.data.token });

    return NextResponse.json({ message: AuthMessages.EMAIL_VERIFIED_SUCCESSFULLY }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
