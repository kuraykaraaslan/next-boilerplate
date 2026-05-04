import Logger from '@/libs/logger';
// Original path: app/api/auth/login/route.ts

 
import { NextRequest, NextResponse } from "next/server";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import Limiter from "@/libs/limiter";
import PasswordService from "@/modules/auth/auth.password.service";
import { ResetPasswordDTO } from "@/modules/auth/auth.dto";
import AuthMessages from "@/modules/auth/auth.messages";

export async function POST(request: NextRequest) {
    try {

        await Limiter.checkRateLimit(request);

        const { email , resetToken, password } = await request.json();

        const parsedData = ResetPasswordDTO.safeParse({ email, resetToken, newPassword: password });

        if (!parsedData.success) {
            return NextResponse.json({
                error: parsedData.error.issues.map(err => err.message).join(", ")
            }, { status: 400 });
        }

        await PasswordService.resetPassword(parsedData.data);

        const response = NextResponse.json({
            message: AuthMessages.PASSWORD_RESET_SUCCESSFUL,
        }, {
            status: 200,
        });

        // Determine if we're in a secure context (HTTPS)
        const origin = request.headers.get('origin') || '';
        const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
        const isSecure = origin.startsWith('https://') || protocol === 'https';
        
        response.cookies.set('accessToken', '', {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'none' as const : 'lax' as const,
            path: '/',
            maxAge: 0,
        });
        
        response.cookies.set('refreshToken', '', {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'none' as const : 'lax' as const,
            path: '/',
            maxAge: 0,
        });

        return response;

    }
    catch (error: any) {
        Logger.error(error);
        return NextResponse.json({ error: AuthMessages.PASSWORD_RESET_FAILED }, { status: 500 });
    }
}
