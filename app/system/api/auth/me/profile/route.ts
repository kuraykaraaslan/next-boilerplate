// path: app/api/auth/me/preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserProfileService from "@/modules/user_profile/user_profile.service";
import Limiter from "@/libs/limiter";
import { UpdateProfileRequestSchema } from "@/modules/user_profile/user_profile.dto";
import AuthMessages from "@/modules/auth/auth.messages";

// NextRequest is declared globally in global.d.ts

export async function PUT(request: NextRequest) {
    try {

        const _rl = await Limiter.checkRateLimit(request);

        if (_rl) return _rl;
        await UserSessionNextService.authenticateUserByRequest({ request });

        const userId = request.user?.userId;
        
        if (!userId) {
            return NextResponse.json(
                { message: AuthMessages.USER_NOT_AUTHENTICATED },
                { status: 401 }
            );
        }

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

        // Update user profile
        const updatedProfile = await UserProfileService.update(userId, parsedData.data);

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

export async function GET(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request);
        if (_rl) return _rl;
        await UserSessionNextService.authenticateUserByRequest({ request });

        const userId = request.user?.userId;
        if (!userId) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const userProfile = await UserProfileService.getByUserId(userId);
        
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
