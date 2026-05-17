// path: app/tenant/[tenantId]/api/auth/saml/status/route.ts
import { NextResponse } from 'next/server';
import SamlService from '@/modules/auth_saml/auth_saml.service';

/**
 * GET /tenant/[tenantId]/api/auth/saml/status
 * Whether tenant-scope SAML is configured & enabled. Used by the Connected
 * Accounts panel to decide whether to surface the SAML connect button.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const enabled = await SamlService.isTenantEnabled(tenantId);
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
