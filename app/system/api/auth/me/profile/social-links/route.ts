// path: app/system/api/auth/me/profile/social-links/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserProfileService from "@/modules/user_profile/user_profile.service";
import { SocialLinkItemSchema } from "@/modules/user_profile/user_profile.types";
import Limiter from "@/libs/limiter";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const AddSocialLinkDTO = z.object({
  platform: SocialLinkItemSchema.shape.platform,
  url: z.string().url().nullable(),
  order: z.number().int().nonnegative().default(0),
});

/**
 * POST /system/api/auth/me/profile/social-links
 * Add a social link to the current user's profile
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const body = await request.json();
    const parsed = AddSocialLinkDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const profile = await UserProfileService.addSocialLink(user.userId, {
      id: uuid(),
      ...parsed.data,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
