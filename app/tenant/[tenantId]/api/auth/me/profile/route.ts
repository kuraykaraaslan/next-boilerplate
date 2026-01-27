// path: app/tenant/[tenantId]/api/auth/me/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@/modules/tenant_session/tenant_session.service.next";
import UserProfileService from "@/modules/user_profile/user_profile.service";
import Limiter from "@/libs/limiter";
import { UpdateProfileRequestSchema } from "@/modules/user_profile/user_profile.dto";
import AuthMessages from "@/modules/auth/auth.messages";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "USER",
      tenantId
    });

    const userProfile = await UserProfileService.getByUserId(user.userId);

    return NextResponse.json(
      { userProfile },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "USER",
      tenantId
    });

    const { userProfile } = await request.json();

    const parsedData = UpdateProfileRequestSchema.safeParse(userProfile);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          message: parsedData.error.issues.map((err: any) => err.message).join(", ")
        },
        { status: 400 }
      );
    }

    const updatedProfile = await UserProfileService.update(user.userId, parsedData.data);

    return NextResponse.json(
      {
        message: AuthMessages.PROFILE_UPDATED_SUCCESSFULLY,
        userProfile: updatedProfile
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
