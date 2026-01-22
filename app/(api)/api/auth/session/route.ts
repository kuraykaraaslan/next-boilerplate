// path: app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";

export async function GET(request: NextRequest) {
    try {
        await Limiter.checkRateLimit(request);

        console.log("[SESSION GET] Authenticating user from request");  
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });

        return NextResponse.json({ 
            user: request.user,
            message: AuthMessages.SESSION_RETRIEVED_SUCCESSFULLY
        }, { status: 200 });

    } catch (error: any) {
        console.error("[SESSION GET ERROR]", error);
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }

}