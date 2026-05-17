import Logger from '@/modules/logger';
// Original path: app/api/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import AuthService from "@/modules/auth/auth.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { LoginDTO } from "@/modules/auth/auth.dto";
import MailService from "@/modules/notification_mail/notification_mail.service";
import { SafeUserSecuritySchema } from '@/modules/user_security/user_security.types';
import AuthMessages from "@/modules/auth/auth.messages";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function POST(request: NextRequest) {

    try {

        const body = await request.json();

        const _rl = await Limiter.useRateLimit(request, 'auth');

        if (_rl) return _rl;
        const parsedData = LoginDTO.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json({
                error: parsedData.error.issues
            }, { status: 400 });
        }

        const { email, password } = parsedData.data;

        const ipAddress = request.headers.get('x-forwarded-for')
            || request.headers.get('x-real-ip')
            || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        const { user, mustChangePassword } = await AuthService.login({ email, password, ipAddress, userAgent });

        if (!user) {
            throw new Error(AuthMessages.INVALID_CREDENTIALS);
        }

        const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);
        
        const { userSession, rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
            user,
            request,
            userSecurity,
            otpIgnore: false,
        });

        const response = NextResponse.json({
            user,
            userSecurity: SafeUserSecuritySchema.parse(userSecurity),
            mustChangePassword,
        }, {
            status: 200,
        });

        // Determine if we're in a secure context (HTTPS)
        // Check origin header first (most reliable for HTTPS detection with proxies)
        const origin = request.headers.get('origin') || '';
        const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
        const isSecure = origin.startsWith('https://') || protocol === 'https';

        // Set cookies - Use SameSite=None with Secure for HTTPS cross-origin
        const cookieOptions = isSecure ? {
            httpOnly: true,
            secure: true,
            sameSite: 'none' as const,
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        } : {
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        };

        response.cookies.set('accessToken', rawAccessToken, cookieOptions);
        response.cookies.set('refreshToken', rawRefreshToken, cookieOptions);


        try {
            await MailService.sendNewLoginEmail({ email: user.email });
        } catch (emailError) {
            // Ignored error for sending login email
        }

        return response;

    }
    catch (error: any) {
        Logger.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
