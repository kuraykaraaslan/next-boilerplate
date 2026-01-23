// path: app/api/auth/me/preferences/route.ts
import { NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserPreferencesService from "@/modules/user_preferences/user_preferences.service";
import Limiter from "@/libs/limiter";
import { UpdatePreferencesRequestSchema } from "@/modules/user_preferences/user_preferences.dto";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";

// NextRequest is declared globally in global.d.ts

export async function PUT(request: NextRequest) {
    try {

        await Limiter.checkRateLimit(request);
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });

        const userId = request.user?.userId;
        if (!userId) {
            return NextResponse.json(
                { message: AuthMessages.USER_NOT_AUTHENTICATED },
                { status: 401 }
            );
        }

        const body = await request.json();
        
        const parsedData = UpdatePreferencesRequestSchema.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json(
                { 
                    message: parsedData.error.issues.map((err: any) => err.message).join(", ")
                },
                { status: 400 }
            );
        }

        // Update user preferences
        const updatedPreferences = await UserPreferencesService.update(userId, parsedData.data);
        return NextResponse.json(
            { 
                message: AuthMessages.PREFERENCES_UPDATED_SUCCESSFULLY,
                userPreferences: updatedPreferences
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
        await Limiter.checkRateLimit(request);
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });
        
        const userId = request.user?.userId;
        const userPreferences = await UserPreferencesService.getByUserId(userId);
        
        return NextResponse.json(
            { userPreferences: userPreferences},
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "An error occurred" },
            { status: 500 }
        );
    }
}
