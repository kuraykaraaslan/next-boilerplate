import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
// path: app/tenant/[tenantId]/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionService from "@kuraykaraaslan/user_session/server/user_session.service";
import AuthMessages from "@kuraykaraaslan/auth/server/auth.messages";
import { RefreshTokenDTO } from "@kuraykaraaslan/auth/server/auth.dto";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: AuthMessages.INVALID_TOKEN }, { status: 401 });
  }

  const parsedData = RefreshTokenDTO.safeParse({ refreshToken });

  if (!parsedData.success) {
    return NextResponse.json({
      message: parsedData.error.issues.map((err: any) => err.message).join(", ")
    }, { status: 400 });
  }

  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

        const { rawAccessToken, rawRefreshToken } = await UserSessionService.refreshTokens(refreshToken);

    const response = NextResponse.json({ message: AuthMessages.TOKENS_REFRESHED_SUCCESSFULLY });

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

    response.cookies.set("accessToken", rawAccessToken, cookieOptions);
    response.cookies.set("refreshToken", rawRefreshToken, cookieOptions);

    return response;

  } catch (e: any) {
    return NextResponse.json({ message: e.message || AuthMessages.INVALID_TOKEN }, { status: 500 });
  }
}
