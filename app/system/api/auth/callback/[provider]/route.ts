import Limiter from '@/modules_next/limiter/limiter.service.next';
import { env } from '@/modules/env';
// Original path: app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
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
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const { provider } = await params;

    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get('code');
    const state = searchParams.get('state') ?? undefined;

    if (!code) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.CODE_NOT_FOUND}`);
    }

    //check if provider is valid
    if (!Object.values(SSOProviderEnum).includes(provider as SSOProvider)) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.INVALID_PROVIDER}`);
    }

    // Link-from-Connected-Accounts flow: state is a signed JWT carrying { userId, email }.
    // We never start a session here — just attach the social account to the existing user
    // (only if the SSO email matches) and bounce back to the profile page.
    const linkState = SSOService.parseLinkState(state);
    if (linkState) {
        const returnTo = SSOService.safeReturnPath(linkState.r);
        try {
            await SSOService.linkToUser(
                linkState.uid,
                linkState.em,
                provider as SSOProvider,
                code as string,
                state,
            );
            return NextResponse.redirect(`${env.APPLICATION_HOST}${returnTo}?linked=${provider}`);
        } catch (err: any) {
            const message = err?.message ?? SSOMessages.OAUTH_ERROR;
            return NextResponse.redirect(
                `${env.APPLICATION_HOST}${returnTo}?linkError=${encodeURIComponent(message)}`,
            );
        }
    }

    const { user, isNewUser } = await SSOService.authenticateOrRegister(provider as SSOProvider, code as string, state);

    if (!user) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);

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
            ipAddress: userSession.ipAddress ?? 'Unknown',
            location: location,
            loginTime: new Date().toLocaleString()
        });
    }

    if (!userSession) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);
    }

    const response = NextResponse.redirect(
        `${env.APPLICATION_HOST}/auth/callback?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`
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

    const { code, state } = await request.json();

    if (!code) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.CODE_NOT_FOUND}`);
    }

    //check if provider is valid
    if (!Object.values(SSOProviderEnum).includes(provider as SSOProvider)) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.INVALID_PROVIDER}`);
    }

    const { user, isNewUser } = await SSOService.authenticateOrRegister(provider as SSOProvider, code as string, state);

    if (!user) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);
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
            ipAddress: userSession.ipAddress ?? 'Unknown',
            location: location,
            loginTime: new Date().toLocaleString()
        });
    }

    if (!userSession) {
        //redirect to frontend
        return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/login?error=${SSOMessages.OAUTH_ERROR}`);
    }

    //redirect to frontend
    return NextResponse.redirect(`${env.APPLICATION_HOST}/auth/callback?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`);

}


