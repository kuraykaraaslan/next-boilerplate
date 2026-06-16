import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@nb/integrations_hub/server/integrations_hub.service';
import { OAuthCallbackQuerySchema } from '@nb/integrations_hub/server/integrations_hub.dto';

/**
 * GET /tenant/[tenantId]/api/integrations/oauth/callback
 * OAuth redirect target. No tenant session — the signed `state` carries the
 * security context and is validated against the tenant in the path. On success
 * the user is redirected back to the connected-apps admin page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const adminUrl = new URL(`/tenant/${tenantId}/admin/integrations/connected`, request.url);

  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { searchParams } = new URL(request.url);
    const parsed = OAuthCallbackQuerySchema.safeParse({
      code: searchParams.get('code'),
      state: searchParams.get('state'),
    });
    if (!parsed.success) {
      adminUrl.searchParams.set('error', 'invalid_callback');
      return NextResponse.redirect(adminUrl);
    }

    await IntegrationsHubService.completeOAuthConnect(tenantId, parsed.data);
    adminUrl.searchParams.set('connected', '1');
    return NextResponse.redirect(adminUrl);
  } catch (error: any) {
    adminUrl.searchParams.set('error', encodeURIComponent(error?.message || 'oauth_failed'));
    return NextResponse.redirect(adminUrl);
  }
}
