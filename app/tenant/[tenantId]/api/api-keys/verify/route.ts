import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import ApiKeyService from '@/modules/api_key/api_key.service';
import type { ApiKeyScope } from '@/modules/api_key/api_key.enums';

/**
 * POST /tenant/[tenantId]/api/api-keys/verify
 * Verify an API key from the x-api-key header.
 * Used by external integrations to validate keys before processing requests.
 * This endpoint itself is public (no session auth) — the key IS the auth.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params;
    const rawKey = request.headers.get('x-api-key');

    if (!rawKey) {
      return NextResponse.json({ message: 'Missing x-api-key header.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requiredScope = body?.scope as ApiKeyScope | undefined;

    const key = await ApiKeyService.verify(rawKey, requiredScope);

    if (key.tenantId !== tenantId) {
      return NextResponse.json({ message: 'Invalid or expired API key.' }, { status: 401 });
    }

    return NextResponse.json({ valid: true, key }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ valid: false, message: error.message }, { status: 401 });
  }
}
