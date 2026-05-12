// path: app/tenant/[tenantId]/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import AuthService from "@/modules/auth/auth.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantService from "@/modules/tenant/tenant.service";
import Limiter from "@/libs/limiter";
import { LoginDTO } from "@/modules/auth/auth.dto";
import MailService from "@/modules/notification_mail/notification_mail.service";
import { SafeUserSecuritySchema } from '@/modules/user_security/user_security.types';
import AuthMessages from "@/modules/auth/auth.messages";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const _rl = await Limiter.useRateLimit(request, 'auth');

    if (_rl) return _rl;
    // Verify tenant exists and is active
    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({
        error: 'Tenant not found or inactive'
      }, { status: 404 });
    }

    const parsedData = LoginDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        error: parsedData.error.issues
      }, { status: 400 });
    }

    const { email, password } = parsedData.data;

    const { user } = await AuthService.login({ email, password });

    if (!user) {
      throw new Error(AuthMessages.INVALID_CREDENTIALS);
    }

    // Check if user is a member of this tenant
    const tenantMember = await TenantMemberService.getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId });
    if (!tenantMember || tenantMember.memberStatus !== 'ACTIVE') {
      return NextResponse.json({
        error: 'You are not a member of this organization'
      }, { status: 403 });
    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    const { userSession, rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user,
      request,
      userSecurity,
      otpIgnore: false,
    });

    const response = NextResponse.json({
      user,
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
      },
      tenantMember: {
        memberRole: tenantMember.memberRole,
      },
      userSecurity: SafeUserSecuritySchema.parse(userSecurity),
    }, {
      status: 200,
    });

    // Determine if we're in a secure context (HTTPS)
    const origin = request.headers.get('origin') || '';
    const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
    const isSecure = origin.startsWith('https://') || protocol === 'https';

    const cookieOptions = isSecure ? {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    } : {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set('accessToken', rawAccessToken, cookieOptions);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOptions);

    try {
      await MailService.sendNewLoginEmail({ email: user.email });
    } catch (emailError) {
      // Ignored error for sending login email
    }

    return response;

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
