import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import ApiKeyService from '@/modules/api_key/api_key.service';
import { CreateApiKeyDTO, ListApiKeysDTO } from '@/modules/api_key/api_key.dto';

/**
 * GET /tenant/[tenantId]/api/api-keys
 * List API keys for a tenant (ADMIN+)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const { searchParams } = new URL(request.url);
    const parsed = ListApiKeysDTO.safeParse({
      tenantId,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { keys, total } = await ApiKeyService.list(parsed.data);
    return NextResponse.json({ keys, total }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /tenant/[tenantId]/api/api-keys
 * Create a new API key (ADMIN+)
 * Returns rawKey only once — must be copied immediately.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const body = await request.json();
    const parsed = CreateApiKeyDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { key, rawKey } = await ApiKeyService.create(tenantId, user.userId, parsed.data);

    return NextResponse.json({ key, rawKey }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
