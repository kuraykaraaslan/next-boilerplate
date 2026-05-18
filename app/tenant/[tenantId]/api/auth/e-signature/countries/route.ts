import { NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import ESignatureService from '@/modules/e_signature/e_signature.service';
import TenantService from '@/modules/tenant/tenant.service';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const { tenantId } = await ctx.params;
    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: { message: 'Tenant not found or inactive' } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: ESignatureService.listCountryHints() });
  } catch (err) {
    Logger.warn(`tenant e-signature countries failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ success: false, error: { message: 'Failed to load country hints' } }, { status: 500 });
  }
}
