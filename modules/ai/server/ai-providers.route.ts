import { NextRequest, NextResponse } from "next/server";
import AIService from "@kuraykaraaslan/ai/server/ai.service";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
/**
 * GET /tenant/[tenantId]/api/ai/providers
 * Root-tenant admins only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params
    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
    const all = await AIService.listProviders(tenantId);
    const configured = await AIService.listConfiguredProviders(tenantId);

    const providers = all.map((type) => ({
      provider: type,
      configured: configured.includes(type),
    }));

    return NextResponse.json({ providers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
