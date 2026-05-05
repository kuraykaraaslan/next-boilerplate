import { NextRequest, NextResponse } from 'next/server';
import redisInstance from '../redis';

const WINDOW = 60; // seconds

const LIMITS = {
  auth: 5,  // strict: login, register, OTP, TOTP, forgot-password
  api: 30,  // general API endpoints
} as const;

type LimiterScope = keyof typeof LIMITS;

export default class Limiter {
  static getIpFromRequest(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    );
  }

  static async check(ip: string, scope: LimiterScope = 'api'): Promise<{ success: boolean; remaining: number; limit: number }> {
    const limit = LIMITS[scope];
    const key = `rate_limit:${scope}:${ip}`;
    const current = await redisInstance.get(key);
    const currentCount = current ? parseInt(current, 10) : 0;
    const newCount = currentCount + 1;
    await redisInstance.set(key, newCount.toString(), 'EX', WINDOW);
    return {
      success: newCount <= limit,
      remaining: Math.max(limit - newCount, 0),
      limit,
    };
  }

  // Returns null when OK, NextResponse 429 when rate limited.
  // Usage: const rl = await Limiter.checkRateLimit(request); if (rl) return rl;
  static async checkRateLimit(request: NextRequest, scope: LimiterScope = 'api'): Promise<NextResponse | null> {
    const ip = this.getIpFromRequest(request);
    const { success, limit } = await this.check(ip, scope);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': WINDOW.toString(),
          },
        },
      );
    }

    return null;
  }

  static async useRateLimit(request: NextRequest, scope: LimiterScope = 'api'): Promise<NextResponse | null> {
    return this.checkRateLimit(request, scope);
  }
}
