import { NextResponse } from "next/server";
import Limiter from "@/libs/limiter";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AuthService from "@/modules/auth/auth.service";
import { VerifyEmailDTO } from "@/modules/auth/auth.dto";
import AuthMessages from "@/modules/auth/auth.messages";

export async function POST(request: NextRequest) {
    try {
        await Limiter.checkRateLimit(request);
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });

        const userId = request.user?.userId;

        if (!userId) {
            return NextResponse.json({ error: AuthMessages.USER_NOT_AUTHENTICATED }, { status: 401 });
        }

        const parsedData = VerifyEmailDTO.safeParse(await request.json());

        if (!parsedData.success) {
            return NextResponse.json({
                error: parsedData.error.issues.map(err => err.message).join(", ")
            }, { status: 400 });
        }

        await AuthService.verifyEmail({ userId, token: parsedData.data.token });

        return NextResponse.json({ message: AuthMessages.EMAIL_VERIFIED_SUCCESSFULLY }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
