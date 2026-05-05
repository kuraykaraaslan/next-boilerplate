import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next';
import ApiKeyService from '@/modules/api_key/api_key.service';
import { UpdateApiKeyDTO } from '@/modules/api_key/api_key.dto';

/**
 * PUT /tenant/[tenantId]/api/api-keys/[apiKeyId]
 * Update API key name, description, or active status (ADMIN+)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; apiKeyId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, apiKeyId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredScopes: ['tenant:admin'],
      tenantId,
    });

    const body = await request.json();
    const parsed = UpdateApiKeyDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const key = await ApiKeyService.update(tenantId, apiKeyId, parsed.data);
    return NextResponse.json({ key }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/api-keys/[apiKeyId]
 * Permanently revoke an API key (ADMIN+)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; apiKeyId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, apiKeyId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredScopes: ['tenant:admin'],
      tenantId,
    });

    await ApiKeyService.delete(tenantId, apiKeyId);
    return NextResponse.json({ message: 'API key revoked successfully.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
