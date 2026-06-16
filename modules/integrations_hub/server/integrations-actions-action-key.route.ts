import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@nb/integrations_hub/server/integrations_hub.service';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from '@nb/integrations_hub/server/integrations_hub.messages';

type Params = { params: Promise<{ tenantId: string; actionKey: string }> };

/**
 * POST /tenant/[tenantId]/api/integrations/actions/[actionKey]
 * Inbound action endpoint for third parties. Authenticated by the integration's
 * API key via the `Authorization: Bearer <key>` header (no tenant session).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId, actionKey } = await params;

    const auth = request.headers.get('authorization') || '';
    const rawKey = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!rawKey) {
      return NextResponse.json({ success: false, message: 'Missing API key' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const body = await request.json().catch(() => ({}));

    const result = await IntegrationsHubService.handleInboundAction(
      tenantId, rawKey, actionKey, body as Record<string, unknown>, { ip },
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.ACTION_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
