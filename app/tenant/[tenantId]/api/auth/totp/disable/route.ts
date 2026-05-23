// path: app/tenant/[tenantId]/api/auth/totp/disable/route.ts
import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import TOTPService from "@/modules/auth/auth.totp.service";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantService from "@/modules/tenant/tenant.service";
import AuthMessages from "@/modules/auth/auth.messages";
import { TOTPDisableDTO } from "@/modules/auth/auth.dto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const tenantMember = await TenantMemberService.getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId });
    if (!tenantMember || tenantMember.memberStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    const body = await request.json();

    const parsedData = TOTPDisableDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { otpToken } = parsedData.data;

    await TOTPService.disable({ user, otpToken });

    return NextResponse.json({ message: AuthMessages.TOTP_DISABLED_SUCCESSFULLY });
  } catch (err: any) {
    Logger.error("TOTP Disable Error:", err);
    return NextResponse.json({ message: err.message || AuthMessages.TOTP_DISABLE_FAILED }, { status: 500 });
  }
}
