import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from "next/server";
import UserSessionService from "@/modules/user_session/user_session.service";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";
import { RefreshTokenDTO } from "@/modules/auth/auth.dto";

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

    response.cookies.set("accessToken", rawAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    response.cookies.set("refreshToken", rawRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return response;

  } catch (e: any) {
    return NextResponse.json({ message: e.message || AuthMessages.INVALID_TOKEN }, { status: 500 });
  }
}