import Logger from '@/libs/logger';
import { env } from '@/libs/env';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 60 * 60; // 1 hour

async function generateCSRFToken(): Promise<string> {
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const data = `${timestamp}-${randomHex}`;
  
  const secret = env.CSRF_SECRET || env.ACCESS_TOKEN_SECRET || 'default-secret';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${data}.${signatureHex}`;
}

export async function GET() {
  try {
    const token = await generateCSRFToken();
    const isProduction = env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        headerName: CSRF_HEADER_NAME,
        expiresIn: CSRF_TOKEN_EXPIRY,
      },
    });

    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: CSRF_TOKEN_EXPIRY,
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate CSRF token';
    Logger.error('[CSRF] Token generation error:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CSRF_ERROR',
          message: 'Failed to generate CSRF token',
        },
      },
      { status: 500 }
    );
  }
}
