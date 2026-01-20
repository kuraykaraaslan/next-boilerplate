// Original path: app/api/auth/callback/route.ts

import { NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import SSOService from "@/modules/auth_sso/auth_sso.service";
import MailService from "@/modules/notification_mail/notification_mail.service";
import SSOMessages from "@/modules/auth_sso/auth_sso.messages";
import { SSOProvider, SSOProviderEnum } from "@/modules/auth_sso/auth_sso.enums";
import UserSecurityService from "@/modules/user_security/user_security.service";
import UserAgentService from "@/modules/user_agent/user_agent.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params;

    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get('code');
    //const state = searchParams.get('state');

    if (!code) {
        //redirect to frontend
        NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.CODE_NOT_FOUND}`);
    }

    //check if provider is valid
    if (!Object.values(SSOProviderEnum).includes(provider as SSOProvider)) {
        //redirect to frontend
        return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.INVALID_PROVIDER}`);
    }

    const { user, isNewUser } = await SSOService.authenticateOrRegister(provider as SSOProvider, code as string);

    if (!user) {
        //redirect to frontend
        return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);

    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    const { userSession, rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({ user, request, userSecurity });

    if (isNewUser) {
        await MailService.sendWelcomeEmail(user);
    } else {
        const { deviceInfo, location } = await UserAgentService.getDeviceAndLocation(
            request.headers.get('user-agent'),
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || userSession.ipAddress || ''
        );
        
        await MailService.sendNewLoginEmail({
            email: user.email,
            name: user.email,
            device: deviceInfo.deviceName || 'Unknown',
            ipAddress: userSession.ipAddress,
            location: location,
            loginTime: new Date().toLocaleString()
        });
    }

    if (!userSession) {
        //redirect to frontend
        return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);
    }

    const response = NextResponse.redirect(
        `${process.env.APPLICATION_HOST}/auth/callback?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`
    )

    // Determine if we're in a secure context (HTTPS)
    const origin = request.headers.get('origin') || '';
    const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
    const isSecure = origin.startsWith('https://') || protocol === 'https';
    
    const cookieOptions = isSecure ? {
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    } : {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    };
    
    response.cookies.set('accessToken', rawAccessToken, cookieOptions);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOptions);

    return response;

}


export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params;

    const { code } = await request.json();

    if (!code) {
        //redirect to frontend
        NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.CODE_NOT_FOUND}`);
    }

    //check if provider is valid
    if (!Object.values(SSOProviderEnum).includes(provider as SSOProvider)) {
        //redirect to frontend
        return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.INVALID_PROVIDER}`);
    }

    const { user, isNewUser} = await SSOService.authenticateOrRegister(provider as SSOProvider, code as string);

    if (!user) {
        //redirect to frontend
        return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);
    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    const { userSession, rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({ user, request, userSecurity });

    if (isNewUser) {
        await MailService.sendWelcomeEmail(user);
    } else {
        const { deviceInfo, location } = await UserAgentService.getDeviceAndLocation(
            request.headers.get('user-agent'),
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || userSession.ipAddress || ''
        );
        
        await MailService.sendNewLoginEmail({
            email: user.email,
            name: user.email,
            device: deviceInfo.deviceName || 'Unknown',
            ipAddress: userSession.ipAddress,
            location: location,
            loginTime: new Date().toLocaleString()
        });
    }

    if (!userSession) {
        //redirect to frontend
        return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);
    }

    //redirect to frontend
    return NextResponse.redirect(`${process.env.APPLICATION_HOST}/auth/callback?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`);

}


