import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import ApiKeyService from '@/modules/api_key/api_key.service';
import { RotateApiKeyDTO } from '@/modules/api_key/api_key.dto';

/**
 * POST /tenant/[tenantId]/api/api-keys/[apiKeyId]/rotate
 * Mint a successor key and grace-expire the current one (ADMIN+).
 * Returns the new rawKey only once — must be copied immediately.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; apiKeyId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, apiKeyId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    });

    const body = await request.json().catch(() => ({}));
    const parsed = RotateApiKeyDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { key, rawKey } = await ApiKeyService.rotate(tenantId, apiKeyId, user.userId, parsed.data);
    return NextResponse.json({ key, rawKey }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode ?? 500 });
  }
}
