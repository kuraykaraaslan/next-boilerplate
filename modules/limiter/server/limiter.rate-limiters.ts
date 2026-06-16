import { NextRequest, NextResponse } from 'next/server';
import Limiter from './limiter.service.next';
import { checkTenantPlanRateLimit } from '@nb/limiter';

export async function apiRateLimiter(request: NextRequest): Promise<NextResponse | null> {
  return Limiter.checkRateLimit(request, 'api');
}

export async function authRateLimiter(request: NextRequest): Promise<NextResponse | null> {
  return Limiter.checkRateLimit(request, 'auth');
}

export async function tenantPlanRateLimiter(
  request: NextRequest,
  tenantId: string,
  limitPerMinute: number,
): Promise<NextResponse | null> {
  const { success, limit, remaining } = await checkTenantPlanRateLimit(tenantId, limitPerMinute);
  if (!success) {
    return NextResponse.json(
      { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests for your plan. Please upgrade or try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'Retry-After': '60',
          'X-RateLimit-Scope': 'tenant-plan',
        },
      },
    );
  }
  return null;
}
