import { NextRequest, NextResponse } from 'next/server';
import { check, RATE_LIMIT_WINDOW, type LimiterScope } from '@/modules/limiter';

export default class Limiter {
  static getIpFromRequest(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    );
  }

  static async check(ip: string, scope: LimiterScope = 'api') {
    return check(ip, scope);
  }

  static async checkRateLimit(
    request: NextRequest,
    scope: LimiterScope = 'api',
  ): Promise<NextResponse | null> {
    const ip = this.getIpFromRequest(request);
    const { success, limit } = await check(ip, scope);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': RATE_LIMIT_WINDOW.toString(),
          },
        },
      );
    }

    return null;
  }

  static async useRateLimit(
    request: NextRequest,
    scope: LimiterScope = 'api',
  ): Promise<NextResponse | null> {
    return this.checkRateLimit(request, scope);
  }
}
