// Original path: app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import AuthService from "@/modules/auth/auth.service";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";
import { LoginDTO } from "@/modules/auth/auth.dto";
import MailService from "@/modules/notification_mail/notification_mail.service";
import { SafeUserSecuritySchema } from '@/modules/user_security/user_security.types';
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function POST(request: NextRequest) {
    try {

        await Limiter.useRateLimit(request);


        const parsedData = LoginDTO.safeParse(await request.json());

        if (!parsedData.success) {
            return NextResponse.json({
                error: parsedData.error.issues.map((err: any) => err.message).join(", ")
            }, { status: 400 });
        }

        const { email, password } = parsedData.data;

        const { user } = await AuthService.login({ email, password });

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
        }, {
            status: 200,
        });

        // Determine if we're in a secure context (HTTPS)
        // Check origin header first (most reliable for HTTPS detection with proxies)
        const origin = request.headers.get('origin') || '';
        const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
        const isSecure = origin.startsWith('https://') || protocol === 'https';

        console.log('[LOGIN] Setting cookies - isSecure:', isSecure, 'protocol:', protocol, 'origin:', origin);
        console.log('[LOGIN] Request headers:', {
            host: request.headers.get('host'),
            origin: request.headers.get('origin'),
            'x-forwarded-host': request.headers.get('x-forwarded-host'),
            'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        });

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

        console.log('[LOGIN] Cookies set successfully with options:', cookieOptions);


        try {
            await MailService.sendNewLoginEmail({ email: user.email });
        } catch (emailError) {
            console.error('Error sending new login email:', emailError);
        }

        return response;

    }
    catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
