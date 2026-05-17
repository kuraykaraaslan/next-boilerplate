// path: app/system/api/auth/saml/status/route.ts
import { NextResponse } from 'next/server';
import SamlService from '@/modules/auth_saml/auth_saml.service';

/**
 * GET /system/api/auth/saml/status
 * Whether system-scope SAML is configured & enabled. Used by the Connected
 * Accounts panel to decide whether to surface the SAML connect button.
 */
export async function GET() {
  try {
    const enabled = await SamlService.isSystemEnabled();
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
