import Logger from '@/libs/logger';
// path: app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";

export async function GET(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request);
        if (_rl) return _rl;
        await UserSessionNextService.authenticateUserByRequest({ request });

        return NextResponse.json({ 
            user: request.user,
            message: AuthMessages.SESSION_RETRIEVED_SUCCESSFULLY
        }, { status: 200 });

    } catch (error: any) {
        Logger.error("[SESSION GET ERROR]", error);
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }

}