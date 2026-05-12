// path: app/system/api/auth/me/social-accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import UserSocialAccountService from "@/modules/user_social_account/user_social_account.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/auth/me/social-accounts
 * List all linked social accounts for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const accounts = await UserSocialAccountService.getByUserId(user.userId);

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
