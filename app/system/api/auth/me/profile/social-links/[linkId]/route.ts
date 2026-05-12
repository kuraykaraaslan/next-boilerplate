// path: app/system/api/auth/me/profile/social-links/[linkId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import UserProfileService from "@/modules/user_profile/user_profile.service";
import { SocialLinkItemSchema } from "@/modules/user_profile/user_profile.types";
import Limiter from "@/libs/limiter";
import { z } from "zod";

const UpdateSocialLinkDTO = z.object({
  platform: SocialLinkItemSchema.shape.platform.optional(),
  url: z.string().url().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
});

/**
 * PUT /system/api/auth/me/profile/social-links/[linkId]
 * Update a social link
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const { linkId } = await params;
    const body = await request.json();
    const parsed = UpdateSocialLinkDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const profile = await UserProfileService.updateSocialLink(user.userId, linkId, parsed.data);
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /system/api/auth/me/profile/social-links/[linkId]
 * Remove a social link
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const { linkId } = await params;
    const profile = await UserProfileService.removeSocialLink(user.userId, linkId);
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
