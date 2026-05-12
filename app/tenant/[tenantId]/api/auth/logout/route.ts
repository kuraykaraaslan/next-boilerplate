// path: app/tenant/[tenantId]/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    
    const { tenantId } = await params;

    const _rl = await Limiter.checkRateLimit(request);

    if (_rl) return _rl;
    await UserSessionNextService.logout({ request });

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });

    // Clear cookies
    response.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });

    return response;

  } catch (error: any) {
    // Even if there's an error, clear the cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out'
    }, { status: 200 });

    response.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });

    return response;
  }
}
