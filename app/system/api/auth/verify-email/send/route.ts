import { NextRequest, NextResponse } from "next/server";
import Limiter from "@/libs/limiter";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AuthService from "@/modules/auth/auth.service";
import AuthMessages from "@/modules/auth/auth.messages";

export async function POST(request: NextRequest) {
    try {
        const _rl = await Limiter.checkRateLimit(request);
        if (_rl) return _rl;
        await UserSessionNextService.authenticateUserByRequest({ request });

        const userId = request.user?.userId;
        const email = request.user?.email;

        if (!userId || !email) {
            return NextResponse.json({ error: AuthMessages.USER_NOT_AUTHENTICATED }, { status: 401 });
        }

        await AuthService.sendEmailVerification({ userId, email });

        return NextResponse.json({ message: AuthMessages.EMAIL_VERIFICATION_SENT }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
