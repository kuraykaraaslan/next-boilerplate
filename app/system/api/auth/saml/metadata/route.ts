// path: app/system/api/auth/saml/metadata/route.ts
import { NextResponse } from 'next/server';
import SamlService from '@/modules/auth_saml/auth_saml.service';

/**
 * GET /system/api/auth/saml/metadata
 * SP metadata XML the system admin gives to the IdP during configuration.
 */
export async function GET() {
  try {
    const { xml } = await SamlService.generateSystemMetadata();
    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
