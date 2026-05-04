// path: app/system/api/auth/me/social-accounts/[provider]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserSocialAccountService from "@/modules/user_social_account/user_social_account.service";
import { SocialAccountProviderEnum } from "@/modules/user_social_account/user_social_account.enums";
import Limiter from "@/libs/limiter";

/**
 * DELETE /system/api/auth/me/social-accounts/[provider]
 * Unlink a social account provider for the current user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);

    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const { provider } = await params;

    const parsed = SocialAccountProviderEnum.safeParse(provider);
    if (!parsed.success) {
      return NextResponse.json({ message: `Invalid provider: ${provider}` }, { status: 400 });
    }

    await UserSocialAccountService.unlink(user.userId, parsed.data);

    return NextResponse.json({ message: `${provider} account unlinked` }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
