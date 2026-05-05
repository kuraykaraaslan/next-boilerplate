import { NextRequest, NextResponse } from 'next/server';
import Limiter from './limiter';

// Returns null when OK, NextResponse 429 when rate limited.
// Usage: const rl = await apiRateLimiter(request); if (rl) return rl;

export async function apiRateLimiter(request: NextRequest): Promise<NextResponse | null> {
  return Limiter.checkRateLimit(request, 'api');
}

export async function authRateLimiter(request: NextRequest): Promise<NextResponse | null> {
  return Limiter.checkRateLimit(request, 'auth');
}
