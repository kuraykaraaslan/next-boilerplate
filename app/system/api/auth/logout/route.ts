import Logger from '@/libs/logger';
// Original path: app/api/auth/logout/route.ts

 
import { NextResponse } from "next/server";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AuthMessages from "@/modules/auth/auth.messages";

export async function POST(request: NextRequest) {
    try {

        const { userSession } = await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"], otpVerifyBypass: true });

        const response = NextResponse.json({
            
            message: AuthMessages.LOGGED_OUT_SUCCESSFULLY,
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

        await UserSessionNextService.deleteSession(userSession);

        return response;

    }
    catch (error: any) {
        Logger.error(error);
        return NextResponse.json({ 
            
            message: error.message || AuthMessages.LOGOUT_FAILED 
        }, { status: 500 });
    }
}
