import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";

export async function GET(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request);
        if (_rl) return _rl;
        await UserSessionNextService.authenticateUserByRequest({ request });

        const accessToken = request.cookies.get('accessToken')?.value;
        const refreshToken = request.cookies.get('refreshToken')?.value;

        return NextResponse.json({
            success: true,
            accessToken,
            refreshToken
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: error.message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
