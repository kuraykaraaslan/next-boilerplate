// path: app/system/api/saml-system/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import { UpsertSamlConfigDTO } from '@/modules/auth_saml/auth_saml.dto';

/**
 * System-scope SAML configuration. Reads, writes, and metadata for the single
 * row in `system_saml_configs`. Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request: req, requiredUserRole: 'ADMIN' });
    const config = await SamlService.getSystemConfig();
    return NextResponse.json({ success: true, config });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request: req, requiredUserRole: 'ADMIN' });
    const body = await req.json();
    const input = UpsertSamlConfigDTO.parse(body);
    const config = await SamlService.upsertSystemConfig(input);
    return NextResponse.json({ success: true, config });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: e.status ?? 400 });
  }
}
