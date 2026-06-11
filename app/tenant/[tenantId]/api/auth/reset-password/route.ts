// path: app/tenant/[tenantId]/api/auth/reset-password/route.ts
import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import PasswordService from "@/modules/auth/auth.password.service";
import TenantService from "@/modules/tenant/tenant.service";
import { ResetPasswordDTO } from "@/modules/auth/auth.dto";
import AuthMessages from "@/modules/auth/auth.messages";

/**
 * Password reset is an onboarding/recovery endpoint — the caller is not
 * yet authenticated, so per-tenant membership cannot be enforced. We only
 * validate that the addressed tenant exists and is active.
 */
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

    const { email, resetToken, password } = await request.json();

    const parsedData = ResetPasswordDTO.safeParse({ email, resetToken, newPassword: password });

    if (!parsedData.success) {
      return NextResponse.json({
        error: parsedData.error.issues.map(err => err.message).join(", ")
      }, { status: 400 });
    }

    await PasswordService.resetPassword({ ...parsedData.data, tenantId });

    const response = NextResponse.json({
      message: AuthMessages.PASSWORD_RESET_SUCCESSFUL,
    }, {
      status: 200,
    });

    // Determine if we're in a secure context (HTTPS)
    const origin = request.headers.get('origin') || '';
    const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
    const isSecure = origin.startsWith('https://') || protocol === 'https';

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' as const : 'lax' as const,
      path: '/',
      maxAge: 0,
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' as const : 'lax' as const,
      path: '/',
      maxAge: 0,
    });

    return response;

  } catch (error: any) {
    Logger.error(error);
    return NextResponse.json({ error: AuthMessages.PASSWORD_RESET_FAILED }, { status: 500 });
  }
}
