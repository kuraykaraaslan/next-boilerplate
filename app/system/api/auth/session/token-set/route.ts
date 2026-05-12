import { env } from '@/modules/env';
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { accessToken, refreshToken } = await request.json();
        
        const response = NextResponse.json({ success: true });

        const origin = request.headers.get('origin') || '';
        const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-scheme') || 'http';
        const isDev = env.NODE_ENV === 'development';
        const isSecure = (origin.startsWith('https://') || protocol === 'https') && !isDev;

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

        if (accessToken) response.cookies.set('accessToken', accessToken, cookieOptions);
        if (refreshToken) response.cookies.set('refreshToken', refreshToken, cookieOptions);

        return response;
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
